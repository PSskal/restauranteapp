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
  Phone,
  Utensils,
  Minus,
  Plus,
  Trash2,
  CheckCircle2,
  ShoppingCart,
  Clock,
  RefreshCw,
} from "lucide-react";
import { MenuDisplay, PublicMenuItem } from "@/components/menu/menu-display";

interface Branding {
  brandColor: string;
  accentColor: string;
  logoUrl: string | null;
}

interface Table {
  id: string;
  number: number;
  qrToken: string;
  organization: {
    id: string;
    name: string;
    branding?: Branding | null;
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

interface OrderFromAPI {
  id: string;
  number: number;
  total: number;
  status: string;
}

const formatPrice = (cents: number) => (cents / 100).toFixed(2);

const DEFAULT_BRAND_COLOR = "#146E37";
const DEFAULT_ACCENT_COLOR = "#F9FAFB";
const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

function ensureHex(value: string | null | undefined, fallback: string) {
  return value && HEX_COLOR_REGEX.test(value) ? value.toUpperCase() : fallback;
}

function hexToRgba(hex: string, alpha: number) {
  if (!HEX_COLOR_REGEX.test(hex)) {
    return `rgba(0,0,0,${alpha})`;
  }

  const normalized = hex.replace("#", "");
  const bigint = parseInt(normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function TablePage() {
  const params = useParams();
  const token = params.token as string;

  const [showMobileCart, setShowMobileCart] = useState(false);
  const [showOrderConfirmation, setShowOrderConfirmation] = useState(false);
  const [lastOrderItems, setLastOrderItems] = useState<CartItem[]>([]);

  const [table, setTable] = useState<Table | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderNotes, setOrderNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
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
        const brandingData = data.table?.organization?.branding ?? null;
        const sanitizedBranding: Branding = {
          brandColor: ensureHex(
            brandingData?.brandColor ?? null,
            DEFAULT_BRAND_COLOR
          ),
          accentColor: ensureHex(
            brandingData?.accentColor ?? null,
            DEFAULT_ACCENT_COLOR
          ),
          logoUrl: brandingData?.logoUrl ?? null,
        };

        setTable({
          ...data.table,
          organization: {
            ...data.table.organization,
            branding: sanitizedBranding,
          },
        });
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

  // Recover last order from localStorage (device-specific)
  useEffect(() => {
    if (!token) return;

    try {
      const savedOrder = localStorage.getItem(`lastOrder_${token}`);
      if (savedOrder) {
        const orderData = JSON.parse(savedOrder);
        setLastOrder(orderData);

        // También recuperar los items del último pedido si existen
        const savedItems = localStorage.getItem(`lastOrderItems_${token}`);
        if (savedItems) {
          setLastOrderItems(JSON.parse(savedItems));
        }
      }
    } catch (error) {
      console.error("Error loading saved order:", error);
      // Limpiar localStorage si hay datos corruptos
      localStorage.removeItem(`lastOrder_${token}`);
      localStorage.removeItem(`lastOrderItems_${token}`);
    }
  }, [token]);

  // Poll order status if lastOrder exists and not final (SERVED/CANCELLED)
  useEffect(() => {
    if (!lastOrder) return;
    if (["SERVED", "CANCELLED"].includes(lastOrder.status)) return;

    const interval = setInterval(async () => {
      try {
        // Usar el endpoint existente y filtrar por ID del pedido guardado
        const resp = await fetch(`/api/table/${token}/orders?limit=10`, {
          cache: "no-store",
        });
        if (!resp.ok) return;
        const data = await resp.json();

        if (data.orders && data.orders.length > 0) {
          // Buscar nuestro pedido específico por ID
          const currentOrder = data.orders.find(
            (o: OrderFromAPI) => o.id === lastOrder.id
          );
          if (currentOrder && currentOrder.status !== lastOrder.status) {
            const updatedOrder = { ...lastOrder, status: currentOrder.status };
            setLastOrder(updatedOrder);

            // Actualizar localStorage con el nuevo estado
            try {
              localStorage.setItem(
                `lastOrder_${token}`,
                JSON.stringify(updatedOrder)
              );

              // Si el pedido llega a estado final, limpiarlo después de 1 hora
              if (["SERVED", "CANCELLED"].includes(currentOrder.status)) {
                setTimeout(
                  () => {
                    try {
                      localStorage.removeItem(`lastOrder_${token}`);
                      localStorage.removeItem(`lastOrderItems_${token}`);
                    } catch (error) {
                      console.error(
                        "Error clearing order from localStorage:",
                        error
                      );
                    }
                  },
                  60 * 60 * 1000
                ); // 1 hora
              }
            } catch (error) {
              console.error("Error updating order in localStorage:", error);
            }
          }
        }
      } catch (error) {
        console.error("Error polling order status:", error);
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [lastOrder, token]);

  const brandColor = ensureHex(
    table?.organization.branding?.brandColor ?? null,
    DEFAULT_BRAND_COLOR
  );
  const accentColor = ensureHex(
    table?.organization.branding?.accentColor ?? null,
    DEFAULT_ACCENT_COLOR
  );
  const logoUrl = table?.organization.branding?.logoUrl ?? null;
  const softCardBackground = hexToRgba(brandColor, 0.08);
  const softCardBorder = hexToRgba(brandColor, 0.35);

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PLACED":
        return <Clock className="h-5 w-5 text-blue-500" />;
      case "PREPARING":
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case "READY":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "SERVED":
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PLACED":
        return "bg-blue-100 text-blue-800";
      case "PREPARING":
        return "bg-yellow-100 text-yellow-800";
      case "READY":
        return "bg-green-100 text-green-800";
      case "SERVED":
        return "bg-green-200 text-green-900";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "PLACED":
        return "Pedido recibido";
      case "PREPARING":
        return "Preparando";
      case "READY":
        return "Listo para servir";
      case "SERVED":
        return "Servido";
      default:
        return status;
    }
  };

  const handleOrderAgain = () => {
    if (lastOrderItems.length > 0) {
      setCart(lastOrderItems);
      setShowMobileCart(true);
    }
  };

  const handleSubmitOrder = async () => {
    if (!table || cart.length === 0) {
      return;
    }

    setIsSubmitting(true);
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

      // Guardar los items del pedido para la función "ordenar de nuevo"
      const orderItems = [...cart];
      setLastOrderItems(orderItems);

      const orderData = {
        id: data.order.id,
        number: data.order.number,
        total: data.order.total,
        status: data.order.status,
      };

      setLastOrder(orderData);

      // Guardar en localStorage para este dispositivo específicamente
      try {
        localStorage.setItem(`lastOrder_${token}`, JSON.stringify(orderData));
        localStorage.setItem(
          `lastOrderItems_${token}`,
          JSON.stringify(orderItems)
        );
      } catch (error) {
        console.error("Error saving order to localStorage:", error);
      }

      // Mostrar modal de confirmación
      setShowOrderConfirmation(true);

      resetCart();
    } catch (submitError) {
      console.error("Error creating order:", submitError);
      // Podrías mostrar un toast aquí en lugar de usar el estado
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          background: `linear-gradient(to bottom, ${hexToRgba(accentColor, 0.6)} 0%, #ffffff 100%)`,
        }}
      >
        <div className="text-center">
          <Loader2
            className="mx-auto mb-4 h-8 w-8 animate-spin"
            style={{ color: brandColor }}
          />
          <p className="text-gray-600">Cargando mesa...</p>
        </div>
      </div>
    );
  }

  if (error || !table) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{
          background: `linear-gradient(to bottom, ${hexToRgba(accentColor, 0.4)} 0%, #ffffff 100%)`,
        }}
      >
        <Card
          className="w-full max-w-md"
          style={{ borderColor: softCardBorder }}
        >
          <CardHeader className="text-center">
            <div
              className="mb-4 flex h-12 w-12 items-center justify-center rounded-full"
              style={{
                backgroundColor: hexToRgba(brandColor, 0.15),
              }}
            >
              <Utensils className="h-6 w-6" style={{ color: brandColor }} />
            </div>
            <CardTitle className="text-xl" style={{ color: brandColor }}>
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
    <div
      className="min-h-screen pb-28 lg:pb-12"
      style={{ backgroundColor: accentColor }}
    >
      <div className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-6 lg:py-10">
        <div className="space-y-6">
          <Card className="border bg-white shadow-sm">
            <CardContent className="flex flex-col gap-5 pt-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-2">
                  <Badge
                    variant="outline"
                    className="w-fit"
                    style={{ borderColor: softCardBorder, color: brandColor }}
                  >
                    Mesa {table.number}
                  </Badge>
                  <div className="flex items-center gap-3">
                    {logoUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={logoUrl}
                        alt={`Logo de ${table.organization.name}`}
                        className="h-10 w-10 rounded-lg object-contain lg:h-12 lg:w-12"
                      />
                    )}
                    <h1 className="text-2xl font-semibold text-gray-900 lg:text-3xl">
                      {table.organization.name}
                    </h1>
                  </div>
                  <p className="text-sm text-gray-600 lg:text-base">
                    Elige tus platos favoritos y envía el pedido directo a
                    cocina.
                  </p>
                </div>
                <div
                  className="hidden h-14 w-14 items-center justify-center rounded-full sm:flex"
                  style={{
                    backgroundColor: hexToRgba(brandColor, 0.12),
                    border: `1px solid ${softCardBorder}`,
                  }}
                >
                  {logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={logoUrl}
                      alt={`Logo de ${table.organization.name}`}
                      className="h-10 w-10 object-contain"
                    />
                  ) : (
                    <ChefHat
                      className="h-7 w-7"
                      style={{ color: brandColor }}
                    />
                  )}
                </div>
              </div>
              <div className="grid gap-3 text-sm text-gray-600 sm:grid-cols-3">
                <div
                  className="flex items-center gap-2 rounded-md border border-dashed px-3 py-2"
                  style={{
                    borderColor: softCardBorder,
                    backgroundColor: softCardBackground,
                    color: brandColor,
                  }}
                >
                  <Utensils className="h-4 w-4" style={{ color: brandColor }} />
                  Pedido directo a cocina
                </div>

