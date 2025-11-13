import { NextRequest, NextResponse } from "next/server";
import { PaymentMethod, PaymentStatus, Role } from "@prisma/client";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const paySchema = z.object({
  method: z.nativeEnum(PaymentMethod).optional(),
  amountC: z
    .number()
    .int("El monto debe ser entero en centimos")
    .positive("El monto debe ser mayor a 0")
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
        { error: "Datos invalidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { method = PaymentMethod.CASH, amountC } = parsed.data;

    const [membership, organization] = await Promise.all([
      prisma.membership.findFirst({
        where: {
          userId: session.user.id,
          orgId,
          role: {
            in: ALLOWED_ROLES,
          },
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
      where: {
        id: orderId,
        orgId,
      },
      include: {
        payments: true,
        table: {
          select: { id: true, number: true },
        },
        items: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Pedido no encontrado" },
        { status: 404 }
      );
    }

    const paidAmount = order.payments
      .filter((payment) => payment.status === PaymentStatus.PAID)
      .reduce((acc, payment) => acc + payment.amountC, 0);

    const remainingAmount = Math.max(order.totalC - paidAmount, 0);

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
          error: `El monto excede el saldo pendiente (${remainingAmount / 100}s)`,
        },
        { status: 400 }
      );
    }

    const pendingPayment = order.payments.find(
      (payment) => payment.status !== PaymentStatus.PAID
    );

    if (pendingPayment) {
      await prisma.payment.update({
        where: { id: pendingPayment.id },
        data: {
          method,
          amountC: finalAmount,
          status: PaymentStatus.PAID,
        },
      });
    } else {
      await prisma.payment.create({
        data: {
          orderId: order.id,
          method,
          amountC: finalAmount,
          status: PaymentStatus.PAID,
        },
      });
    }

    const updatedOrder = await prisma.order.findUnique({
      where: { id: order.id },
      include: {
        table: {
          select: { id: true, number: true },
        },
        items: true,
        payments: true,
      },
    });

    if (!updatedOrder) {
      return NextResponse.json(
        { error: "No se pudo actualizar el pedido" },
        { status: 500 }
      );
    }

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
        isPaid: updatedOrder.payments.some(
          (payment) => payment.status === PaymentStatus.PAID
        ),
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
