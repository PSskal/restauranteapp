import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { checkNumericLimit } from "@/lib/subscription";

// GET - Listar items de menú
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const session = await auth();
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("categoryId");
    const activeOnly = searchParams.get("activeOnly") === "true";

    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Verificar acceso a la organización
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

    // Construir filtros
    const where = {
      orgId: orgId,
      ...(categoryId && { categoryId }),
      ...(activeOnly && { active: true }),
    };

    // Obtener items de menú
    const menuItems = await prisma.menuItem.findMany({
      where,
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [{ category: { position: "asc" } }, { name: "asc" }],
    });

    return NextResponse.json({
      menuItems: menuItems.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        price: item.priceCents / 100, // Convertir centavos a pesos
        priceCents: item.priceCents,
        imageUrl: item.imageUrl,
        active: item.active,
        category: item.category,
      })),
    });
  } catch (error) {
    console.error("Error fetching menu items:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// POST - Crear nuevo item de menú
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

    // Verificar permisos (solo OWNER y MANAGER)
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
        { error: "No tienes permisos para crear productos" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      name,
      price,
      categoryId,
      active = true,
      description,
      imageUrl,
    } = body;

    // Validaciones
    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: "El nombre del producto es requerido" },
        { status: 400 }
      );
    }

    if (!price || price <= 0) {
      return NextResponse.json(
        { error: "El precio debe ser mayor a 0" },
        { status: 400 }
      );
    }

    if (!categoryId) {
      return NextResponse.json(
        { error: "La categoría es requerida" },
        { status: 400 }
      );
    }

    // Verificar que la categoría existe y pertenece a la org
    const category = await prisma.menuCategory.findFirst({
      where: {
        id: categoryId,
        orgId: orgId,
      },
    });

    if (!category) {
      return NextResponse.json(
        { error: "Categoría no encontrada" },
        { status: 404 }
      );
    }

    // Convertir precio a centavos
    const priceCents = Math.round(price * 100);

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

    const menuItemCount = await prisma.menuItem.count({
      where: { orgId },
    });

    const limitCheck = checkNumericLimit(
      org.plan,
      "menuItems",
      menuItemCount
    );

    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          error:
            "El plan Free permite hasta 10 productos. Actualiza a Premium para seguir sumando platos.",
        },
        { status: 402 }
      );
    }

    // Crear el item
    const menuItem = await prisma.menuItem.create({
      data: {
        orgId: orgId,
        categoryId: categoryId,
        name: name.trim(),
        description: description?.trim() || null,
        priceCents: priceCents,
        imageUrl: imageUrl?.trim() || null,
        active: active,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        menuItem: {
          id: menuItem.id,
          name: menuItem.name,
          description: menuItem.description,
          price: menuItem.priceCents / 100,
          priceCents: menuItem.priceCents,
          imageUrl: menuItem.imageUrl,
          active: menuItem.active,
          category: menuItem.category,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating menu item:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