                <div className="flex items-center gap-2 rounded-md border bg-white px-3 py-2 shadow-sm">
                  <Phone className="h-4 w-4 text-gray-500" />
                  ¿Ayuda? llama al personal
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="space-y-4">
            {lastOrder ? (
              <Card
                className={`border-2 shadow-sm ${
                  lastOrder.status === "SERVED"
                    ? "border-green-200 bg-green-50"
                    : lastOrder.status === "READY"
                      ? "border-green-200 bg-green-50"
                      : lastOrder.status === "PREPARING"
                        ? "border-yellow-200 bg-yellow-50"
                        : "border-blue-200 bg-blue-50"
                }`}
              >
                <CardHeader className="flex flex-row items-start gap-3">
                  <div className="mt-1">{getStatusIcon(lastOrder.status)}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <CardTitle className="text-lg">
                        Pedido #{lastOrder.number}
                      </CardTitle>
                      <Badge className={getStatusColor(lastOrder.status)}>
                        {getStatusText(lastOrder.status)}
                      </Badge>
                    </div>
                    <CardDescription className="text-sm">
                      Total: {""}
                      <span className="font-semibold">
                        ${lastOrder.total.toFixed(2)}
                      </span>
                    </CardDescription>
                    {lastOrder.status === "SERVED" && (
                      <Button
                        onClick={handleOrderAgain}
                        variant="outline"
                        size="sm"
                        className="mt-3 bg-white"
                        style={{
                          borderColor: brandColor,
                          color: brandColor,
                        }}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Pedir de nuevo
                      </Button>
                    )}
                  </div>
                </CardHeader>
              </Card>
            ) : null}
          </div>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-6">
              <MenuDisplay
                orgId={table.organization.id}
                tableToken={table.qrToken}
                onAddItem={handleAddToCart}
                onUpdateQuantity={updateQuantity}
                cartItems={cart}
                brandColor={brandColor}
              />
            </div>
          </div>
        </div>
      </div>

