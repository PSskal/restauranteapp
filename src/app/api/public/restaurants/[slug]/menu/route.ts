import { NextRequest, NextResponse } from "next/server";
import { PlanTier } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    if (!slug) {
      return NextResponse.json(
        { error: "Slug del restaurante requerido" },
        { status: 400 }
      );
    }

    const organization = await prisma.organization.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        plan: true,
      },
    });

    if (!organization) {
      return NextResponse.json(
        { error: "Restaurante no encontrado" },
        { status: 404 }
      );
    }

    if (organization.plan !== PlanTier.PREMIUM) {
      return NextResponse.json(
        { error: "Este restaurante no tiene su carta pública activa" },
        { status: 403 }
      );
    }

    const [categories, menuItems] = await Promise.all([
      prisma.menuCategory.findMany({
        where: { orgId: organization.id },
        orderBy: {
          position: "asc",
        },
      }),
      prisma.menuItem.findMany({
        where: {
          orgId: organization.id,
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
      organization: {
        id: organization.id,
        name: organization.name,
        slug,
      },
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
    console.error("Error fetching public restaurant menu:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

