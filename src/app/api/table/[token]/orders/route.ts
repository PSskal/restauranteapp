import { NextRequest, NextResponse } from "next/server";
import { OrderStatus, PaymentStatus } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { checkNumericLimit } from "@/lib/subscription";

const orderSchema = z.object({
  items: z
    .array(
      z.object({
        menuItemId: z.string().min(1, "Producto requerido"),
        quantity: z
          .number()
          .int("La cantidad debe ser entera")
          .min(1, "Minimo 1 unidad")
          .max(20, "Maximo 20 unidades por producto"),
        notes: z.string().trim().max(200, "Maximo 200 caracteres").optional(),
      })
    )
    .min(1, "Agrega al menos un producto"),
  notes: z
    .string()
    .trim()
    .max(300, "Maximo 300 caracteres para notas")
    .optional(),
});

function currentMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { start, end };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json(
        { error: "Token de mesa requerido" },
        { status: 400 }
      );
    }

    let jsonBody: unknown;

    try {
      jsonBody = await request.json();
    } catch {
      return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
    }

    const parsed = orderSchema.safeParse(jsonBody);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Datos invalidos",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { items, notes } = parsed.data;

    const table = await prisma.table.findFirst({
      where: {
        qrToken: token,
      },
      include: {
        org: {
          select: {
            id: true,
            name: true,
            plan: true,
          },
        },
      },
    });

    if (!table) {
      return NextResponse.json(
        { error: "Mesa no encontrada" },
        { status: 404 }
      );
    }

    if (!table.org) {
      return NextResponse.json(
        { error: "Restaurante no disponible" },
        { status: 410 }
      );
    }

    if (!table.isEnabled) {
      return NextResponse.json(
        { error: "La mesa no está disponible en este momento" },
        { status: 409 }
      );
    }

    const uniqueItemIds = [...new Set(items.map((item) => item.menuItemId))];

    const menuItems = await prisma.menuItem.findMany({
      where: {
        id: { in: uniqueItemIds },
        orgId: table.orgId,
        active: true,
      },
    });

    const { start, end } = currentMonthRange();
    const ordersThisMonth = await prisma.order.count({
      where: {
        orgId: table.orgId,
        createdAt: {
          gte: start,
          lt: end,
        },
      },
    });

    const limitCheck = checkNumericLimit(
      table.org.plan,
      "monthlyOrders",
      ordersThisMonth
    );

    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          error:
            "El restaurante alcanz� el l�mite mensual del plan Free. Consulta con el personal para continuar.",
        },
        { status: 402 }
      );
    }

    if (menuItems.length !== uniqueItemIds.length) {
      return NextResponse.json(
        {
          error: "Algunos productos no estan disponibles",
        },
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

    const order = await prisma.$transaction(async (tx) => {
      const lastOrder = await tx.order.findFirst({
        where: { orgId: table.orgId },
        orderBy: { number: "desc" },
        select: { number: true },
      });

      const nextOrderNumber = (lastOrder?.number ?? 0) + 1;

      return tx.order.create({
        data: {
          orgId: table.orgId,
          tableId: table.id,
          number: nextOrderNumber,
          status: OrderStatus.PLACED,
          notes: notes?.trim() || null,
          totalC,
          items: {
            create: cartItems,
          },
        },
        include: {
          items: true,
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
          total: order.totalC / 100,
          totalC: order.totalC,
          notes: order.notes,
          createdAt: order.createdAt,
          table: order.table,
          items: order.items.map((item) => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            price: item.priceC / 100,
            priceC: item.priceC,
            total: item.totalC / 100,
            totalC: item.totalC,
            notes: item.notes,
          })),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating order:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// List recent orders for a table (for client to recover last order after refresh)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    if (!token) {
      return NextResponse.json(
        { error: "Token de mesa requerido" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limitParam = parseInt(searchParams.get("limit") || "1", 10);
    const limit = Math.min(Math.max(limitParam, 1), 20);

    const table = await prisma.table.findFirst({
      where: { qrToken: token },
      include: {
        org: { select: { id: true, name: true } },
      },
    });

    if (!table) {
      return NextResponse.json(
        { error: "Mesa no encontrada" },
        { status: 404 }
      );
    }
    if (!table.org) {
      return NextResponse.json(
        { error: "Restaurante no disponible" },
        { status: 410 }
      );
    }

    const orders = await prisma.order.findMany({
      where: { tableId: table.id, orgId: table.orgId },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        items: true,
        table: { select: { id: true, number: true } },
        payments: {
          select: {
            status: true,
          },
        },
      },
    });

    return NextResponse.json({
      orders: orders.map((order) => ({
        id: order.id,
        number: order.number,
        status: order.status,
        total: order.totalC / 100,
        totalC: order.totalC,
        notes: order.notes,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        table: order.table,
        isPaid: order.payments.some(
          (payment) => payment.status === PaymentStatus.PAID
        ),
        items: order.items.map((item) => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.priceC / 100,
          priceC: item.priceC,
          total: item.totalC / 100,
          totalC: item.totalC,
          notes: item.notes,
        })),
      })),
    });
  } catch (error) {
    console.error("Error listing table orders:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
