"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { ChefHat, MapPin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type FeedItem = {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  imageUrl: string | null;
  category: {
    id: string;
    name: string;
  };
  organization: {
    id: string;
    name: string;
  };
};

type FilterOption = {
  id: string;
  name: string;
};

type PublicMenuFeedProps = {
  items: FeedItem[];
  categories: FilterOption[];
  organizations: FilterOption[];
};

const currencyFormatter = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  minimumFractionDigits: 2,
});

const formatPrice = (cents: number) => currencyFormatter.format(cents / 100);

export function PublicMenuFeed({
  items,
  categories,
  organizations,
}: PublicMenuFeedProps) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [organizationFilter, setOrganizationFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("recent");

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();

    const data = items.filter((item) => {
      const matchesSearch =
        term.length === 0 ||
        `${item.name} ${item.description ?? ""} ${item.organization.name} ${
          item.category.name
        }`
          .toLowerCase()
          .includes(term);

      const matchesCategory =
        categoryFilter === "all" || item.category.id === categoryFilter;

      const matchesOrganization =
        organizationFilter === "all" ||
        item.organization.id === organizationFilter;

      return matchesSearch && matchesCategory && matchesOrganization;
    });

    switch (sortBy) {
      case "price-asc":
        return [...data].sort((a, b) => a.priceCents - b.priceCents);
      case "price-desc":
        return [...data].sort((a, b) => b.priceCents - a.priceCents);
      case "name":
        return [...data].sort((a, b) => a.name.localeCompare(b.name));
      default:
        return data;
    }
  }, [items, search, categoryFilter, organizationFilter, sortBy]);

  const hasFiltersApplied =
    search.trim().length > 0 ||
    categoryFilter !== "all" ||
    organizationFilter !== "all" ||
    sortBy !== "recent";

  const clearFilters = () => {
    setSearch("");
    setCategoryFilter("all");
    setOrganizationFilter("all");
    setSortBy("recent");
  };

  return (
    <section className="space-y-8">
      <header className="space-y-6 rounded-2xl border border-slate-200 bg-white/70 p-6 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="w-full lg:max-w-xl">
            <label
              htmlFor="search"
              className="text-sm font-medium text-slate-600"
            >
              Buscar platos o restaurantes
            </label>
            <Input
              id="search"
              type="search"
              placeholder="Ej. ceviche, pasta, vegetariano..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="mt-2"
            />
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="sm:w-56">
                <SelectValue placeholder="Todas las categorías" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={organizationFilter}
              onValueChange={setOrganizationFilter}
            >
              <SelectTrigger className="sm:w-56">
                <SelectValue placeholder="Todos los restaurantes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los restaurantes</SelectItem>
                {organizations.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="sm:w-44">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Más recientes</SelectItem>
                <SelectItem value="price-asc">Precio: menor a mayor</SelectItem>
                <SelectItem value="price-desc">
                  Precio: mayor a menor
                </SelectItem>
                <SelectItem value="name">Nombre (A-Z)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {hasFiltersApplied ? (
          <div className="flex items-center gap-4 rounded-lg border border-dashed border-orange-200 bg-orange-50 px-4 py-3">
            <span className="text-sm text-orange-700">
              {filteredItems.length} plato
              {filteredItems.length === 1 ? "" : "s"} disponible
              {filteredItems.length === 1 ? "" : "s"} con los filtros
              seleccionados.
            </span>
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Limpiar filtros
            </Button>
          </div>
        ) : null}
      </header>

      {filteredItems.length === 0 ? (
        <Card className="bg-white shadow-sm">
          <CardContent className="py-10 text-center text-slate-500">
            <p className="text-lg font-medium">
              No encontramos platos con los filtros seleccionados.
            </p>
            <p className="mt-1 text-sm">
              Ajusta la búsqueda o explora otra categoría/restaurante.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredItems.map((item) => (
            <Card
              key={item.id}
              className="flex h-full flex-col overflow-hidden border border-slate-200 transition hover:shadow-md"
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt={item.name}
                    fill
                    className="object-cover transition-transform duration-300 hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <ChefHat className="h-12 w-12 text-slate-400" />
                  </div>
                )}
              </div>
              <CardHeader className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="secondary">{item.category.name}</Badge>
                  <span className="text-sm font-semibold text-orange-600">
                    {formatPrice(item.priceCents)}
                  </span>
                </div>
                <CardTitle className="text-lg">{item.name}</CardTitle>
                {item.description ? (
                  <CardDescription className="line-clamp-2">
                    {item.description}
                  </CardDescription>
                ) : null}
              </CardHeader>
              <CardContent className="mt-auto flex items-center justify-between text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-slate-400" />
                  <span>{item.organization.name}</span>
                </div>
                <span className="text-xs text-slate-400">
                  ID #{item.id.slice(0, 6)}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}

export default PublicMenuFeed;
