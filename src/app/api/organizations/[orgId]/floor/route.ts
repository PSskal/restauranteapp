import { NextRequest, NextResponse } from "next/server";
import { OrderStatus } from "@prisma/client";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { computeOrderTotals } from "@/lib/order-totals";
import { log } from "@/lib/logger";

const ACTIVE_STATUSES = [
  OrderStatus.PLACED,
  OrderStatus.ACCEPTED,
  OrderStatus.PREPARING,
  OrderStatus.READY,
  OrderStatus.SERVED,
];

/**
 * Estado en vivo de la sala. Devuelve zonas, mesas y la orden activa
 * (si tiene). Una mesa puede estar:
 *  - libre (sin orden activa)
 *  - en preparación (orden ACCEPTED/PREPARING)
 *  - lista para servir (READY)
 *  - servida con saldo pendiente (SERVED y remainingC > 0)
 *  - servida y cobrada (SERVED y remainingC == 0) — se considera libre
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const [membership, isOwner] = await Promise.all([
      prisma.membership.findFirst({
        where: { userId: session.user.id, orgId },
        select: { id: true },
      }),
      prisma.organization.findFirst({
        where: { id: orgId, ownerId: session.user.id },
        select: { id: true },
      }),
    ]);

    if (!membership && !isOwner) {
      return NextResponse.json(
        { error: "No tienes acceso a esta organización" },
        { status: 403 }
      );
    }

    const [zones, tables, activeOrders] = await Promise.all([
      prisma.zone.findMany({
        where: { orgId },
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        select: { id: true, name: true, color: true, position: true },
      }),
      prisma.table.findMany({
        where: { orgId },
        orderBy: { number: "asc" },
        include: {
          zone: { select: { id: true, name: true, color: true } },
        },
      }),
      prisma.order.findMany({
        where: {
          orgId,
          tableId: { not: null },
          status: { in: ACTIVE_STATUSES },
        },
        orderBy: { createdAt: "desc" },
        include: {
          items: {
            select: {
              id: true,
              name: true,
              quantity: true,
              priceC: true,
              modifiersPriceC: true,
              totalC: true,
              notes: true,
              status: true,
              modifiers: {
                select: {
                  id: true,
                  groupName: true,
                  name: true,
                  priceDeltaC: true,
                },
              },
            },
          },
          payments: {
            select: { amountC: true, tipC: true, status: true },
          },
          discounts: { select: { amountC: true } },
        },
      }),
    ]);

    // Sólo nos interesa la orden activa "más reciente" por mesa, pero
    // filtramos las que ya están totalmente pagadas (mesa libre).
    const orderByTable = new Map<
      string,
      (typeof activeOrders)[number] & {
        totals: ReturnType<typeof computeOrderTotals>;
      }
    >();

    for (const order of activeOrders) {
      if (!order.tableId) continue;
      const totals = computeOrderTotals({
        totalC: order.totalC,
        discounts: order.discounts,
        payments: order.payments,
      });
      // Mesa "libre" si la orden ya está SERVED y pagada
      if (order.status === OrderStatus.SERVED && totals.isPaid) continue;
      // Si ya hay una orden registrada para esta mesa, conservamos la más
      // reciente (el findMany viene ordenado desc por createdAt).
      if (orderByTable.has(order.tableId)) continue;
      orderByTable.set(order.tableId, { ...order, totals });
    }

    const tableSummaries = tables.map((table) => {
      const order = orderByTable.get(table.id) ?? null;
      let state:
        | "FREE"
        | "ORDERING"
        | "PREPARING"
        | "READY"
        | "TO_PAY"
        | "DISABLED" = "FREE";

      if (!table.isEnabled) {
        state = "DISABLED";
      } else if (!order) {
        state = "FREE";
      } else if (order.status === OrderStatus.SERVED) {
        state = "TO_PAY";
      } else if (order.status === OrderStatus.READY) {
        state = "READY";
      } else if (order.status === OrderStatus.PREPARING) {
        state = "PREPARING";
      } else {
        state = "ORDERING";
      }

      return {
        id: table.id,
        number: table.number,
        zoneId: table.zoneId,
        zone: table.zone,
        positionX: table.positionX,
        positionY: table.positionY,
        width: table.width,
        height: table.height,
        shape: table.shape,
        rotation: table.rotation,
        isEnabled: table.isEnabled,
        state,
        order: order
          ? {
              id: order.id,
              number: order.number,
              status: order.status,
              createdAt: order.createdAt,
              updatedAt: order.updatedAt,
              notes: order.notes,
              totalC: order.totalC,
              discountsC: order.totals.discountsC,
              netDueC: order.totals.netDueC,
              paidC: order.totals.paidC,
              tipsC: order.totals.tipsC,
              remainingC: order.totals.remainingC,
              isPaid: order.totals.isPaid,
              items: order.items.map((item) => ({
                id: item.id,
                name: item.name,
                quantity: item.quantity,
                priceC: item.priceC,
                modifiersPriceC: item.modifiersPriceC,
                totalC: item.totalC,
                notes: item.notes,
                status: item.status,
                modifiers: item.modifiers.map((modifier) => ({
                  id: modifier.id,
                  groupName: modifier.groupName,
                  name: modifier.name,
                  priceDeltaC: modifier.priceDeltaC,
                })),
              })),
            }
          : null,
      };
    });

    return NextResponse.json({
      zones,
      tables: tableSummaries,
    });
  } catch (error) {
    log.error("floor.get.exception", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
