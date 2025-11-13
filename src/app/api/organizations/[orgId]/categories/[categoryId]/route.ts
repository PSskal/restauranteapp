import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// PUT - Actualizar categoría
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string; categoryId: string }> }
) {
  try {
    const { orgId, categoryId } = await params;
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Verificar permisos
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
        { error: "No tienes permisos para editar categorías" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, position } = body;

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: "El nombre de la categoría es requerido" },
        { status: 400 }
      );
    }

    // Verificar que la categoría existe y pertenece a la org
    const existingCategory = await prisma.menuCategory.findFirst({
      where: {
        id: categoryId,
        orgId: orgId,
      },
    });

    if (!existingCategory) {
      return NextResponse.json(
        { error: "Categoría no encontrada" },
        { status: 404 }
      );
    }

    // Actualizar la categoría
    const updatedCategory = await prisma.menuCategory.update({
      where: {
        id: categoryId,
      },
      data: {
        name: name.trim(),
        ...(position !== undefined && { position }),
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
    });

    return NextResponse.json({
      category: {
        id: updatedCategory.id,
        name: updatedCategory.name,
        position: updatedCategory.position,
        itemCount: updatedCategory._count.items,
      },
    });
  } catch (error) {
    console.error("Error updating menu category:", error);

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

// DELETE - Eliminar categoría
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string; categoryId: string }> }
) {
  try {
    const { orgId, categoryId } = await params;
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Verificar permisos
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
        { error: "No tienes permisos para eliminar categorías" },
        { status: 403 }
      );
    }

    // Verificar que la categoría existe y pertenece a la org
    const existingCategory = await prisma.menuCategory.findFirst({
      where: {
        id: categoryId,
        orgId: orgId,
      },
      include: {
        _count: {
          select: {
            items: true,
          },
        },
      },
    });

    if (!existingCategory) {
      return NextResponse.json(
        { error: "Categoría no encontrada" },
        { status: 404 }
      );
    }

    // Verificar si tiene items
    if (existingCategory._count.items > 0) {
      return NextResponse.json(
        {
          error:
            "No se puede eliminar una categoría que tiene productos. Elimina primero todos los productos de esta categoría.",
        },
        { status: 400 }
      );
    }

    // Eliminar la categoría
    await prisma.menuCategory.delete({
      where: {
        id: categoryId,
      },
    });

    return NextResponse.json({
      message: "Categoría eliminada correctamente",
    });
  } catch (error) {
    console.error("Error deleting menu category:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

