import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { ensureActivePlan } from "@/lib/plan-expiration";
import { log } from "@/lib/logger";

/**
 * Catálogo público para online ordering. No requiere auth pero sólo expone
 * datos de organizaciones con plan activo y `onlineOrderingEnabled`.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const organization = await prisma.organization.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
        planExpiresAt: true,
        planUpdatedAt: true,
        phone: true,
        address: true,
        onlineOrderingEnabled: true,
        pickupEnabled: true,
        deliveryEnabled: true,
        branding: {
          select: { brandColor: true, accentColor: true, logoUrl: true },
        },
      },
    });

    const normalized = await ensureActivePlan(organization);

    if (!normalized) {
      return NextResponse.json(
        { error: "Restaurante no encontrado" },
        { status: 404 }
      );
    }

    if (normalized.plan !== "PREMIUM" || !normalized.onlineOrderingEnabled) {
      return NextResponse.json(
        { error: "Pedidos online no están disponibles" },
        { status: 404 }
      );
    }

    const [categories, menuItems] = await Promise.all([
      prisma.menuCategory.findMany({
        where: { orgId: normalized.id },
        orderBy: { position: "asc" },
        select: { id: true, name: true, position: true },
      }),
      prisma.menuItem.findMany({
        where: { orgId: normalized.id, active: true },
        include: {
          modifierGroups: {
            orderBy: [{ position: "asc" }, { createdAt: "asc" }],
            include: {
              modifiers: {
                where: { active: true },
                orderBy: [{ position: "asc" }, { createdAt: "asc" }],
              },
            },
          },
        },
        orderBy: [{ name: "asc" }],
      }),
    ]);

    return NextResponse.json({
      organization: {
        id: normalized.id,
        name: normalized.name,
        slug: normalized.slug,
        phone: normalized.phone,
        address: normalized.address,
        onlineOrderingEnabled: normalized.onlineOrderingEnabled,
        pickupEnabled: normalized.pickupEnabled,
        deliveryEnabled: normalized.deliveryEnabled,
        branding: normalized.branding,
      },
      categories,
      menuItems: menuItems.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        priceCents: item.priceCents,
        imageUrl: item.imageUrl,
        outOfStock: item.outOfStock,
        categoryId: item.categoryId,
        modifierGroups: item.modifierGroups.map((group) => ({
          id: group.id,
          name: group.name,
          required: group.required,
          minSelect: group.minSelect,
          maxSelect: group.maxSelect,
          modifiers: group.modifiers.map((modifier) => ({
            id: modifier.id,
            name: modifier.name,
            priceDeltaC: modifier.priceDeltaC,
          })),
        })),
      })),
    });
  } catch (error) {
    log.error("public.menu.exception", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
