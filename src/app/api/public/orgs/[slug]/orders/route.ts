import { NextRequest, NextResponse } from "next/server";
import { OrderKind, OrderStatus } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { ensureActivePlan } from "@/lib/plan-expiration";
import { checkRate, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { log } from "@/lib/logger";
import { checkNumericLimit } from "@/lib/subscription";

const itemSchema = z.object({
  menuItemId: z.string().min(1),
  quantity: z.number().int().min(1).max(20),
  notes: z.string().trim().max(200).optional(),
  modifierIds: z.array(z.string().min(1)).max(30).optional(),
  courseNumber: z.number().int().min(1).max(9).optional(),
});

const bodySchema = z
  .object({
    kind: z.enum([OrderKind.PICKUP, OrderKind.DELIVERY]),
    customerName: z.string().trim().min(2, "Nombre requerido").max(80),
    customerPhone: z.string().trim().min(6, "Teléfono requerido").max(30),
    customerEmail: z.string().email().optional(),
    deliveryAddress: z.string().trim().min(5).max(300).optional(),
    pickupTime: z
      .string()
      .datetime({ offset: true })
      .optional(),
    notes: z.string().trim().max(300).optional(),
    items: z.array(itemSchema).min(1, "Agrega al menos un producto"),
  })
  .refine(
    (data) => data.kind !== OrderKind.DELIVERY || !!data.deliveryAddress,
    {
      message: "Dirección requerida para envíos a domicilio",
      path: ["deliveryAddress"],
    }
  );

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // Rate limit fuerte por IP: 10 pedidos por hora desde una misma IP
    const rl = await checkRate(
      "public.orders.create",
      `${slug}:${getClientIp(request)}`,
      { max: 10, windowMs: 60 * 60 * 1000 }
    );
    if (!rl.ok) return rateLimitResponse(rl);

    const organization = await prisma.organization.findUnique({
      where: { slug },
      select: {
        id: true,
        plan: true,
        planExpiresAt: true,
        planUpdatedAt: true,
        onlineOrderingEnabled: true,
        pickupEnabled: true,
        deliveryEnabled: true,
        slug: true,
        name: true,
      },
    });

    const normalized = await ensureActivePlan(organization);

    if (
      !normalized ||
      normalized.plan !== "PREMIUM" ||
      !normalized.onlineOrderingEnabled
    ) {
      return NextResponse.json(
        { error: "Pedidos online no están disponibles" },
        { status: 404 }
      );
    }

    let jsonBody: unknown;
    try {
      jsonBody = await request.json();
    } catch {
      return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
    }

    const parsed = bodySchema.safeParse(jsonBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const orgId = normalized.id;

    if (data.kind === OrderKind.PICKUP && !normalized.pickupEnabled) {
      return NextResponse.json(
        { error: "Pickup no está habilitado en este restaurante" },
        { status: 400 }
      );
    }
    if (data.kind === OrderKind.DELIVERY && !normalized.deliveryEnabled) {
      return NextResponse.json(
        { error: "Delivery no está habilitado en este restaurante" },
        { status: 400 }
      );
    }

    // Carga ítems del menú con modificadores activos
    const uniqueIds = [...new Set(data.items.map((i) => i.menuItemId))];
    const menuItems = await prisma.menuItem.findMany({
      where: { id: { in: uniqueIds }, orgId, active: true },
      include: {
        modifierGroups: { include: { modifiers: true } },
      },
    });

    if (menuItems.length !== uniqueIds.length) {
      return NextResponse.json(
        { error: "Algunos productos no están disponibles" },
        { status: 400 }
      );
    }

    const soldOut = menuItems.filter((item) => item.outOfStock);
    if (soldOut.length > 0) {
      return NextResponse.json(
        { error: `Agotado: ${soldOut.map((i) => i.name).join(", ")}` },
        { status: 400 }
      );
    }

    // Validamos límite mensual de pedidos del plan
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const monthlyOrders = await prisma.order.count({
      where: { orgId, createdAt: { gte: monthStart, lt: monthEnd } },
    });
    const limitCheck = checkNumericLimit(
      normalized.plan,
      "monthlyOrders",
      monthlyOrders
    );
    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          error:
            "Este restaurante alcanzó su límite mensual de pedidos. Intenta más tarde.",
        },
        { status: 503 }
      );
    }

    // Construye y valida ítems del carrito
    const cartItems: Array<{
      menuItemId: string;
      name: string;
      quantity: number;
      priceC: number;
      modifiersPriceC: number;
      totalC: number;
      notes: string | null;
      courseNumber: number;
      stationId: string | null;
      prepMinutes: number | null;
      modifiers: Array<{
        modifierId: string;
        groupName: string;
        name: string;
        priceDeltaC: number;
      }>;
    }> = [];

    for (const cartItem of data.items) {
      const menuItem = menuItems.find((mi) => mi.id === cartItem.menuItemId)!;

      const modifiersById = new Map(
        menuItem.modifierGroups.flatMap((group) =>
          group.modifiers.map(
            (modifier) => [modifier.id, { modifier, group }] as const
          )
        )
      );

      const selectedByGroup = new Map<string, number>();
      const selectedSnapshot: Array<{
        modifierId: string;
        groupName: string;
        name: string;
        priceDeltaC: number;
      }> = [];

      for (const modifierId of cartItem.modifierIds ?? []) {
        const entry = modifiersById.get(modifierId);
        if (!entry || !entry.modifier.active) {
          return NextResponse.json(
            {
              error: `Modificador inválido para "${menuItem.name}"`,
            },
            { status: 400 }
          );
        }
        selectedByGroup.set(
          entry.group.id,
          (selectedByGroup.get(entry.group.id) ?? 0) + 1
        );
        selectedSnapshot.push({
          modifierId: entry.modifier.id,
          groupName: entry.group.name,
          name: entry.modifier.name,
          priceDeltaC: entry.modifier.priceDeltaC,
        });
      }

      for (const group of menuItem.modifierGroups) {
        const count = selectedByGroup.get(group.id) ?? 0;
        if (count < group.minSelect) {
          return NextResponse.json(
            {
              error: `En "${group.name}" debes elegir al menos ${group.minSelect}`,
            },
            { status: 400 }
          );
        }
        if (count > group.maxSelect) {
          return NextResponse.json(
            {
              error: `Máximo ${group.maxSelect} opción(es) en "${group.name}"`,
            },
            { status: 400 }
          );
        }
      }

      const modifiersPriceC = selectedSnapshot.reduce(
        (sum, modifier) => sum + modifier.priceDeltaC,
        0
      );
      const unit = menuItem.priceCents + modifiersPriceC;
      if (unit < 0) {
        return NextResponse.json(
          { error: `Precio inválido para "${menuItem.name}"` },
          { status: 400 }
        );
      }

      cartItems.push({
        menuItemId: menuItem.id,
        name: menuItem.name,
        quantity: cartItem.quantity,
        priceC: menuItem.priceCents,
        modifiersPriceC,
        totalC: unit * cartItem.quantity,
        notes: cartItem.notes?.trim() || null,
        courseNumber: cartItem.courseNumber ?? 1,
        stationId: menuItem.stationId ?? null,
        prepMinutes: menuItem.prepMinutes ?? null,
        modifiers: selectedSnapshot,
      });
    }

    const totalC = cartItems.reduce((sum, item) => sum + item.totalC, 0);

    const order = await prisma.$transaction(async (tx) => {
      const lastOrder = await tx.order.findFirst({
        where: { orgId },
        orderBy: { number: "desc" },
        select: { number: true },
      });
      const nextNumber = (lastOrder?.number ?? 0) + 1;

      return tx.order.create({
        data: {
          orgId,
          tableId: null,
          number: nextNumber,
          kind: data.kind,
          status: OrderStatus.PLACED, // entra al staff para que la acepte
          notes: data.notes?.trim() || null,
          totalC,
          customerName: data.customerName.trim(),
          customerPhone: data.customerPhone.trim(),
          customerEmail: data.customerEmail?.trim() || null,
          deliveryAddress:
            data.kind === OrderKind.DELIVERY
              ? data.deliveryAddress?.trim()
              : null,
          pickupTime: data.pickupTime ? new Date(data.pickupTime) : null,
          createdById: null,
          items: {
            create: cartItems.map((item) => ({
              menuItemId: item.menuItemId,
              name: item.name,
              quantity: item.quantity,
              priceC: item.priceC,
              modifiersPriceC: item.modifiersPriceC,
              totalC: item.totalC,
              notes: item.notes,
              courseNumber: item.courseNumber,
              stationId: item.stationId,
              prepMinutes: item.prepMinutes,
              firedAt: null, // staff dispara desde el KDS
              modifiers: {
                create: item.modifiers.map((modifier) => ({
                  modifierId: modifier.modifierId,
                  groupName: modifier.groupName,
                  name: modifier.name,
                  priceDeltaC: modifier.priceDeltaC,
                })),
              },
            })),
          },
        },
        select: {
          id: true,
          number: true,
          kind: true,
          status: true,
          totalC: true,
          createdAt: true,
        },
      });
    });

    log.info("public.order.created", {
      orgId,
      orderNumber: order.number,
      kind: order.kind,
    });

    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    log.error("public.order.create.exception", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
