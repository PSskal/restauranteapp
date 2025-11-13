import { NextRequest, NextResponse } from "next/server";
import { OrderStatus, Role, PaymentStatus } from "@prisma/client";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { checkNumericLimit } from "@/lib/subscription";

const ALLOWED_POS_ROLES: Role[] = [
  Role.OWNER,
  Role.MANAGER,
  Role.CASHIER,
  Role.WAITER,
];

const itemSchema = z.object({
  menuItemId: z.string().min(1, "Producto requerido"),
  quantity: z
    .number()
    .int("La cantidad debe ser entera")
    .min(1, "Minimo 1 unidad")
    .max(20, "Maximo 20 unidades por producto"),
  notes: z.string().trim().max(200, "Maximo 200 caracteres").optional(),
});

const createOrderSchema = z.object({
  tableId: z.string().min(1, "Id de mesa invalido").optional(),
  notes: z
    .string()
    .trim()
    .max(300, "Maximo 300 caracteres para notas")
    .optional(),
  items: z.array(itemSchema).min(1, "Agrega al menos un producto"),
  autoAccept: z.boolean().optional(),
});

const ACTIVE_STATUSES: OrderStatus[] = [
  OrderStatus.PLACED,
  OrderStatus.ACCEPTED,
  OrderStatus.PREPARING,
  OrderStatus.READY,
];

function currentMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { start, end };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const [membership, organization] = await Promise.all([
      prisma.membership.findFirst({
        where: {
          userId: session.user.id,
          orgId,
          role: {
            in: ALLOWED_POS_ROLES,
          },
        },
      }),
      prisma.organization.findUnique({
        where: { id: orgId },
        select: {
          ownerId: true,
          plan: true,
        },
      }),
    ]);

    if (!organization) {
      return NextResponse.json(
        { error: "Restaurante no encontrado" },
        { status: 404 }
      );
    }

    const isOwner = organization.ownerId === session.user.id;

    if (!membership && !isOwner) {
      return NextResponse.json(
        { error: "No tienes permisos para crear pedidos" },
        { status: 403 }
      );
    }

    let jsonBody: unknown;

    try {
      jsonBody = await request.json();
    } catch {
      return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
    }

    const parsed = createOrderSchema.safeParse(jsonBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos invalidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { items, tableId, notes, autoAccept } = parsed.data;

    if (tableId) {
      const table = await prisma.table.findFirst({
        where: {
          id: tableId,
          orgId,
        },
        select: { id: true },
      });

      if (!table) {
        return NextResponse.json(
          { error: "La mesa indicada no pertenece al restaurante" },
          { status: 404 }
        );
      }
    }

    const uniqueItemIds = [...new Set(items.map((item) => item.menuItemId))];

    const menuItems = await prisma.menuItem.findMany({
      where: {
        id: { in: uniqueItemIds },
        orgId,
        active: true,
      },
    });

    const { start, end } = currentMonthRange();
    const ordersThisMonth = await prisma.order.count({
      where: {
        orgId,
        createdAt: {
          gte: start,
          lt: end,
        },
      },
    });

    const limitCheck = checkNumericLimit(
      organization.plan,
      "monthlyOrders",
      ordersThisMonth
    );

    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          error:
            "Alcanzaste el l�mite de 50 pedidos mensuales del plan Free. Actualiza a Premium para seguir tomando pedidos.",
        },
        { status: 402 }
      );
    }

    if (menuItems.length !== uniqueItemIds.length) {
      return NextResponse.json(
        { error: "Algunos productos no estan disponibles" },
        { status: 400 }
      );
    }

    const cartItems = items.map((item) => {
      const menuItem = menuItems.find((mi) => mi.id === item.menuItemId);

      if (!menuItem) {
        throw new Error("Producto faltante tras validacion");
      }

      const quantity = item.quantity;
      const priceC = menuItem.priceCents;
      const totalC = priceC * quantity;

      return {
        menuItemId: menuItem.id,
        name: menuItem.name,
        quantity,
        priceC,
        totalC,
        notes: item.notes?.trim() || null,
      };
    });

    const totalC = cartItems.reduce((sum, item) => sum + item.totalC, 0);

    // Asegurar que session.user existe y guardar el userId
    if (!session.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const userId = session.user.id;

    const order = await prisma.$transaction(async (tx) => {
      const lastOrder = await tx.order.findFirst({
        where: { orgId },
        orderBy: { number: "desc" },
        select: { number: true },
      });

      const nextOrderNumber = (lastOrder?.number ?? 0) + 1;

      return tx.order.create({
        data: {
          orgId,
          tableId: tableId ?? null,
          number: nextOrderNumber,
          status: autoAccept ? OrderStatus.ACCEPTED : OrderStatus.PLACED,
          notes: notes?.trim() || null,
          totalC,
          createdById: userId,
          items: {
            create: cartItems,
          },
        },
        include: {
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
          table: {
            select: {
              id: true,
              number: true,
            },
          },
        },
      });
    });

    return NextResponse.json(
      {
        order: {
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
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const maybe = error as { code?: string } | undefined;

    if (maybe?.code === "P1001") {
      console.error("DB unreachable (P1001) creating staff order", error);
      return NextResponse.json(
        { error: "Servicio no disponible. Intenta en unos segundos." },
        { status: 503 }
      );
    }
    console.error("Error creating staff order:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

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
            payments: {
              select: {
                status: true,
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
      orders: orders.map((order) => {
        const isPaid = order.payments.some(
          (payment) => payment.status === PaymentStatus.PAID
        );

        return {
          id: order.id,
          number: order.number,
          status: order.status,
          totalC: order.totalC,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
          notes: order.notes,
          isPaid,
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
        };
      }),
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
