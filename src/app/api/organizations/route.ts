import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { PLAN_LIMITS } from "@/data/plans";
import { prisma } from "@/lib/prisma";
import { ensureActivePlan, ensureActivePlans } from "@/lib/plan-expiration";
import { checkRate, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { log } from "@/lib/logger";

const createOrgSchema = z.object({
  name: z.string().trim().min(1, "Nombre requerido").max(100),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, "Slug muy corto")
    .max(60)
    .regex(
      /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/,
      "Solo letras minúsculas, números y guiones"
    ),
  ownerId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    // 5 creaciones por hora por usuario es más que suficiente y bloquea abuso
    const rl = await checkRate(
      "organizations.create",
      `${getClientIp(request)}:${session.user.id}`,
      { max: 5, windowMs: 60 * 60 * 1000 }
    );
    if (!rl.ok) return rateLimitResponse(rl);

    let jsonBody: unknown;
    try {
      jsonBody = await request.json();
    } catch {
      return NextResponse.json(
        { message: "JSON inválido" },
        { status: 400 }
      );
    }

    const parsed = createOrgSchema.safeParse(jsonBody);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, slug, ownerId } = parsed.data;

    // Asegura que el usuario exista (primera vez con JWT puede no estar)
    let user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user && session.user.email) {
      user = await prisma.user.create({
        data: {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name,
          image: session.user.image,
        },
      });
    }

    if (ownerId !== session.user.id) {
      return NextResponse.json(
        { message: "Solo puedes crear restaurantes para tu propia cuenta" },
        { status: 403 }
      );
    }

    const existingOwnedOrgs = await prisma.organization.findMany({
      where: { ownerId: session.user.id },
      select: { id: true, plan: true },
    });

    const hasPremiumOrg = existingOwnedOrgs.some(
      (org) => org.plan === "PREMIUM"
    );

    if (!hasPremiumOrg) {
      const restaurantsLimit = PLAN_LIMITS.FREE.restaurants;
      if (
        restaurantsLimit !== null &&
        existingOwnedOrgs.length >= restaurantsLimit
      ) {
        return NextResponse.json(
          {
            message:
              "El plan Free solo permite crear 1 restaurante. Actualiza tu plan para gestionar más organizaciones.",
          },
          { status: 402 }
        );
      }
    }

    const existingOrg = await prisma.organization.findUnique({
      where: { slug },
    });

    if (existingOrg) {
      return NextResponse.json(
        { message: "Este nombre de URL ya está en uso. Elige otro." },
        { status: 409 }
      );
    }

    const organization = await prisma.organization.create({
      data: {
        name,
        slug,
        ownerId: session.user.id,
      },
    });

    await prisma.membership.create({
      data: {
        userId: session.user.id,
        orgId: organization.id,
        role: "OWNER",
      },
    });

    return NextResponse.json(organization);
  } catch (error) {
    log.error("organizations.create.exception", error);

    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json(
        { message: "Este nombre de URL ya está en uso" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { message: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    const memberships = await prisma.membership.findMany({
      where: { userId: session.user.id },
      include: { org: true },
    });

    const ownedOrgs = await prisma.organization.findMany({
      where: { ownerId: session.user.id },
    });

    const normalizedMemberships = await Promise.all(
      memberships.map(async (membership) => ({
        ...membership,
        org: await ensureActivePlan(membership.org),
      }))
    );

    const normalizedOwnedOrgs = await ensureActivePlans(ownedOrgs);

    return NextResponse.json({
      memberships: normalizedMemberships,
      ownedOrgs: normalizedOwnedOrgs,
    });
  } catch (error) {
    log.error("organizations.fetch.exception", error);
    return NextResponse.json(
      { message: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
