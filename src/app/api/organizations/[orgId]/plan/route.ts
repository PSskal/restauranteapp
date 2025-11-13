import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { PLAN_IDS, type PlanId } from "@/data/plans";
import { prisma } from "@/lib/prisma";

function isPlanId(value: unknown): value is PlanId {
  return typeof value === "string" && PLAN_IDS.includes(value as PlanId);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { orgId } = await params;
    const body = await request.json().catch(() => null);
    const nextPlan = body?.plan;

    if (!isPlanId(nextPlan)) {
      return NextResponse.json(
        { error: "Plan no soportado" },
        { status: 400 }
      );
    }

    const organization = await prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        id: true,
        ownerId: true,
        plan: true,
        name: true,
        slug: true,
        createdAt: true,
      },
    });

    if (!organization) {
      return NextResponse.json(
        { error: "Organizaci�n no encontrada" },
        { status: 404 }
      );
    }

    if (organization.ownerId !== session.user.id) {
      return NextResponse.json(
        { error: "Solo el due�o puede cambiar de plan" },
        { status: 403 }
      );
    }

    if (organization.plan === nextPlan) {
      return NextResponse.json({ organization });
    }

    const updated = await prisma.organization.update({
      where: { id: orgId },
      data: { plan: nextPlan },
      select: {
        id: true,
        name: true,
        slug: true,
        ownerId: true,
        plan: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ organization: updated });
  } catch (error) {
    console.error("Error updating plan:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
