import { NextRequest, NextResponse } from "next/server";
import { OrderStatus, Role } from "@prisma/client";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  status: z.nativeEnum(OrderStatus),
});

const ALLOWED_ROLES: Role[] = [
  Role.OWNER,
  Role.MANAGER,
  Role.WAITER,
  Role.KITCHEN,
  Role.CASHIER,
];

export async function PATCH(
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
          role: {
            in: ALLOWED_ROLES,
          },
        },
      }),
      prisma.organization.findFirst({
        where: {
          id: orgId,
          ownerId: session.user.id,
        },
      }),
    ]);

    if (!membership && !isOwner) {
      return NextResponse.json(
        { error: "No tienes permisos para actualizar pedidos" },
        { status: 403 }
      );
    }

    let jsonBody: unknown;

    try {
      jsonBody = await request.json();
    } catch {
      return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
    }

    const parsed = updateSchema.safeParse(jsonBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos invalidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { status } = parsed.data;

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        orgId,
      },
      include: {
        table: {
          select: {
            id: true,
            number: true,
          },
        },
        items: {
          select: {
            id: true,
            name: true,
            quantity: true,
            priceC: true,
            totalC: true,
            notes: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Pedido no encontrado" },
        { status: 404 }
      );
    }

    const updatedOrder = await prisma.order.update({
      where: {
        id: order.id,
      },
      data: {
        status,
      },
      include: {
        table: {
          select: {
            id: true,
            number: true,
          },
        },
        items: {
          select: {
            id: true,
            name: true,
            quantity: true,
            priceC: true,
            totalC: true,
            notes: true,
          },
        },
      },
    });

    return NextResponse.json({
      order: {
        id: updatedOrder.id,
        number: updatedOrder.number,
        status: updatedOrder.status,
        totalC: updatedOrder.totalC,
        createdAt: updatedOrder.createdAt,
        updatedAt: updatedOrder.updatedAt,
        notes: updatedOrder.notes,
        table: updatedOrder.table
          ? {
              id: updatedOrder.table.id,
              number: updatedOrder.table.number,
            }
          : null,
        items: updatedOrder.items.map((item) => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          priceC: item.priceC,
          totalC: item.totalC,
          notes: item.notes,
        })),
      },
    });
  } catch (error: unknown) {
    const maybe = error as { code?: string } | undefined;
    if (maybe?.code === "P1001") {
      console.error("DB unreachable (P1001) updating order", error);
      return NextResponse.json(
        { error: "Servicio no disponible temporalmente" },
        { status: 503 }
      );
    }
    console.error("Error updating order:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
