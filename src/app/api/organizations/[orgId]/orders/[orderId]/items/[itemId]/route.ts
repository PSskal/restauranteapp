import { NextRequest, NextResponse } from "next/server";
import { OrderItemStatus, OrderStatus, Role } from "@prisma/client";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  status: z.nativeEnum(OrderItemStatus),
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
  {
    params,
  }: {
    params: Promise<{ orgId: string; orderId: string; itemId: string }>;
  }
) {
  try {
    const { orgId, orderId, itemId } = await params;
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
        { error: "No tienes permisos para actualizar pedidos" },
        { status: 403 }
      );
    }

    let jsonBody: unknown;
    try {
      jsonBody = await request.json();
    } catch {
      return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
    }

    const parsed = updateSchema.safeParse(jsonBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { status } = parsed.data;

    const orderItem = await prisma.orderItem.findFirst({
      where: {
        id: itemId,
        orderId,
        order: { orgId },
      },
      select: {
        id: true,
        status: true,
        order: { select: { id: true, status: true } },
      },
    });

    if (!orderItem) {
      return NextResponse.json(
        { error: "Ítem no encontrado" },
        { status: 404 }
      );
    }

    const now = new Date();
    const patch = {
      status,
      readyAt: status === OrderItemStatus.READY ? now : undefined,
      servedAt: status === OrderItemStatus.SERVED ? now : undefined,
    };

    const { updatedItem, updatedOrder } = await prisma.$transaction(
      async (tx) => {
        const updatedItem = await tx.orderItem.update({
          where: { id: itemId },
          data: patch,
          select: {
            id: true,
            status: true,
            readyAt: true,
            servedAt: true,
          },
        });

        const siblings = await tx.orderItem.findMany({
          where: { orderId },
          select: { status: true },
        });

        let nextOrderStatus: OrderStatus | null = null;
        const nonCancelled = siblings.filter(
          (sibling) => sibling.status !== OrderItemStatus.CANCELLED
        );

        if (nonCancelled.length > 0) {
          const allServed = nonCancelled.every(
            (sibling) => sibling.status === OrderItemStatus.SERVED
          );
          const allReadyOrServed = nonCancelled.every(
            (sibling) =>
              sibling.status === OrderItemStatus.READY ||
              sibling.status === OrderItemStatus.SERVED
          );
          const anyInProgress = nonCancelled.some(
            (sibling) => sibling.status === OrderItemStatus.IN_PROGRESS
          );

          if (allServed) {
            nextOrderStatus = OrderStatus.SERVED;
          } else if (allReadyOrServed) {
            nextOrderStatus = OrderStatus.READY;
          } else if (anyInProgress) {
            nextOrderStatus = OrderStatus.PREPARING;
          }
        }

        let updatedOrder = orderItem.order;
        if (
          nextOrderStatus &&
          nextOrderStatus !== orderItem.order.status &&
          (
            [
              OrderStatus.ACCEPTED,
              OrderStatus.PREPARING,
              OrderStatus.READY,
            ] as OrderStatus[]
          ).includes(orderItem.order.status)
        ) {
          const updated = await tx.order.update({
            where: { id: orderId },
            data: { status: nextOrderStatus },
            select: { id: true, status: true },
          });
          updatedOrder = updated;
        }

        return { updatedItem, updatedOrder };
      }
    );

    return NextResponse.json({
      item: updatedItem,
      order: {
        id: updatedOrder.id,
        status: updatedOrder.status,
      },
    });
  } catch (error) {
    console.error("Error updating order item:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
