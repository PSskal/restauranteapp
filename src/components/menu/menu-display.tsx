"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, ChefHat, Plus, Minus } from "lucide-react";

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
  imageUrl?: string | null;
  category: {
    id: string;
    name: string;
  };
}

interface MenuDisplayProps {
  orgId?: string;
  tableToken?: string;
  onAddItem?: (item: PublicMenuItem) => void;
  onUpdateQuantity?: (menuItemId: string, delta: number) => void;
  cartItems?: Array<{ menuItemId: string; quantity: number }>;
}

export function MenuDisplay({
  orgId,
  tableToken,
  onAddItem,
  onUpdateQuantity,
  cartItems = [],
}: MenuDisplayProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<PublicMenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const formatCurrency = (cents: number) => "$" + (cents / 100).toFixed(2);

  const handleAddToCart = (item: PublicMenuItem) => {
    if (onAddItem) {
      onAddItem(item);
    }
  };

  const decreaseQuantity = (itemId: string) => {
    if (onUpdateQuantity) {
      onUpdateQuantity(itemId, -1);
    }
  };

  const increaseQuantity = (itemId: string) => {
    if (onUpdateQuantity) {
      onUpdateQuantity(itemId, 1);
    }
  };
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
              Por el momento, puedes llamar al personal para conocer las
              opciones.
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

  const renderMenuItem = (item: PublicMenuItem) => {
    const cartItem = cartItems.find((c) => c.menuItemId === item.id);
    const quantity = cartItem?.quantity || 0;
    const isInCart = quantity > 0;

    return (
      <Card
        key={item.id}
        className={`p-4 bg-white hover:bg-gray-50 transition-all duration-200 border-2 ${
          isInCart ? "border-gray-600" : "border-gray-200"
        }`}
      >
        <div className="flex gap-4">
          <Image
            src={item.imageUrl || "/placeholder.svg"}
            alt={item.name}
            width={80}
            height={80}
            className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm mb-1 truncate">{item.name}</h3>
            <p className="text-xs text-gray-500 mb-2 line-clamp-2">
              {item.description ?? "Sin descripcion"}
            </p>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="font-bold">
                  {formatCurrency(item.priceCents)}
                </span>
              </div>
              <div className="flex justify-end">
                {(() => {
                  if (quantity === 0) {
                    return (
                      <Button
                        size="sm"
                        className="h-8 px-3 text-xs"
                        onClick={() => handleAddToCart(item)}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Agregar
                      </Button>
                    );
                  }

                  return (
                    <div className="flex items-center gap-2 bg-gray-100 rounded-full p-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 hover:bg-white rounded-full"
                        onClick={() => decreaseQuantity(item.id)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center text-sm font-semibold">
                        {quantity}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 hover:bg-white rounded-full"
                        onClick={() => increaseQuantity(item.id)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
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
            <div key={category.id} className="space-y-4">
              <h2 className="text-lg font-semibold">{category.name}</h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {category.items.map((item) => renderMenuItem(item))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">
            {categories.find((c) => c.id === selectedCategory)?.name}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredItems.map((item) => renderMenuItem(item))}
          </div>
        </div>
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
