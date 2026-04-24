import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const ALLOWED_ROLES: Role[] = [Role.OWNER, Role.MANAGER, Role.CASHIER];

export async function DELETE(
  _request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ orgId: string; orderId: string; discountId: string }>;
  }
) {
  try {
    const { orgId, orderId, discountId } = await params;
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
        { error: "No tienes permisos para eliminar descuentos" },
        { status: 403 }
      );
    }

    const discount = await prisma.discount.findFirst({
      where: {
        id: discountId,
        orderId,
        order: { orgId },
      },
      select: { id: true },
    });

    if (!discount) {
      return NextResponse.json(
        { error: "Descuento no encontrado" },
        { status: 404 }
      );
    }

    await prisma.discount.delete({ where: { id: discount.id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error eliminando descuento:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
