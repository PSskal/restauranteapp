import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    // Obtener datos del body
    const { name, slug, ownerId } = await request.json();

    // Validaciones básicas
    if (!name?.trim() || !slug?.trim()) {
      return NextResponse.json(
        { message: "Nombre y slug son requeridos" },
        { status: 400 }
      );
    }

    // Verificar que el usuario solo pueda crear organizaciones para sí mismo
    if (ownerId !== session.user.id) {
      return NextResponse.json(
        { message: "Solo puedes crear restaurantes para tu propia cuenta" },
        { status: 403 }
      );
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

    // Manejar error de constraint único
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json(
        { message: "Este nombre de URL ya está en uso" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
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
