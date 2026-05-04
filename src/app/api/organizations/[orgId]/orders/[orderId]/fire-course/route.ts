import { NextRequest, NextResponse } from "next/server";
import { OrderItemStatus, OrderStatus, Role } from "@prisma/client";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  courseNumber: z.number().int().min(1).max(9).optional(),
});

const ALLOWED_ROLES: Role[] = [
  Role.OWNER,
  Role.MANAGER,
  Role.WAITER,
  Role.KITCHEN,
  Role.CASHIER,
];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string; orderId: string }> }
) {
  try {
    const { orgId, orderId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const [membership, isOwner] = await Promise.all([
      prisma.membership.findFirst({
        where: {
          userId: session.user.id,
          orgId,
          role: { in: ALLOWED_ROLES },
        },
      }),
      prisma.organization.findFirst({
        where: { id: orgId, ownerId: session.user.id },
        select: { id: true },
      }),
    ]);

    if (!membership && !isOwner) {
      return NextResponse.json(
        { error: "No tienes permisos para disparar cursos" },
        { status: 403 }
      );
    }

    const payload = await request.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const order = await prisma.order.findFirst({
      where: { id: orderId, orgId },
      include: {
        items: {
          select: { id: true, courseNumber: true, firedAt: true, status: true },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Pedido no encontrado" },
        { status: 404 }
      );
    }

    // Si no se pasó curso, buscamos el próximo con items no disparados
    let targetCourse = parsed.data.courseNumber;
    if (!targetCourse) {
      const pending = order.items
        .filter(
          (item) =>
            item.firedAt === null &&
            item.status !== OrderItemStatus.CANCELLED
        )
        .map((item) => item.courseNumber)
        .sort((a, b) => a - b);
      targetCourse = pending[0];
    }

    if (!targetCourse) {
      return NextResponse.json(
        { error: "No quedan cursos pendientes por disparar" },
        { status: 400 }
      );
    }

    const toFire = order.items.filter(
      (item) =>
        item.courseNumber === targetCourse &&
        item.firedAt === null &&
        item.status !== OrderItemStatus.CANCELLED
    );

    if (toFire.length === 0) {
      return NextResponse.json(
        { error: `El curso ${targetCourse} ya fue disparado o no tiene items` },
        { status: 400 }
      );
    }

    const now = new Date();
    await prisma.$transaction(async (tx) => {
      await tx.orderItem.updateMany({
        where: { id: { in: toFire.map((item) => item.id) } },
        data: {
          firedAt: now,
          status: OrderItemStatus.IN_PROGRESS,
        },
      });

      // Al disparar un curso, mover la orden a PREPARING si seguía PLACED/ACCEPTED
      await tx.order.updateMany({
        where: {
          id: order.id,
          status: { in: [OrderStatus.ACCEPTED, OrderStatus.PLACED] },
        },
        data: { status: OrderStatus.PREPARING },
      });
    });

    return NextResponse.json({
      ok: true,
      courseNumber: targetCourse,
      firedCount: toFire.length,
      firedAt: now,
    });
  } catch (error) {
    console.error("Error firing course:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
