import { NextRequest, NextResponse } from "next/server";
import { PaymentMethod, PaymentStatus, Role } from "@prisma/client";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const paySchema = z.object({
  method: z.nativeEnum(PaymentMethod).optional(),
  amountC: z
    .number()
    .int("El monto debe ser entero en centavos")
    .positive("El monto debe ser mayor a 0")
    .optional(),
  tipC: z
    .number()
    .int("La propina debe ser entera en centavos")
    .min(0, "La propina no puede ser negativa")
    .max(1_000_000, "Propina demasiado alta")
    .optional(),
});

const ALLOWED_ROLES: Role[] = [Role.OWNER, Role.MANAGER, Role.CASHIER];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string; orderId: string }> }
) {
  try {
    const [{ orgId, orderId }, session] = await Promise.all([params, auth()]);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const payload = await request.json().catch(() => ({}));
    const parsed = paySchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { method = PaymentMethod.CASH, amountC, tipC = 0 } = parsed.data;

    const [membership, organization] = await Promise.all([
      prisma.membership.findFirst({
        where: {
          userId: session.user.id,
          orgId,
          role: { in: ALLOWED_ROLES },
        },
      }),
      prisma.organization.findUnique({
        where: { id: orgId },
        select: { ownerId: true },
      }),
    ]);

    const isOwner = organization?.ownerId === session.user.id;

    if (!membership && !isOwner) {
      return NextResponse.json(
        { error: "No tienes permisos para registrar pagos" },
        { status: 403 }
      );
    }

    const order = await prisma.order.findFirst({
      where: { id: orderId, orgId },
      include: {
        payments: true,
        discounts: { select: { amountC: true } },
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Pedido no encontrado" },
        { status: 404 }
      );
    }

    const discountsC = order.discounts.reduce((sum, d) => sum + d.amountC, 0);
    const netDueC = Math.max(0, order.totalC - discountsC);

    const paidAmount = order.payments
      .filter((payment) => payment.status === PaymentStatus.PAID)
      .reduce((acc, payment) => acc + payment.amountC, 0);

    const remainingAmount = Math.max(netDueC - paidAmount, 0);

    if (remainingAmount === 0) {
      return NextResponse.json(
        { error: "El pedido ya fue marcado como pagado." },
        { status: 409 }
      );
    }

    const finalAmount = amountC ?? remainingAmount;

    if (finalAmount > remainingAmount) {
      return NextResponse.json(
        {
          error: `El monto excede el saldo pendiente (S/ ${(
            remainingAmount / 100
          ).toFixed(2)})`,
        },
        { status: 400 }
      );
    }

    // Reutiliza un pago pendiente si existe, sino crea uno nuevo
    const pendingPayment = order.payments.find(
      (payment) => payment.status !== PaymentStatus.PAID
    );

    if (pendingPayment) {
      await prisma.payment.update({
        where: { id: pendingPayment.id },
        data: {
          method,
          amountC: finalAmount,
          tipC,
          status: PaymentStatus.PAID,
        },
      });
    } else {
      await prisma.payment.create({
        data: {
          orderId: order.id,
          method,
          amountC: finalAmount,
          tipC,
          status: PaymentStatus.PAID,
        },
      });
    }

    const updatedOrder = await prisma.order.findUnique({
      where: { id: order.id },
      include: {
        table: { select: { id: true, number: true } },
        items: true,
        payments: true,
        discounts: { select: { amountC: true } },
      },
    });

    if (!updatedOrder) {
      return NextResponse.json(
        { error: "No se pudo actualizar el pedido" },
        { status: 500 }
      );
    }

    const newPaidC = updatedOrder.payments
      .filter((p) => p.status === PaymentStatus.PAID)
      .reduce((sum, p) => sum + p.amountC, 0);
    const newTipsC = updatedOrder.payments
      .filter((p) => p.status === PaymentStatus.PAID)
      .reduce((sum, p) => sum + p.tipC, 0);
    const newDiscountsC = updatedOrder.discounts.reduce(
      (sum, d) => sum + d.amountC,
      0
    );
    const newNetDueC = Math.max(0, updatedOrder.totalC - newDiscountsC);
    const isPaid = newPaidC >= newNetDueC && newNetDueC > 0;
    const remainingC = Math.max(0, newNetDueC - newPaidC);

    return NextResponse.json({
      order: {
        id: updatedOrder.id,
        number: updatedOrder.number,
        status: updatedOrder.status,
        totalC: updatedOrder.totalC,
        discountsC: newDiscountsC,
        netDueC: newNetDueC,
        paidC: newPaidC,
        tipsC: newTipsC,
        remainingC,
        isPaid,
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
  } catch (error) {
    console.error("Error registrando pago:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
