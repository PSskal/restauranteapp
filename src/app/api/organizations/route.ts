import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { PLAN_LIMITS } from "@/data/plans";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  let session;
  let name, slug, ownerId;

  try {
    // Verificar autenticación
    session = await auth();
    console.log("Session in organizations API:", session);

    if (!session?.user?.id) {
      console.log("No session or user ID found");
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    // Obtener datos del body
    const body = await request.json();
    ({ name, slug, ownerId } = body);
    console.log("Request body:", body);

    // Validaciones básicas
    if (!name?.trim() || !slug?.trim()) {
      return NextResponse.json(
        { message: "Nombre y slug son requeridos" },
        { status: 400 }
      );
    }

    // Verificar que el usuario existe en la BD (o crearlo si es la primera vez)
    let user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user && session.user.email) {
      // Crear usuario si no existe (primera vez con JWT)
      user = await prisma.user.create({
        data: {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name,
          image: session.user.image,
        },
      });
      console.log("Created new user:", user);
    }

    // Verificar que el usuario solo pueda crear organizaciones para sí mismo
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
              "El plan Free solo permite crear 1 restaurante. Actualiza tu plan para gestionar m�s organizaciones.",
          },
          { status: 402 }
        );
      }
    }

    // Verificar que el slug no exista
    const existingOrg = await prisma.organization.findUnique({
      where: { slug: slug.trim().toLowerCase() },
    });

    if (existingOrg) {
      return NextResponse.json(
        { message: "Este nombre de URL ya está en uso. Elige otro." },
        { status: 400 }
      );
    }

    // Crear la organización
    const organization = await prisma.organization.create({
      data: {
        name: name.trim(),
        slug: slug.trim().toLowerCase(),
        ownerId: session.user.id,
      },
    });

    // Crear membership automático para el owner
    await prisma.membership.create({
      data: {
        userId: session.user.id,
        orgId: organization.id,
        role: "OWNER",
      },
    });

    return NextResponse.json(organization);
  } catch (error) {
    console.error("Error creating organization:", error);
    console.error("Session data:", session);
    console.error("Request data:", { name, slug, ownerId });

    // Manejar error de constraint único
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json(
        { message: "Este nombre de URL ya está en uso" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        message: "Error interno del servidor",
        details: error instanceof Error ? error.message : String(error),
        sessionId: session?.user?.id || "no-session-id",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Verificar autenticación
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    // Obtener organizaciones del usuario
    const memberships = await prisma.membership.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        org: true,
      },
    });

    const ownedOrgs = await prisma.organization.findMany({
      where: {
        ownerId: session.user.id,
      },
    });

    return NextResponse.json({
      memberships,
      ownedOrgs,
    });
  } catch (error) {
    console.error("Error fetching organizations:", error);
    return NextResponse.json(
      { message: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
