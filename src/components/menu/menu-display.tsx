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
import { Clock, ChefHat, Utensils } from "lucide-react";

interface Category {
  id: string;
  name: string;
  position: number;
}

interface MenuItem {
  id: string;
  name: string;
  price: number;
  priceCents: number;
  active: boolean;
  category: {
    id: string;
    name: string;
  };
}

interface MenuDisplayProps {
  orgId: string;
}

export function MenuDisplay({ orgId }: MenuDisplayProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        setIsLoading(true);

        // Obtener categorías
        const categoriesResponse = await fetch(
          `/api/organizations/${orgId}/categories`
        );
        if (categoriesResponse.ok) {
          const categoriesData = await categoriesResponse.json();
          setCategories(categoriesData.categories || []);
        }

        // Obtener items activos solamente
        const itemsResponse = await fetch(
          `/api/organizations/${orgId}/menu-items?activeOnly=true`
        );
        if (itemsResponse.ok) {
          const itemsData = await itemsResponse.json();
          setMenuItems(itemsData.menuItems || []);
        }
      } catch (error) {
        console.error("Error fetching menu:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMenu();
  }, [orgId]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-2 text-orange-600">
              <Clock className="h-5 w-5 animate-spin" />
              <span className="font-medium">Cargando menú...</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (categories.length === 0 || menuItems.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-2 text-amber-600">
              <ChefHat className="h-5 w-5" />
              <span className="font-medium">Menú en preparación</span>
            </div>
            <p className="text-gray-600">
              El menú digital estará disponible próximamente.
            </p>
            <p className="text-sm text-gray-500">
              Por el momento, puedes llamar al mesero para conocer nuestras
              opciones.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Filtrar items por categoría seleccionada
  const filteredItems = selectedCategory
    ? menuItems.filter((item) => item.category.id === selectedCategory)
    : menuItems;

  // Agrupar items por categoría para mostrar organizadamente
  const itemsByCategory = categories
    .map((category) => ({
      ...category,
      items: menuItems.filter((item) => item.category.id === category.id),
    }))
    .filter((category) => category.items.length > 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl flex items-center justify-center space-x-2">
            <Utensils className="h-6 w-6" />
            <span>Nuestro Menú</span>
          </CardTitle>
          <CardDescription>
            Descubre nuestras deliciosas opciones
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Filtros por categoría */}
      {categories.length > 1 && (
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
      )}

      {/* Mostrar por categorías */}
      {selectedCategory === null ? (
        <div className="space-y-6">
          {itemsByCategory.map((category) => (
            <Card key={category.id}>
              <CardHeader>
                <CardTitle className="text-lg">{category.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {category.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between items-start p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">
                          {item.name}
                        </h4>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-green-600">
                          ${item.price.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
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
          <CardContent>
            <div className="space-y-4">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between items-start p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{item.name}</h4>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-600">
                      ${item.price.toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {filteredItems.length === 0 && selectedCategory && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-gray-500">
              No hay productos disponibles en esta categoría
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
