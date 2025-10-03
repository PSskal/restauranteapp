import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json(
        { error: "Token de mesa requerido" },
        { status: 400 }
      );
    }

    const table = await prisma.table.findFirst({
      where: {
        qrToken: token,
      },
      include: {
        org: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!table) {
      return NextResponse.json(
        { error: "Mesa no encontrada" },
        { status: 404 }
      );
    }

    if (!table.org) {
      return NextResponse.json(
        { error: "Restaurante no disponible" },
        { status: 410 }
      );
    }

    const [categories, menuItems] = await Promise.all([
      prisma.menuCategory.findMany({
        where: {
          orgId: table.orgId,
        },
        orderBy: {
          position: "asc",
        },
      }),
      prisma.menuItem.findMany({
        where: {
          orgId: table.orgId,
          active: true,
        },
        include: {
          category: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: [{ category: { position: "asc" } }, { name: "asc" }],
      }),
    ]);

    return NextResponse.json({
      organization: table.org,
      categories: categories.map((category) => ({
        id: category.id,
        name: category.name,
        position: category.position,
      })),
      menuItems: menuItems.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        price: item.priceCents / 100,
        priceCents: item.priceCents,
        imageUrl: item.imageUrl,
        category: item.category,
      })),
    });
  } catch (error) {
    console.error("Error fetching public menu:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

