import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { checkNumericLimit } from "@/lib/subscription";

// GET - Listar categorías de menú
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Verificar que el usuario tiene acceso a esta organización
    const membership = await prisma.membership.findFirst({
      where: {
        userId: session.user.id,
        orgId: orgId,
      },
    });

    const isOwner = await prisma.organization.findFirst({
      where: {
        id: orgId,
        ownerId: session.user.id,
      },
    });

    if (!membership && !isOwner) {
      return NextResponse.json(
        { error: "No tienes acceso a esta organización" },
        { status: 403 }
      );
    }

    // Obtener categorías ordenadas por position
    const categories = await prisma.menuCategory.findMany({
      where: {
        orgId: orgId,
      },
      include: {
        _count: {
          select: {
            items: {
              where: {
                active: true,
              },
            },
          },
        },
      },
      orderBy: {
        position: "asc",
      },
    });

    return NextResponse.json({
      categories: categories.map((category) => ({
        id: category.id,
        name: category.name,
        position: category.position,
        itemCount: category._count.items,
      })),
    });
  } catch (error) {
    console.error("Error fetching menu categories:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// POST - Crear nueva categoría
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Verificar permisos (solo OWNER y MANAGER pueden crear categorías)
    const membership = await prisma.membership.findFirst({
      where: {
        userId: session.user.id,
        orgId: orgId,
        role: {
          in: ["OWNER", "MANAGER"],
        },
      },
    });

    const isOwner = await prisma.organization.findFirst({
      where: {
        id: orgId,
        ownerId: session.user.id,
      },
    });

    if (!membership && !isOwner) {
      return NextResponse.json(
        { error: "No tienes permisos para crear categorías" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name } = body;

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: "El nombre de la categoría es requerido" },
        { status: 400 }
      );
    }

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { plan: true },
    });

    if (!org) {
      return NextResponse.json(
        { error: "Organizaci�n no encontrada" },
        { status: 404 }
      );
    }

    const categoryCount = await prisma.menuCategory.count({
      where: { orgId },
    });

    const limitCheck = checkNumericLimit(
      org.plan,
      "categories",
      categoryCount
    );

    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          error:
            "El plan Free permite hasta 3 categor�as. Actualiza tu plan para seguir organizando tu men�.",
        },
        { status: 402 }
      );
    }

    // Obtener la siguiente posición
    const lastCategory = await prisma.menuCategory.findFirst({
      where: { orgId },
      orderBy: { position: "desc" },
    });

    const nextPosition = lastCategory ? lastCategory.position + 1 : 0;

    // Crear la categoría
    const category = await prisma.menuCategory.create({
      data: {
        orgId: orgId,
        name: name.trim(),
        position: nextPosition,
      },
    });

    return NextResponse.json(
      {
        category: {
          id: category.id,
          name: category.name,
          position: category.position,
          itemCount: 0,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating menu category:", error);

    // Manejar error de duplicado
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "Ya existe una categoría con ese nombre" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

