"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, ChefHat, Plus, Utensils } from "lucide-react";

interface Category {
  id: string;
  name: string;
  position: number;
}

export interface PublicMenuItem {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  priceCents: number;
  category: {
    id: string;
    name: string;
  };
}

interface MenuDisplayProps {
  orgId?: string;
  tableToken?: string;
  onAddItem?: (item: PublicMenuItem) => void;
}

export function MenuDisplay({ orgId, tableToken, onAddItem }: MenuDisplayProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<PublicMenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        setIsLoading(true);
        setError(null);

        if (tableToken) {
          const response = await fetch(`/api/table/${tableToken}/menu`);

          if (!response.ok) {
            throw new Error(`Menu request failed with ${response.status}`);
          }

          const data = await response.json();
          setCategories(data.categories || []);
          setMenuItems(data.menuItems || []);
          return;
        }

        if (!orgId) {
          setError("No hay un origen de menu disponible");
          return;
        }

        const [categoriesResponse, itemsResponse] = await Promise.all([
          fetch(`/api/organizations/${orgId}/categories`),
          fetch(`/api/organizations/${orgId}/menu-items?activeOnly=true`),
        ]);

        if (!categoriesResponse.ok || !itemsResponse.ok) {
          throw new Error("Fallo la carga del menu protegido");
        }

        const categoriesData = await categoriesResponse.json();
        const itemsData = await itemsResponse.json();

        setCategories(categoriesData.categories || []);
        setMenuItems(itemsData.menuItems || []);
      } catch (requestError) {
        console.error("Error fetching menu:", requestError);
        setError("No pudimos cargar el menu. Intenta de nuevo mas tarde.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchMenu();
  }, [orgId, tableToken]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-2 text-orange-600">
              <Clock className="h-5 w-5 animate-spin" />
              <span className="font-medium">Cargando menu...</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-2 text-red-600">
            <span className="font-medium">{error}</span>
            <p className="text-sm text-muted-foreground">
              Si el problema persiste avisa al personal.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (menuItems.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-2 text-amber-600">
              <ChefHat className="h-5 w-5" />
              <span className="font-medium">Menu en preparacion</span>
            </div>
            <p className="text-gray-600">
              El menu digital estara disponible proximamente.
            </p>
            <p className="text-sm text-gray-500">
              Por el momento, puedes llamar al personal para conocer las opciones.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const filteredItems = selectedCategory
    ? menuItems.filter((item) => item.category.id === selectedCategory)
    : menuItems;

  const itemsByCategory = categories
    .map((category) => ({
      ...category,
      items: menuItems.filter((item) => item.category.id === category.id),
    }))
    .filter((category) => category.items.length > 0);

  const renderMenuItem = (item: PublicMenuItem) => (
    <div
      key={item.id}
      className="flex flex-col gap-3 rounded-lg border p-4 transition-colors hover:bg-gray-50"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-1">
          <h4 className="font-medium text-gray-900">{item.name}</h4>
          {item.description ? (
            <p className="text-sm text-gray-600">{item.description}</p>
          ) : null}
        </div>
        <div className="text-right">
          <div className="text-lg font-semibold text-green-600">
            ${item.price.toFixed(2)}
          </div>
        </div>
      </div>
      {onAddItem ? (
        <div className="flex items-center justify-between">
          <Badge variant="outline">{item.category.name}</Badge>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onAddItem(item)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Agregar
          </Button>
        </div>
      ) : null}
    </div>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl flex items-center justify-center space-x-2">
            <Utensils className="h-6 w-6" />
            <span>Nuestro Menu</span>
          </CardTitle>
          <CardDescription>Descubre nuestras opciones</CardDescription>
        </CardHeader>
      </Card>

      {categories.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedCategory === null ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(null)}
          >
            Todas
          </Button>
          {categories.map((category) => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category.id)}
            >
              {category.name}
            </Button>
          ))}
        </div>
      ) : null}

      {selectedCategory === null ? (
        <div className="space-y-6">
          {itemsByCategory.map((category) => (
            <Card key={category.id}>
              <CardHeader>
                <CardTitle className="text-lg">{category.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {category.items.map((item) => renderMenuItem(item))}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {categories.find((c) => c.id === selectedCategory)?.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {filteredItems.map((item) => renderMenuItem(item))}
          </CardContent>
        </Card>
      )}

      {filteredItems.length === 0 && selectedCategory ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-gray-500">
              No hay productos disponibles en esta categoria
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
