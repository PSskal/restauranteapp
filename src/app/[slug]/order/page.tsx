import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlanTier } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { ensureActivePlan } from "@/lib/plan-expiration";
import { OnlineOrderClient } from "@/components/public/online-order-client";

export const dynamic = "force-dynamic";

async function loadRestaurant(slug: string) {
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
  return ensureActivePlan(organization);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const restaurant = await loadRestaurant(slug);
  if (!restaurant) {
    return { title: "Pedidos no disponibles" };
  }
  return {
    title: `Pide en ${restaurant.name}`,
    description: `Pide tu comida en ${restaurant.name} para retirar o delivery.`,
  };
}

export default async function OnlineOrderPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const restaurant = await loadRestaurant(slug);

  if (
    !restaurant ||
    restaurant.plan !== PlanTier.PREMIUM ||
    !restaurant.onlineOrderingEnabled ||
    (!restaurant.pickupEnabled && !restaurant.deliveryEnabled)
  ) {
    notFound();
  }

  const [categories, menuItems] = await Promise.all([
    prisma.menuCategory.findMany({
      where: { orgId: restaurant.id },
      orderBy: { position: "asc" },
      select: { id: true, name: true, position: true },
    }),
    prisma.menuItem.findMany({
      where: { orgId: restaurant.id, active: true },
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
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <OnlineOrderClient
      restaurant={{
        id: restaurant.id,
        name: restaurant.name,
        slug: restaurant.slug,
        phone: restaurant.phone,
        address: restaurant.address,
        pickupEnabled: restaurant.pickupEnabled,
        deliveryEnabled: restaurant.deliveryEnabled,
        branding: restaurant.branding,
      }}
      categories={categories}
      menuItems={menuItems.map((item) => ({
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
      }))}
    />
  );
}
