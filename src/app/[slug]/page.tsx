import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { PlanTier } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { PublicRestaurantMenu } from "@/components/public/public-restaurant-menu";

const getRestaurantBySlug = cache(async (slug: string) => {
  return prisma.organization.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      plan: true,
      whatsappNumber: true,
      whatsappOrderingEnabled: true,
      branding: {
        select: {
          brandColor: true,
          accentColor: true,
          logoUrl: true,
        },
      },
    },
  });
});

export const revalidate = 120;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const restaurant = await getRestaurantBySlug(slug);

  if (!restaurant || restaurant.plan !== PlanTier.PREMIUM) {
    return {
      title: "Carta no disponible",
      description:
        "Este restaurante no tiene un perfil público activo por el momento.",
    };
  }

  return {
    title: `${restaurant.name} | Carta digital`,
    description: `Descubre los platos activos de ${restaurant.name} y envía tu pedido por WhatsApp.`,
    openGraph: {
      title: `${restaurant.name} | Carta digital`,
      description: `Explora el menú actualizado y envía tu pedido directo por WhatsApp.`,
    },
  };
}

export default async function RestaurantPublicMenuPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const restaurant = await getRestaurantBySlug(slug);

  if (!restaurant || restaurant.plan !== PlanTier.PREMIUM) {
    notFound();
  }

  return (
    <PublicRestaurantMenu
      restaurant={{
        id: restaurant.id,
        name: restaurant.name,
        slug: restaurant.slug,
        brandColor: restaurant.branding?.brandColor ?? "#146E37",
        accentColor: restaurant.branding?.accentColor ?? "#F9FAFB",
        logoUrl: restaurant.branding?.logoUrl ?? null,
        whatsappNumber: restaurant.whatsappNumber,
        whatsappOrderingEnabled: restaurant.whatsappOrderingEnabled,
      }}
    />
  );
}