      {cart.length > 0 ? (
        <>
          <div className="lg:hidden fixed bottom-4 right-4 z-40">
            <Button
              className="flex items-center gap-3 rounded-full px-4 py-3 text-white shadow-lg transition hover:opacity-90"
              size="lg"
              style={{
                backgroundColor: brandColor,
                borderColor: brandColor,
              }}
              onClick={() => setShowMobileCart(true)}
            >
              <ShoppingCart className="h-5 w-5" />
              <span className="text-sm font-medium">{cartItemsCount}</span>
            </Button>
          </div>

          {showMobileCart && (
            <div
              className="lg:hidden fixed inset-0 z-50 bg-black/50"
              onClick={() => setShowMobileCart(false)}
            >
              <div
                className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[85vh] overflow-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6">
                  <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-6" />

                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold">Tu pedido</h2>
                    <span className="text-sm text-gray-500">
                      Total: ${formatPrice(cartTotalCents)}
                    </span>
                  </div>

                  <div className="space-y-4 mb-6">
                    {cart.length === 0 ? (
                      <p className="text-center text-gray-500 py-8">
                        No hay productos en el carrito
                      </p>
                    ) : (
                      cart.map((item) => (
                        <div
                          key={item.menuItemId}
                          className="flex justify-between items-start"
                        >
                          <div className="flex-1">
                            <div className="flex justify-between items-start mb-1">
                              <h4 className="font-semibold text-sm">
                                {item.name}
                              </h4>
                              <span className="font-semibold text-sm ml-2">
                                ${formatPrice(item.priceCents * item.quantity)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() =>
                                  updateQuantity(item.menuItemId, -1)
                                }
                                disabled={item.quantity <= 1}
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <span className="w-8 text-center">
                                {item.quantity}
                              </span>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() =>
                                  updateQuantity(item.menuItemId, 1)
                                }
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeItem(item.menuItemId)}
                                className="ml-2 text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="border-t pt-4 mb-4">
                    <label
                      className="text-sm font-medium"
                      htmlFor="mobile-order-notes"
                    >
                      Notas del pedido
                    </label>
                    <Textarea
                      id="mobile-order-notes"
                      placeholder="Ej: sin sal, entregar en barra"
                      value={orderNotes}
                      onChange={(e) => setOrderNotes(e.target.value)}
                      rows={3}
                      className="mt-2"
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button
                      className="flex-1"
                      onClick={() => {
                        handleSubmitOrder();
                        setShowMobileCart(false);
                      }}
                      disabled={isSubmitting}
                      style={{
                        backgroundColor: brandColor,
                        borderColor: brandColor,
                        color: "#ffffff",
                      }}
                    >
                      <Utensils className="mr-2 h-4 w-4" />
                      Confirmar
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      ) : null}

      {/* Modal de confirmación de pedido */}
      {showOrderConfirmation && lastOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md mx-auto bg-white">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-xl text-green-600">
                ¡Pedido confirmado!
              </CardTitle>
              <CardDescription>
                Tu pedido #{lastOrder.number} ha sido enviado a cocina
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">Estado actual</p>
                <div className="flex items-center justify-center gap-2">
                  {getStatusIcon(lastOrder.status)}
                  <Badge className={getStatusColor(lastOrder.status)}>
                    {getStatusText(lastOrder.status)}
                  </Badge>
                </div>
              </div>
              <p className="text-sm text-gray-600">
                Te notificaremos cuando tu pedido esté listo
              </p>
              <Button
                onClick={() => setShowOrderConfirmation(false)}
                className="w-full"
                style={{
                  backgroundColor: brandColor,
                  borderColor: brandColor,
                  color: "#ffffff",
                }}
              >
                Entendido
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
