"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  BadgeCheck,
  Info,
  Phone,
  Send,
  Share2,
  ShoppingCart,
} from "lucide-react";
import { toast } from "sonner";

import { MenuDisplay, PublicMenuItem } from "@/components/menu/menu-display";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type CartItem = {
  menuItemId: string;
  name: string;
  priceCents: number;
  quantity: number;
};

interface PublicRestaurantMenuProps {
  restaurant: {
    id: string;
    name: string;
    slug: string;
    brandColor: string;
    accentColor: string;
    logoUrl: string | null;
    whatsappNumber: string | null;
    whatsappOrderingEnabled: boolean;
  };
}

const currencyFormatter = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  minimumFractionDigits: 2,
});

const formatPrice = (valueCents: number) =>
  currencyFormatter.format(valueCents / 100);

const DEFAULT_BRAND_COLOR = "#146E37";
const DEFAULT_ACCENT_COLOR = "#F9FAFB";
const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

const ensureHex = (value: string | null | undefined, fallback: string) =>
  value && HEX_COLOR_REGEX.test(value) ? value.toUpperCase() : fallback;

const hexToRgba = (hex: string, alpha: number) => {
  if (!HEX_COLOR_REGEX.test(hex)) {
    return `rgba(0,0,0,${alpha})`;
  }

  const normalized = hex.replace("#", "");
  const bigint = parseInt(normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const sanitizePhoneNumber = (value: string) => value.replace(/[^\d]/g, "");

export function PublicRestaurantMenu({
  restaurant,
}: PublicRestaurantMenuProps) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [notes, setNotes] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [shareUrl, setShareUrl] = useState<string>(() => {
    const base =
      typeof window !== "undefined"
        ? window.location.origin
        : process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
    return `${base}/${restaurant.slug}`;
  });
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setShareUrl(window.location.href);
    }
  }, []);

  const brandColor = ensureHex(restaurant.brandColor, DEFAULT_BRAND_COLOR);
  const accentColor = ensureHex(restaurant.accentColor, DEFAULT_ACCENT_COLOR);
  const brandSoftBackground = hexToRgba(brandColor, 0.08);
  const brandSoftBorder = hexToRgba(brandColor, 0.2);

  const handleAddToCart = (item: PublicMenuItem) => {
    setCart((prev) => {
      const existing = prev.find((entry) => entry.menuItemId === item.id);
      if (existing) {
        return prev.map((entry) =>
          entry.menuItemId === item.id
            ? { ...entry, quantity: entry.quantity + 1 }
            : entry
        );
      }
      return [
        ...prev,
        {
          menuItemId: item.id,
          name: item.name,
          priceCents: item.priceCents,
          quantity: 1,
        },
      ];
    });
  };

  const handleUpdateQuantity = (menuItemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((entry) =>
          entry.menuItemId === menuItemId
            ? { ...entry, quantity: entry.quantity + delta }
            : entry
        )
        .filter((entry) => entry.quantity > 0)
    );
  };

  const totalCents = useMemo(
    () =>
      cart.reduce(
        (acc, entry) => acc + entry.priceCents * entry.quantity,
        0
      ),
    [cart]
  );

  const buildMessage = () => {
    const lines = [
      `Hola ${restaurant.name}! Quiero realizar un pedido desde la carta pública.`,
      customerName ? `Nombre: ${customerName}` : null,
      "",
      "Pedido:",
      ...cart.map(
        (entry) =>
          `• ${entry.quantity} x ${entry.name} (${formatPrice(
            entry.priceCents
          )}) = ${formatPrice(entry.priceCents * entry.quantity)}`
      ),
      "",
      `Total estimado: ${formatPrice(totalCents)}`,
    ];

    if (notes.trim()) {
      lines.push("", `Notas: ${notes.trim()}`);
    }

    if (shareUrl) {
      lines.push("", `Pedido generado desde: ${shareUrl}`);
    }

    return lines.filter(Boolean).join("\n");
  };

  const handleSendWhatsApp = () => {
    if (!cart.length) {
      toast.error("Primero agrega productos al carrito");
      return;
    }

    if (!restaurant.whatsappOrderingEnabled) {
      toast.error("El restaurante aún no recibe pedidos por WhatsApp");
      return;
    }

    if (!restaurant.whatsappNumber) {
      toast.error("No encontramos el número de WhatsApp del restaurante");
      return;
    }

    const sanitized = sanitizePhoneNumber(restaurant.whatsappNumber);
    if (!sanitized) {
      toast.error("Número de WhatsApp inválido");
      return;
    }

    setIsSending(true);
    const url = `https://wa.me/${sanitized}?text=${encodeURIComponent(
      buildMessage()
    )}`;

    window.open(url, "_blank", "noopener,noreferrer");
    setIsSending(false);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Enlace copiado");
    } catch (error) {
      console.error("Error copying link", error);
      toast.error("No se pudo copiar el enlace");
    }
  };

  const canSend =
    restaurant.whatsappOrderingEnabled &&
    Boolean(restaurant.whatsappNumber) &&
    cart.length > 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <section className="border-b bg-white">
        <div className="container mx-auto flex flex-col gap-6 px-4 py-10 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <div
              className="flex h-20 w-20 items-center justify-center rounded-2xl border"
              style={{
                backgroundColor: accentColor,
                borderColor: brandSoftBorder,
              }}
            >
              {restaurant.logoUrl ? (
                <Image
                  src={restaurant.logoUrl}
                  alt={restaurant.name}
                  width={72}
                  height={72}
                  className="h-16 w-16 rounded-xl object-cover"
                />
              ) : (
                <BadgeCheck className="h-10 w-10 text-slate-400" />
              )}
            </div>
            <div>
              <Badge className="mb-2" style={{ backgroundColor: brandColor }}>
                Carta Premium
              </Badge>
              <h1 className="text-3xl font-semibold text-slate-900">
                {restaurant.name}
              </h1>
              <p className="text-sm text-slate-500">
                Explora el menú actualizado y envía tu pedido directo por
                WhatsApp.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={handleCopyLink}>
              <Share2 className="mr-2 h-4 w-4" />
              Copiar enlace
            </Button>
            <Badge
              variant={
                restaurant.whatsappOrderingEnabled ? "default" : "secondary"
              }
              className="flex items-center gap-1"
              style={
                restaurant.whatsappOrderingEnabled
                  ? { backgroundColor: brandSoftBackground, color: brandColor }
                  : undefined
              }
            >
              <Phone className="h-3 w-3" />
              {restaurant.whatsappOrderingEnabled
                ? "Pedidos por WhatsApp activos"
                : "WhatsApp no disponible"}
            </Badge>
          </div>
        </div>
      </section>

      <section className="container mx-auto grid gap-8 px-4 py-10 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-8">
          <Card className="border-slate-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle>Menú actualizado</CardTitle>
              <CardDescription>
                Selecciona tus platos favoritos y arma tu pedido antes de
                enviarlo por WhatsApp.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MenuDisplay
                publicSlug={restaurant.slug}
                onAddItem={handleAddToCart}
                onUpdateQuantity={handleUpdateQuantity}
                cartItems={cart.map((entry) => ({
                  menuItemId: entry.menuItemId,
                  quantity: entry.quantity,
                }))}
                brandColor={brandColor}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 lg:sticky lg:top-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ShoppingCart className="h-5 w-5 text-slate-500" />
                  Tu pedido
                </CardTitle>
                <CardDescription>
                  Revisa los platos elegidos antes de enviar.
                </CardDescription>
              </div>
              <Badge variant="outline">{cart.length} ítems</Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              {cart.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Agrega platos desde el menú para empezar.
                </p>
              ) : (
                <div className="space-y-3">
                  {cart.map((entry) => (
                    <div
                      key={entry.menuItemId}
                      className="flex items-start justify-between rounded-lg border border-slate-200 p-3 text-sm"
                    >
                      <div>
                        <p className="font-medium text-slate-900">
                          {entry.quantity}x {entry.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatPrice(entry.priceCents)} c/u
                        </p>
                      </div>
                      <p className="font-semibold text-slate-900">
                        {formatPrice(entry.priceCents * entry.quantity)}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <label
                  htmlFor="customer-name"
                  className="text-sm font-medium text-slate-700"
                >
                  Tu nombre (opcional)
                </label>
                <Input
                  id="customer-name"
                  placeholder="¿Quién realizará el pedido?"
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="order-notes"
                  className="text-sm font-medium text-slate-700"
                >
                  Notas para el restaurante
                </label>
                <Textarea
                  id="order-notes"
                  placeholder="Ej: sin picante, entregar por delivery..."
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900">
                <span>Total estimado</span>
                <span>{formatPrice(totalCents)}</span>
              </div>

              <Button
                className="w-full"
                onClick={handleSendWhatsApp}
                disabled={!canSend || isSending}
                style={{
                  backgroundColor: brandColor,
                  borderColor: brandColor,
                  color: "#ffffff",
                }}
              >
                <Send className="mr-2 h-4 w-4" />
                {isSending ? "Abriendo WhatsApp..." : "Enviar pedido por WhatsApp"}
              </Button>

              {!restaurant.whatsappOrderingEnabled ? (
                <Alert variant="destructive">
                  <AlertTitle>Pedidos no disponibles</AlertTitle>
                  <AlertDescription>
                    Este restaurante aún no recibe pedidos por WhatsApp desde su
                    carta pública.
                  </AlertDescription>
                </Alert>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Info className="h-4 w-4 text-slate-500" />
                ¿Cómo funciona?
              </CardTitle>
              <CardDescription>
                Compras sin fricción usando WhatsApp.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal space-y-3 pl-5 text-sm text-slate-600">
                <li>Explora los platos disponibles y arma tu pedido.</li>
                <li>
                  Escribe una nota opcional (delivery, sin ingredientes, etc.).
                </li>
                <li>
                  Presiona “Enviar pedido por WhatsApp” y confirma en la
                  conversación.
                </li>
                <li>El restaurante te confirmará tiempos y forma de pago.</li>
              </ol>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

