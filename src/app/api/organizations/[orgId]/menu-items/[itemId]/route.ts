import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// PUT - Actualizar item de menú
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string; itemId: string }> }
) {
  try {
    const { orgId, itemId } = await params;
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
        { error: "No tienes permisos para editar productos" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      name,
      price,
      categoryId,
      active,
      description,
      imageUrl,
      outOfStock,
      stationId,
      prepMinutes,
    } = body;

    // Verificar que el item existe y pertenece a la org
    const existingItem = await prisma.menuItem.findFirst({
      where: {
        id: itemId,
        orgId: orgId,
      },
    });

    if (!existingItem) {
      return NextResponse.json(
        { error: "Producto no encontrado" },
        { status: 404 }
      );
    }

    // Validaciones
    if (name !== undefined && (!name || name.trim().length === 0)) {
      return NextResponse.json(
        { error: "El nombre del producto no puede estar vacío" },
        { status: 400 }
      );
    }

    if (price !== undefined && price <= 0) {
      return NextResponse.json(
        { error: "El precio debe ser mayor a 0" },
        { status: 400 }
      );
    }

    // Si se está cambiando la categoría, verificar que existe
    if (categoryId && categoryId !== existingItem.categoryId) {
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
    }

    // Preparar datos para actualizar
    const updateData: {
      name?: string;
      description?: string | null;
      priceCents?: number;
      categoryId?: string;
      imageUrl?: string | null;
      active?: boolean;
      outOfStock?: boolean;
      stationId?: string | null;
      prepMinutes?: number | null;
    } = {};

    if (name !== undefined) {
      updateData.name = name.trim();
    }
    if (description !== undefined) {
      updateData.description = description?.trim() || null;
    }
    if (price !== undefined) {
      updateData.priceCents = Math.round(price * 100);
    }
    if (categoryId !== undefined) {
      updateData.categoryId = categoryId;
    }
    if (imageUrl !== undefined) {
      updateData.imageUrl = imageUrl?.trim() || null;
    }
    if (active !== undefined) {
      updateData.active = active;
    }
    if (outOfStock !== undefined) {
      updateData.outOfStock = Boolean(outOfStock);
    }
    if (stationId !== undefined) {
      if (stationId === null || stationId === "") {
        updateData.stationId = null;
      } else {
        const station = await prisma.kitchenStation.findFirst({
          where: { id: stationId, orgId },
          select: { id: true },
        });
        if (!station) {
          return NextResponse.json(
            { error: "La estación no existe en este restaurante" },
            { status: 400 }
          );
        }
        updateData.stationId = stationId;
      }
    }
    if (prepMinutes !== undefined) {
      if (prepMinutes === null || prepMinutes === "") {
        updateData.prepMinutes = null;
      } else {
        const mins = Number(prepMinutes);
        if (!Number.isInteger(mins) || mins < 0 || mins > 600) {
          return NextResponse.json(
            { error: "Tiempo de preparación inválido (0-600 minutos)" },
            { status: 400 }
          );
        }
        updateData.prepMinutes = mins;
      }
    }

    // Actualizar el item
    const updatedItem = await prisma.menuItem.update({
      where: {
        id: itemId,
      },
      data: updateData,
      include: {
        category: { select: { id: true, name: true } },
        station: { select: { id: true, name: true, color: true } },
      },
    });

    return NextResponse.json({
      menuItem: {
        id: updatedItem.id,
        name: updatedItem.name,
        description: updatedItem.description,
        price: updatedItem.priceCents / 100,
        priceCents: updatedItem.priceCents,
        imageUrl: updatedItem.imageUrl,
        active: updatedItem.active,
        outOfStock: updatedItem.outOfStock,
        prepMinutes: updatedItem.prepMinutes,
        stationId: updatedItem.stationId,
        station: updatedItem.station,
        category: updatedItem.category,
      },
    });
  } catch (error) {
    console.error("Error updating menu item:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar item de menú
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string; itemId: string }> }
) {
  try {
    const { orgId, itemId } = await params;
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
        { error: "No tienes permisos para eliminar productos" },
        { status: 403 }
      );
    }

    // Verificar que el item existe y pertenece a la org
    const existingItem = await prisma.menuItem.findFirst({
      where: {
        id: itemId,
        orgId: orgId,
      },
      include: {
        _count: {
          select: {
            orderItems: true,
          },
        },
      },
    });

    if (!existingItem) {
      return NextResponse.json(
        { error: "Producto no encontrado" },
        { status: 404 }
      );
    }

    // Verificar si tiene órdenes asociadas
    if (existingItem._count.orderItems > 0) {
      return NextResponse.json(
        {
          error:
            "No se puede eliminar un producto que tiene pedidos asociados. Puedes desactivarlo en su lugar.",
        },
        { status: 400 }
      );
    }

    // Eliminar el item
    await prisma.menuItem.delete({
      where: {
        id: itemId,
      },
    });

    return NextResponse.json({
      message: "Producto eliminado correctamente",
    });
  } catch (error) {
    console.error("Error deleting menu item:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

