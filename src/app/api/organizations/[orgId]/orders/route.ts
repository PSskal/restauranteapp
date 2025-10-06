import { NextRequest, NextResponse } from "next/server";
import { OrderStatus } from "@prisma/client";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const ACTIVE_STATUSES: OrderStatus[] = [
  OrderStatus.PLACED,
  OrderStatus.ACCEPTED,
  OrderStatus.PREPARING,
  OrderStatus.READY,
];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const membership = await prisma.membership.findFirst({
      where: {
        userId: session.user.id,
        orgId,
      },
    });

    const isOwner = await prisma.organization.findFirst({
      where: {
        id: orgId,
        ownerId: session.user.id,
      },
    });

    if (!membership && !isOwner) {
      return NextResponse.json(
        { error: "No tienes acceso a esta organizacion" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get("limit");
    const limit = Math.min(
      Math.max(parseInt(limitParam ?? "25", 10) || 25, 1),
      100
    );

    const statusFilters = searchParams
      .getAll("status")
      .map((status) => status.toUpperCase())
      .filter((status): status is OrderStatus =>
        Object.values(OrderStatus).includes(status as OrderStatus)
      );

    const whereClause = {
      orgId,
      ...(statusFilters.length > 0
        ? {
            status: {
              in: statusFilters,
            },
          }
        : {}),
    };

    const [orders, statusCounts, servedAggregate, totalOrders] =
      await Promise.all([
        prisma.order.findMany({
          where: whereClause,
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
          orderBy: {
            createdAt: "desc",
          },
          take: limit,
        }),
        prisma.order.groupBy({
          by: ["status"],
          where: {
            orgId,
          },
          _count: {
            _all: true,
          },
        }),
        prisma.order.aggregate({
          where: {
            orgId,
            status: OrderStatus.SERVED,
          },
          _sum: {
            totalC: true,
          },
        }),
        prisma.order.count({
          where: {
            orgId,
          },
        }),
      ]);

    const byStatus: Record<OrderStatus, number> = {
      [OrderStatus.DRAFT]: 0,
      [OrderStatus.PLACED]: 0,
      [OrderStatus.ACCEPTED]: 0,
      [OrderStatus.PREPARING]: 0,
      [OrderStatus.READY]: 0,
      [OrderStatus.SERVED]: 0,
      [OrderStatus.CANCELLED]: 0,
    };

    statusCounts.forEach((item) => {
      byStatus[item.status] = item._count._all;
    });

    const activeOrders = ACTIVE_STATUSES.reduce(
      (acc, status) => acc + byStatus[status],
      0
    );

    return NextResponse.json({
      orders: orders.map((order) => ({
        id: order.id,
        number: order.number,
        status: order.status,
        totalC: order.totalC,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        notes: order.notes,
        table: order.table
          ? {
              id: order.table.id,
              number: order.table.number,
            }
          : null,
        items: order.items.map((item) => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          priceC: item.priceC,
          totalC: item.totalC,
          notes: item.notes,
        })),
      })),
      metrics: {
        total: totalOrders,
        active: activeOrders,
        byStatus,
        servedRevenueCents: servedAggregate._sum.totalC ?? 0,
      },
    });
  } catch (error: unknown) {
    const maybe = error as { code?: string } | undefined;
    if (maybe?.code === "P1001") {
      console.error("DB unreachable (P1001) fetching staff orders", error);
      return NextResponse.json(
        { error: "Servicio no disponible. Reintentá en unos segundos." },
        { status: 503 }
      );
    }
    console.error("Error fetching staff orders:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

