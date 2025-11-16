import { NextRequest, NextResponse } from "next/server";
import { PlanTier } from "@prisma/client";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { calculateExpirationDate, isAdminEmail } from "@/lib/plan-expiration";

const payloadSchema = z.object({
  email: z.string().email("Email inválido"),
  months: z.number().int().min(1).max(12).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.email || !isAdminEmail(session.user.email)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const rawBody = await request.json().catch(() => null);

    if (!rawBody) {
      return NextResponse.json(
        { error: "Payload requerido" },
        { status: 400 }
      );
    }

    const payload = payloadSchema.safeParse(rawBody);

    if (!payload.success) {
      return NextResponse.json(
        { error: payload.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email, months } = payload.data;
    const normalizedEmail = email.toLowerCase();
    const monthsToGrant = months ?? 1;

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        name: true,
        ownedOrgs: {
          select: {
            id: true,
            name: true,
            slug: true,
            plan: true,
            planExpiresAt: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "No encontramos un usuario con ese correo" },
        { status: 404 }
      );
    }

    if (user.ownedOrgs.length === 0) {
      return NextResponse.json(
        {
          error:
            "Ese usuario no tiene restaurantes creados aún, no se puede aplicar el plan",
        },
        { status: 400 }
      );
    }

    const expiresAt = calculateExpirationDate(monthsToGrant);

    const now = new Date();
    const updatedOrgs = await prisma.$transaction(
      user.ownedOrgs.map((org) =>
        prisma.organization.update({
          where: { id: org.id },
          data: {
            plan: PlanTier.PREMIUM,
            planExpiresAt: expiresAt,
            planUpdatedAt: now,
          },
          select: {
            id: true,
            name: true,
            slug: true,
            plan: true,
            planExpiresAt: true,
            planUpdatedAt: true,
          },
        })
      )
    );

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      trialEndsAt: expiresAt,
      organizations: updatedOrgs,
    });
  } catch (error) {
    console.error("Error granting premium trial:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
