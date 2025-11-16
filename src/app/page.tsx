import { Metadata } from "next";
import Link from "next/link";
import { ChefHat, Timer, UtensilsCrossed } from "lucide-react";
import { PlanTier } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import PublicMenuFeed from "@/components/public/public-menu-feed";
import { PricingSection } from "@/components/pricing/pricing-section";

export const metadata: Metadata = {
  title: "Sabores en Vivo | Todos los platos disponibles hoy",
  description:
    "Explora en tiempo real los platos activos de todos los restaurantes asociados. Filtra por categoría, ubicación y descubre qué hay disponible hoy mismo.",
};

// Revalidar cada 60 segundos para mostrar datos actualizados
export const revalidate = 60;

export default async function Home() {
  const menuItems = await prisma.menuItem.findMany({
    where: {
      active: true,
      org: {
        plan: PlanTier.PREMIUM,
      },
    },
    include: {
      category: {
        select: {
          id: true,
          name: true,
        },
      },
      org: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
  });

  const items = menuItems.map((item) => ({
    id: item.id,
    name: item.name,
    description: item.description,
    priceCents: item.priceCents,
    imageUrl: item.imageUrl,
    category: {
      id: item.category.id,
      name: item.category.name,
    },
    organization: {
      id: item.org.id,
      name: item.org.name,
    },
  }));

  const categoriesMap = new Map<string, string>();
  const organizationsMap = new Map<string, string>();

  for (const item of items) {
    categoriesMap.set(item.category.id, item.category.name);
    organizationsMap.set(item.organization.id, item.organization.name);
  }

  const categories = Array.from(categoriesMap.entries())
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const organizations = Array.from(organizationsMap.entries())
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const stats = {
    restaurants: organizations.length,
    dishes: items.length,
    categories: categories.length,
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <section className="relative overflow-hidden bg-gradient-to-br from-orange-100 via-white to-white">
        <div className="container mx-auto px-4 py-16 lg:py-20">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
            <div className="space-y-6">
              <Badge
                variant="secondary"
                className="w-fit bg-orange-200/80 text-orange-900"
              >
                Sabores en vivo
              </Badge>
              <h1 className="text-4xl font-bold text-slate-900 sm:text-5xl lg:text-6xl">
                Todos los platos disponibles hoy, en un solo lugar
              </h1>
              <p className="max-w-2xl text-lg text-slate-600">
                Explora en tiempo real qué están ofreciendo los restaurantes de
                nuestra red. Filtra por categoría, por ubicación y encuentra el
                plato perfecto para tu próximo antojo.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button size="lg" asChild>
                  <a href="#explorar">Descubrir platos</a>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/dashboard">Soy un restaurante</Link>
                </Button>
              </div>
              <div className="grid gap-4 rounded-2xl border border-orange-200 bg-white/70 p-6 shadow-sm backdrop-blur md:grid-cols-3">
                <div>
                  <span className="flex items-center gap-2 text-sm font-medium text-orange-600">
                    <UtensilsCrossed className="h-4 w-4" /> Platos activos
                  </span>
                  <p className="mt-1 text-3xl font-semibold text-slate-900">
                    {stats.dishes}
                  </p>
                  <p className="text-sm text-slate-500">
                    Actualizados por los restaurantes hoy.
                  </p>
                </div>
                <div>
                  <span className="flex items-center gap-2 text-sm font-medium text-orange-600">
                    <ChefHat className="h-4 w-4" /> Restaurantes
                  </span>
                  <p className="mt-1 text-3xl font-semibold text-slate-900">
                    {stats.restaurants}
                  </p>
                  <p className="text-sm text-slate-500">
                    Negocios que publican en tiempo real.
                  </p>
                </div>
                <div>
                  <span className="flex items-center gap-2 text-sm font-medium text-orange-600">
                    <Timer className="h-4 w-4" /> Categorías
                  </span>
                  <p className="mt-1 text-3xl font-semibold text-slate-900">
                    {stats.categories}
                  </p>
                  <p className="text-sm text-slate-500">
                    Variedad de opciones para cada gusto.
                  </p>
                </div>
              </div>
            </div>
            <div className="hidden h-full rounded-3xl border border-dashed border-orange-300 bg-white/70 p-6 shadow-lg lg:block">
              <div className="flex h-full flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <p className="text-sm uppercase tracking-wide text-orange-600">
                    ¿Cómo funciona?
                  </p>
                  <h2 className="text-2xl font-semibold text-slate-900">
                    Una vitrina viva para tus restaurantes favoritos
                  </h2>
                  <p className="text-sm text-slate-600">
                    Cada vez que un restaurante activa o desactiva un plato en
                    el POS, lo verás instantáneamente aquí. Sin catálogos
                    desactualizados ni llamadas eternas.
                  </p>
                </div>
                <div className="space-y-4">
                  <div className="rounded-xl bg-orange-100/80 p-4 text-sm text-orange-900">
                    &ldquo;Nos encanta porque nuestros clientes ven lo que
                    realmente tenemos hoy. Si se agota un plato, desaparece de
                    inmediato.&rdquo; — La Chacra Bistró
                  </div>
                  <p className="text-xs text-slate-400">
                    ¿Tienes un restaurante y quieres aparecer aquí? Súmate a
                    nuestra red y gestiona tu carta en minutos.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-slate-50" />
      </section>

      <section id="explorar" className="container mx-auto px-4 py-12 lg:py-16">
        <PublicMenuFeed
          items={items}
          categories={categories}
          organizations={organizations}
        />
      </section>

      <PricingSection />
    </div>
  );
}
