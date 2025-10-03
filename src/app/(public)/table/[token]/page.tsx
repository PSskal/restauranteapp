"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  ChefHat,
  MapPin,
  Phone,
  Utensils,
  Minus,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { MenuDisplay, PublicMenuItem } from "@/components/menu/menu-display";

interface Table {
  id: string;
  number: number;
  qrToken: string;
  organization: {
    id: string;
    name: string;
  };
}

interface CartItem {
  menuItemId: string;
  name: string;
  priceCents: number;
  quantity: number;
}

interface CreatedOrderSummary {
  id: string;
  number: number;
  total: number;
  status: string;
}

const formatPrice = (cents: number) => (cents / 100).toFixed(2);

export default function TablePage() {
  const params = useParams();
  const token = params.token as string;

  const [table, setTable] = useState<Table | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderNotes, setOrderNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [lastOrder, setLastOrder] = useState<CreatedOrderSummary | null>(null);

  useEffect(() => {
    const fetchTable = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await fetch(`/api/table/${token}`);

        if (!response.ok) {
          if (response.status === 404) {
            setError("Mesa no encontrada");
          } else if (response.status === 410) {
            setError("Esta mesa no esta disponible");
          } else {
            setError("Error al cargar la mesa");
          }
          return;
        }

        const data = await response.json();
        setTable(data.table);
      } catch (requestError) {
        console.error("Error fetching table:", requestError);
        setError("Error de conexion");
      } finally {
        setIsLoading(false);
      }
    };

    if (token) {
      fetchTable();
    }
  }, [token]);

  // Recover last order on mount (in case user refreshes page)
  useEffect(() => {
    const recover = async () => {
      if (!token) return;
      try {
        const response = await fetch(`/api/table/${token}/orders?limit=1`, {
          cache: "no-store",
        });
        if (!response.ok) return; // Silently ignore
        const data = await response.json();
        if (data.orders && data.orders.length > 0) {
          const o = data.orders[0];
          setLastOrder({
            id: o.id,
            number: o.number,
            total: o.total,
            status: o.status,
          });
        }
      } catch {
        // ignore network errors silently
      }
    };
    recover();
  }, [token]);

  // Poll order status if lastOrder exists and not final (SERVED/CANCELLED)
  useEffect(() => {
    if (!lastOrder) return;
    if (["SERVED", "CANCELLED"].includes(lastOrder.status)) return;
    const interval = setInterval(async () => {
      try {
        const resp = await fetch(`/api/table/${token}/orders?limit=1`, {
          cache: "no-store",
        });
        if (!resp.ok) return;
        const data = await resp.json();
        if (data.orders && data.orders.length > 0) {
          const o = data.orders[0];
          if (o.id === lastOrder.id) {
            setLastOrder((prev) =>
              prev ? { ...prev, status: o.status } : prev
            );
          }
        }
      } catch {}
    }, 15000);
    return () => clearInterval(interval);
  }, [lastOrder, token]);

  const cartTotalCents = useMemo(
    () => cart.reduce((sum, item) => sum + item.priceCents * item.quantity, 0),
    [cart]
  );

  const cartItemsCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );

  const handleAddToCart = (item: PublicMenuItem) => {
    setCart((current) => {
      const existing = current.find(
        (cartItem) => cartItem.menuItemId === item.id
      );

      if (existing) {
        return current.map((cartItem) =>
          cartItem.menuItemId === item.id
            ? {
                ...cartItem,
                quantity: cartItem.quantity + 1,
              }
            : cartItem
        );
      }

      return [
        ...current,
        {
          menuItemId: item.id,
          name: item.name,
          priceCents: item.priceCents,
          quantity: 1,
        },
      ];
    });

    setSubmitError(null);
  };

  const updateQuantity = (menuItemId: string, delta: number) => {
    setCart((current) => {
      return current
        .map((item) =>
          item.menuItemId === menuItemId
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0);
    });
  };

  const removeItem = (menuItemId: string) => {
    setCart((current) =>
      current.filter((item) => item.menuItemId !== menuItemId)
    );
  };

  const resetCart = () => {
    setCart([]);
    setOrderNotes("");
  };

  const handleSubmitOrder = async () => {
    if (!table || cart.length === 0) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setLastOrder(null);

    try {
      const response = await fetch(`/api/table/${token}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: cart.map((item) => ({
            menuItemId: item.menuItemId,
            quantity: item.quantity,
          })),
          notes: orderNotes.trim() ? orderNotes.trim() : undefined,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        const message =
          errorBody?.error || "No pudimos enviar tu pedido. Intenta de nuevo.";
        throw new Error(message);
      }

      const data = await response.json();
      setLastOrder({
        id: data.order.id,
        number: data.order.number,
        total: data.order.total,
        status: data.order.status,
      });
      resetCart();
    } catch (submitError) {
      console.error("Error creating order:", submitError);
      setSubmitError(
        submitError instanceof Error
          ? submitError.message
          : "No pudimos enviar tu pedido. Intenta mas tarde."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-orange-50 to-white">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-orange-500" />
          <p className="text-gray-600">Cargando mesa...</p>
        </div>
      </div>
    );
  }

  if (error || !table) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-red-50 to-white p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <Utensils className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-xl text-red-600">
              {error || "Mesa no encontrada"}
            </CardTitle>
            <CardDescription>
              Por favor verifica el codigo QR o contacta al restaurante.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white">
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-gray-900">
              {table.organization.name}
            </h1>
            <p className="text-gray-600">
              Bienvenido, arma tu pedido desde la Mesa {table.number}
            </p>
            <Badge variant="outline">Mesa {table.number}</Badge>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto space-y-6">
          <Card className="border-orange-200">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                <ChefHat className="h-8 w-8 text-orange-600" />
              </div>
              <CardTitle className="text-xl">
                Bienvenido a {table.organization.name}!
              </CardTitle>
              <CardDescription>
                Puedes explorar el menu, agregar platos a tu carrito y enviar el
                pedido directamente a cocina.
              </CardDescription>
            </CardHeader>
          </Card>

          {lastOrder ? (
            <Card className="border-green-200 bg-green-50">
              <CardHeader className="flex flex-row items-start gap-3">
                <div className="mt-1">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <CardTitle className="text-lg text-green-700">
                    Pedido #{lastOrder.number}
                  </CardTitle>
                  <CardDescription className="text-green-700">
                    Total ${lastOrder.total.toFixed(2)} • Estado:{" "}
                    {lastOrder.status}
                  </CardDescription>
                </div>
              </CardHeader>
            </Card>
          ) : null}

          <MenuDisplay
            orgId={table.organization.id}
            tableToken={table.qrToken}
            onAddItem={handleAddToCart}
          />

          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <span>Tu carrito</span>
                <Badge variant="secondary">{cartItemsCount} items</Badge>
              </CardTitle>
              <CardDescription>
                Revisa tu seleccion antes de enviar el pedido.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {cart.length === 0 ? (
                <div className="text-center text-gray-500">
                  Agrega productos desde el menu para comenzar.
                </div>
              ) : (
                <div className="space-y-4">
                  {cart.map((item) => (
                    <div
                      key={item.menuItemId}
                      className="flex flex-col gap-3 rounded-lg border p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-gray-900">
                            {item.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            Precio unitario ${formatPrice(item.priceCents)}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(item.menuItemId)}
                          className="text-gray-500 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => updateQuantity(item.menuItemId, -1)}
                            disabled={item.quantity === 1}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="w-8 text-center font-medium">
                            {item.quantity}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => updateQuantity(item.menuItemId, 1)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500">Subtotal</p>
                          <p className="text-base font-semibold text-gray-900">
                            ${formatPrice(item.priceCents * item.quantity)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <label
                  className="text-sm font-medium text-gray-700"
                  htmlFor="order-notes"
                >
                  Notas para tu pedido (opcional)
                </label>
                <Textarea
                  id="order-notes"
                  placeholder="Ejemplo: sin picante, traer platos adicionales"
                  value={orderNotes}
                  onChange={(event) => setOrderNotes(event.target.value)}
                  rows={3}
                />
              </div>

              {submitError ? (
                <div className="flex items-center gap-2 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4" />
                  <span>{submitError}</span>
                </div>
              ) : null}

              <div className="flex items-center justify-between border-t pt-4">
                <div>
                  <p className="text-sm text-gray-500">Total</p>
                  <p className="text-xl font-semibold text-gray-900">
                    ${formatPrice(cartTotalCents)}
                  </p>
                </div>
                <Button
                  className="bg-orange-500 hover:bg-orange-600"
                  size="lg"
                  disabled={cart.length === 0 || isSubmitting}
                  onClick={handleSubmitOrder}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Enviando pedido
                    </>
                  ) : (
                    <>
                      <Utensils className="h-4 w-4 mr-2" />
                      Enviar pedido
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-50">
            <CardHeader>
              <CardTitle className="text-lg">Informacion</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-3">
                <MapPin className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-700">
                  Mesa {table.number}
                </span>
              </div>

              <div className="flex items-center space-x-3">
                <Phone className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-700">
                  Si necesitas ayuda, llama al personal de sala
                </span>
              </div>

              <div className="pt-3 border-t">
                <p className="text-xs text-gray-500">
                  Token de mesa: {table.qrToken}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
