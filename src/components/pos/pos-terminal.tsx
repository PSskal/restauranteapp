"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowRight,
  Minus,
  Plus,
  RefreshCcw,
  ShoppingCart,
  Trash2,
} from "lucide-react";

import { useOrganization } from "@/contexts/organization-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

const formatCurrency = (cents: number) => "$" + (cents / 100).toFixed(2);

type Category = {
  id: string;
  name: string;
  position: number;
  itemCount: number;
};

type PosMenuItem = {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  imageUrl: string | null;
  category: {
    id: string;
    name: string;
  };
};

type CartItem = {
  id: string;
  name: string;
  priceCents: number;
  quantity: number;
};

export function PosTerminal() {
  const { currentOrg, isLoading: isOrgLoading } = useOrganization();
  const currentOrgId = currentOrg?.id ?? null;

  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<PosMenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderNotes, setOrderNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadCatalog = useCallback(async () => {
    if (!currentOrgId) {
      return;
    }

    setCatalogLoading(true);
    setCatalogError(null);

    try {
      const [categoriesResponse, menuResponse] = await Promise.all([
        fetch(`/api/organizations/${currentOrgId}/categories`),
        fetch(`/api/organizations/${currentOrgId}/menu-items?activeOnly=true`),
      ]);

      if (!categoriesResponse.ok) {
        const data = await categoriesResponse.json().catch(() => null);
        throw new Error(
          data?.error || "No pudimos cargar las categorias del menu"
        );
      }

      if (!menuResponse.ok) {
        const data = await menuResponse.json().catch(() => null);
        throw new Error(data?.error || "No pudimos cargar el menu activo");
      }

      const categoriesJson = (await categoriesResponse.json()) as {
        categories: Category[];
      };
      const menuJson = (await menuResponse.json()) as {
        menuItems: Array<
          PosMenuItem & {
            price: number;
            active: boolean;
          }
        >;
      };

      setCategories(categoriesJson.categories);
      setMenuItems(
        menuJson.menuItems.map((item) => ({
          id: item.id,
          name: item.name,
          description: item.description ?? null,
          priceCents: item.priceCents,
          imageUrl: item.imageUrl ?? null,
          category: item.category,
        }))
      );
      setSelectedCategory("all");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Error cargando el menu";
      console.error("Error loading POS catalog:", error);
      setCatalogError(message);
      toast.error(message);
    } finally {
      setCatalogLoading(false);
    }
  }, [currentOrgId]);

  useEffect(() => {
    if (currentOrgId) {
      loadCatalog();
    }
  }, [currentOrgId, loadCatalog]);

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    return menuItems.filter((item) => {
      const matchesCategory =
        selectedCategory === "all" || item.category.id === selectedCategory;
      const matchesTerm =
        term.length === 0 ||
        item.name.toLowerCase().includes(term) ||
        item.category.name.toLowerCase().includes(term);
      return matchesCategory && matchesTerm;
    });
  }, [menuItems, search, selectedCategory]);

  const cartCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );

  const cartTotalC = useMemo(
    () => cart.reduce((sum, item) => sum + item.priceCents * item.quantity, 0),
    [cart]
  );

  const handleAddToCart = useCallback((item: PosMenuItem) => {
    setCart((prev) => {
      const existing = prev.find((entry) => entry.id === item.id);
      if (existing) {
        return prev.map((entry) =>
          entry.id === item.id
            ? { ...entry, quantity: entry.quantity + 1 }
            : entry
        );
      }
      return [
        ...prev,
        {
          id: item.id,
          name: item.name,
          priceCents: item.priceCents,
          quantity: 1,
        },
      ];
    });
  }, []);

  const decreaseQuantity = useCallback((itemId: string) => {
    setCart((prev) =>
      prev
        .map((entry) =>
          entry.id === itemId
            ? { ...entry, quantity: Math.max(entry.quantity - 1, 0) }
            : entry
        )
        .filter((entry) => entry.quantity > 0)
    );
  }, []);

  const removeFromCart = useCallback((itemId: string) => {
    setCart((prev) => prev.filter((entry) => entry.id !== itemId));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setOrderNotes("");
  }, []);

  const handleSubmitOrder = useCallback(async () => {
    if (!currentOrgId) {
      toast.error("Selecciona un restaurante para crear pedidos");
      return;
    }

    if (cart.length === 0) {
      toast.error("Agrega productos al pedido antes de confirmar");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/organizations/${currentOrgId}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: cart.map((entry) => ({
            menuItemId: entry.id,
            quantity: entry.quantity,
          })),
          notes: orderNotes.trim() || undefined,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const message = data?.error || "No pudimos registrar el pedido";
        throw new Error(message);
      }

      const orderNumber = data?.order?.number;
      toast.success(
        orderNumber
          ? `Pedido #${orderNumber} creado correctamente`
          : "Pedido creado correctamente"
      );
      clearCart();
      loadCatalog();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Error inesperado al confirmar el pedido";
      console.error("Error creating POS order:", error);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [cart, clearCart, currentOrgId, loadCatalog, orderNotes]);

  if (isOrgLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cargando restaurante activo...</CardTitle>
          <CardDescription>
            Espera un momento mientras obtenemos tu organizacion actual.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Esto puede tardar unos segundos.
        </CardContent>
      </Card>
    );
  }

  if (!currentOrgId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Selecciona un restaurante</CardTitle>
          <CardDescription>
            Usa el selector del sidebar para elegir en que restaurante operar.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <Card className="flex flex-col">
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Punto de venta</CardTitle>
              <CardDescription>
                {catalogLoading
                  ? "Cargando menu activo..."
                  : catalogError
                    ? catalogError
                    : `Gestiona pedidos para ${currentOrg.name}`}
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadCatalog}
              disabled={catalogLoading}
              className="gap-2"
            >
              <RefreshCcw className="h-4 w-4" />
              Refrescar
            </Button>
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <Input
              placeholder="Buscar por nombre o categoria"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="md:max-w-sm"
              disabled={catalogLoading}
            />
            <div className="flex flex-wrap gap-2">
              <Badge
                variant={selectedCategory === "all" ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setSelectedCategory("all")}
              >
                Todo
              </Badge>
              {categories.map((category) => (
                <Badge
                  key={category.id}
                  variant={
                    selectedCategory === category.id ? "default" : "outline"
                  }
                  className="cursor-pointer"
                  onClick={() => setSelectedCategory(category.id)}
                >
                  {category.name}
                </Badge>
              ))}
            </div>
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="flex-1 overflow-hidden p-0">
          <ScrollArea className="h-[600px]">
            <div className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3">
              {catalogLoading ? (
                <div className="col-span-full text-center text-sm text-muted-foreground">
                  Cargando menu...
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="col-span-full text-center text-sm text-muted-foreground">
                  No hay productos que coincidan con la busqueda.
                </div>
              ) : (
                filteredItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleAddToCart(item)}
                    className="flex flex-col items-start gap-2 rounded-lg border bg-card p-4 text-left transition hover:border-primary"
                  >
                    <div className="flex w-full items-center justify-between gap-2">
                      <h3 className="text-base font-semibold">{item.name}</h3>
                      <span className="text-sm font-medium text-primary">
                        {formatCurrency(item.priceCents)}
                      </span>
                    </div>
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {item.description ?? "Sin descripcion"}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="secondary">{item.category.name}</Badge>
                      <span className="flex items-center gap-1">
                        <Plus className="h-3 w-3" />
                        Agregar
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card className="flex h-full flex-col">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Pedido actual
              </CardTitle>
              <CardDescription>
                {cartCount} producto{cartCount === 1 ? "" : "s"}
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={clearCart}
              disabled={cart.length === 0 || isSubmitting}
            >
              Vaciar
            </Button>
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="flex flex-1 flex-col gap-4">
          <ScrollArea className="h-[320px]">
            <div className="space-y-3">
              {cart.length === 0 ? (
                <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                  Todavia no agregaste productos. Toca un item del menu para sumar
                  al carrito.
                </p>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-md border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(item.priceCents)} x {item.quantity}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => decreaseQuantity(item.id)}
                        disabled={isSubmitting}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-8 text-center text-sm font-semibold">
                        {item.quantity}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          const menuItem = menuItems.find((mi) => mi.id === item.id);
                          if (menuItem) {
                            handleAddToCart(menuItem);
                          }
                        }}
                        disabled={isSubmitting}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => removeFromCart(item.id)}
                        disabled={isSubmitting}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="order-notes">
              Notas del pedido
            </label>
            <Textarea
              id="order-notes"
              placeholder="Ej: sin sal, entregar en barra, etc."
              value={orderNotes}
              onChange={(event) => setOrderNotes(event.target.value)}
              disabled={isSubmitting}
              rows={3}
            />
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Subtotal</span>
              <span>{formatCurrency(cartTotalC)}</span>
            </div>
            <div className="flex items-center justify-between text-sm font-semibold">
              <span>Total a cobrar</span>
              <span>{formatCurrency(cartTotalC)}</span>
            </div>
          </div>

          <Button
            size="lg"
            className="mt-auto gap-2"
            onClick={handleSubmitOrder}
            disabled={cart.length === 0 || isSubmitting}
          >
            Confirmar pedido
            <ArrowRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}


