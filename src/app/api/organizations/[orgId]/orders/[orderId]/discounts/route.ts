import { NextRequest, NextResponse } from "next/server";
import { DiscountType, Role } from "@prisma/client";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const bodySchema = z
  .object({
    type: z.nativeEnum(DiscountType),
    valueBp: z
      .number()
      .int()
      .min(1, "El porcentaje debe ser mayor a 0")
      .max(10000, "Máximo 100%")
      .optional(),
    valueC: z
      .number()
      .int("Monto entero en centavos")
      .min(1, "Monto debe ser mayor a 0")
      .optional(),
    orderItemId: z.string().min(1).optional(),
    reason: z.string().trim().min(1, "Motivo requerido").max(200),
  })
  .refine(
    (data) => {
      if (data.type === DiscountType.PERCENT) return data.valueBp !== undefined;
      if (data.type === DiscountType.FIXED) return data.valueC !== undefined;
      return true;
    },
    { message: "Debes indicar valueBp (PERCENT) o valueC (FIXED)" }
  );

const ALLOWED_ROLES: Role[] = [Role.OWNER, Role.MANAGER, Role.CASHIER];

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
        { error: "No tienes permisos para aplicar descuentos" },
        { status: 403 }
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

    const { type, valueBp, valueC, orderItemId, reason } = parsed.data;

    const order = await prisma.order.findFirst({
      where: { id: orderId, orgId },
      include: {
        items: {
          select: { id: true, totalC: true },
        },
        discounts: true,
        payments: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Pedido no encontrado" },
        { status: 404 }
      );
    }

    // Determina la base sobre la que se aplica el descuento
    let baseC: number;
    if (orderItemId) {
      const target = order.items.find((item) => item.id === orderItemId);
      if (!target) {
        return NextResponse.json(
          { error: "El ítem no pertenece al pedido" },
          { status: 400 }
        );
      }
      const itemDiscounted = order.discounts
        .filter((d) => d.orderItemId === orderItemId)
        .reduce((sum, d) => sum + d.amountC, 0);
      baseC = Math.max(0, target.totalC - itemDiscounted);
    } else {
      const orderDiscounted = order.discounts.reduce(
        (sum, d) => sum + d.amountC,
        0
      );
      baseC = Math.max(0, order.totalC - orderDiscounted);
    }

    if (baseC === 0) {
      return NextResponse.json(
        { error: "No queda saldo sobre el cual aplicar descuento" },
        { status: 400 }
      );
    }

    let amountC: number;
    if (type === DiscountType.PERCENT) {
      amountC = Math.floor((baseC * (valueBp as number)) / 10000);
    } else if (type === DiscountType.FIXED) {
      amountC = Math.min(valueC as number, baseC);
    } else {
      // COMP: cortesía total sobre la base restante
      amountC = baseC;
    }

    if (amountC <= 0) {
      return NextResponse.json(
        { error: "El descuento calculado es 0" },
        { status: 400 }
      );
    }

    const created = await prisma.discount.create({
      data: {
        orderId,
        orderItemId: orderItemId ?? null,
        type,
        valueBp: type === DiscountType.PERCENT ? (valueBp as number) : null,
        amountC,
        reason: reason.trim(),
        appliedById: session.user.id,
      },
    });

    return NextResponse.json(
      {
        discount: {
          id: created.id,
          type: created.type,
          valueBp: created.valueBp,
          amountC: created.amountC,
          reason: created.reason,
          orderItemId: created.orderItemId,
          createdAt: created.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creando descuento:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
