"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Bike,
  CheckCircle2,
  Loader2,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ModifierPickerDialog,
  type ModifierPickerItem,
  type ModifierSelection,
} from "@/components/pos/modifier-picker-dialog";

type ModifierGroupDTO = {
  id: string;
  name: string;
  required: boolean;
  minSelect: number;
  maxSelect: number;
  modifiers: { id: string; name: string; priceDeltaC: number }[];
};

type MenuItemDTO = {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  imageUrl: string | null;
  outOfStock: boolean;
  categoryId: string;
  modifierGroups: ModifierGroupDTO[];
};

type Props = {
  restaurant: {
    id: string;
    name: string;
    slug: string;
    phone: string | null;
    address: string | null;
    pickupEnabled: boolean;
    deliveryEnabled: boolean;
    branding: { brandColor: string; accentColor: string; logoUrl: string | null } | null;
  };
  categories: { id: string; name: string; position: number }[];
  menuItems: MenuItemDTO[];
};

type CartLine = {
  lineId: string;
  menuItemId: string;
  name: string;
  priceCents: number;
  quantity: number;
  modifiers: ModifierSelection[];
  modifiersPriceC: number;
  notes?: string;
};

type Kind = "PICKUP" | "DELIVERY";

const formatCurrency = (cents: number) => `S/ ${(cents / 100).toFixed(2)}`;

export function OnlineOrderClient({ restaurant, categories, menuItems }: Props) {
  const defaultKind: Kind = restaurant.pickupEnabled ? "PICKUP" : "DELIVERY";

  const [kind, setKind] = useState<Kind>(defaultKind);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [picker, setPicker] = useState<MenuItemDTO | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmedNumber, setConfirmedNumber] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const filteredItems = useMemo(() => {
    if (selectedCategory === "all") return menuItems;
    return menuItems.filter((item) => item.categoryId === selectedCategory);
  }, [menuItems, selectedCategory]);

  const cartCount = cart.reduce((sum, line) => sum + line.quantity, 0);
  const cartTotalC = cart.reduce(
    (sum, line) => sum + (line.priceCents + line.modifiersPriceC) * line.quantity,
    0
  );

  const addItem = (item: MenuItemDTO) => {
    if (item.outOfStock) {
      toast.error(`"${item.name}" está agotado hoy`);
      return;
    }
    if (item.modifierGroups.length > 0) {
      setPicker(item);
      return;
    }
    commit(item, [], 1);
  };

  const commit = (
    item: MenuItemDTO,
    modifiers: ModifierSelection[],
    quantity: number,
    notes?: string
  ) => {
    const modifiersPriceC = modifiers.reduce(
      (sum, m) => sum + m.priceDeltaC,
      0
    );
    const modifierKey = modifiers
      .map((m) => m.modifierId)
      .slice()
      .sort()
      .join("|");

    setCart((prev) => {
      const existing = prev.findIndex(
        (entry) =>
          entry.menuItemId === item.id &&
          entry.modifiers
            .map((m) => m.modifierId)
            .slice()
            .sort()
            .join("|") === modifierKey &&
          (entry.notes ?? "") === (notes ?? "")
      );
      if (existing >= 0 && modifiers.length === 0 && !notes) {
        return prev.map((entry, idx) =>
          idx === existing
            ? { ...entry, quantity: entry.quantity + quantity }
            : entry
        );
      }
      return [
        ...prev,
        {
          lineId: `${item.id}-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 7)}`,
          menuItemId: item.id,
          name: item.name,
          priceCents: item.priceCents,
          quantity,
          modifiers,
          modifiersPriceC,
          notes,
        },
      ];
    });
  };

  const inc = (lineId: string) =>
    setCart((prev) =>
      prev.map((line) =>
        line.lineId === lineId ? { ...line, quantity: line.quantity + 1 } : line
      )
    );
  const dec = (lineId: string) =>
    setCart((prev) =>
      prev
        .map((line) =>
          line.lineId === lineId
            ? { ...line, quantity: Math.max(0, line.quantity - 1) }
            : line
        )
        .filter((line) => line.quantity > 0)
    );

  const submit = async () => {
    if (cart.length === 0) {
      toast.error("Agrega al menos un producto");
      return;
    }
    if (name.trim().length < 2) {
      toast.error("Nombre requerido");
      return;
    }
    if (phone.trim().length < 6) {
      toast.error("Teléfono requerido");
      return;
    }
    if (kind === "DELIVERY" && address.trim().length < 5) {
      toast.error("Dirección requerida para delivery");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(
        `/api/public/orgs/${restaurant.slug}/orders`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind,
            customerName: name.trim(),
            customerPhone: phone.trim(),
            customerEmail: email.trim() || undefined,
            deliveryAddress:
              kind === "DELIVERY" ? address.trim() : undefined,
            notes: orderNotes.trim() || undefined,
            items: cart.map((line) => ({
              menuItemId: line.menuItemId,
              quantity: line.quantity,
              notes: line.notes || undefined,
              modifierIds: line.modifiers.map((m) => m.modifierId),
            })),
          }),
        }
      );

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || "No pudimos enviar el pedido");
      }
      setConfirmedNumber(data.order?.number ?? 0);
      setCart([]);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error enviando pedido"
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (confirmedNumber !== null) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
        <CheckCircle2 className="h-16 w-16 text-emerald-500" />
        <h1 className="text-2xl font-bold">¡Pedido recibido!</h1>
        <p className="text-muted-foreground">
          Tu pedido <strong>#{confirmedNumber}</strong> en {restaurant.name} se
          envió a la cocina. Te contactaremos al{" "}
          <span className="font-medium">{phone}</span>.
        </p>
        <Button
          onClick={() => {
            setConfirmedNumber(null);
            setName("");
            setPhone("");
            setEmail("");
            setAddress("");
            setOrderNotes("");
          }}
        >
          Pedir otra vez
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white px-4 py-4 shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">{restaurant.name}</h1>
            <p className="text-xs text-muted-foreground">
              Pedidos online · {restaurant.phone ?? ""}
            </p>
          </div>
          <div className="flex gap-1 rounded-full bg-slate-100 p-1">
            {restaurant.pickupEnabled ? (
              <button
                type="button"
                className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs ${
                  kind === "PICKUP"
                    ? "bg-white shadow font-semibold"
                    : "text-slate-600"
                }`}
                onClick={() => setKind("PICKUP")}
              >
                <ShoppingBag className="h-3 w-3" />
                Recoger
              </button>
            ) : null}
            {restaurant.deliveryEnabled ? (
              <button
                type="button"
                className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs ${
                  kind === "DELIVERY"
                    ? "bg-white shadow font-semibold"
                    : "text-slate-600"
                }`}
                onClick={() => setKind("DELIVERY")}
              >
                <Bike className="h-3 w-3" />
                Delivery
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-6 p-4 lg:grid-cols-[1fr_360px]">
        <section className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedCategory("all")}
              className={`rounded-full border px-3 py-1 text-xs ${
                selectedCategory === "all"
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white border-slate-300"
              }`}
            >
              Todo
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setSelectedCategory(category.id)}
                className={`rounded-full border px-3 py-1 text-xs ${
                  selectedCategory === category.id
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white border-slate-300"
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {filteredItems.map((item) => (
              <article
                key={item.id}
                className={`rounded-lg border bg-white p-3 ${
                  item.outOfStock ? "opacity-60" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <h3 className="font-semibold">{item.name}</h3>
                    {item.description ? (
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                        {item.description}
                      </p>
                    ) : null}
                    <p className="mt-2 font-bold">
                      {formatCurrency(item.priceCents)}
                    </p>
                  </div>
                  {item.outOfStock ? (
                    <span className="rounded bg-red-50 px-2 py-1 text-[10px] font-semibold text-red-700">
                      Agotado
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => addItem(item)}
                      className="gap-1"
                    >
                      <Plus className="h-3 w-3" />
                      {item.modifierGroups.length > 0 ? "Elegir" : "Agregar"}
                    </Button>
                  )}
                </div>
              </article>
            ))}
            {filteredItems.length === 0 ? (
              <p className="col-span-full rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                Sin productos en esta categoría.
              </p>
            ) : null}
          </div>
        </section>

        <aside className="rounded-lg border bg-white p-4">
          <h2 className="text-lg font-bold">Tu pedido ({cartCount})</h2>
          {cart.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Aún no agregaste productos.
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {cart.map((line) => (
                <li key={line.lineId} className="text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{line.name}</p>
                      {line.modifiers.length > 0 ? (
                        <ul className="mt-0.5 text-xs text-muted-foreground">
                          {line.modifiers.map((m) => (
                            <li key={m.modifierId}>+ {m.name}</li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                    <span className="font-semibold">
                      {formatCurrency(
                        (line.priceCents + line.modifiersPriceC) * line.quantity
                      )}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => dec(line.lineId)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-6 text-center text-xs">
                      {line.quantity}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => inc(line.lineId)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="ml-auto h-6 w-6 text-destructive"
                      onClick={() => dec(line.lineId)}
                      title="Quitar uno"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 flex items-center justify-between border-t pt-3">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="text-lg font-bold">
              {formatCurrency(cartTotalC)}
            </span>
          </div>

          {cart.length > 0 ? (
            <div className="mt-4 space-y-3 border-t pt-3">
              <div>
                <Label htmlFor="name" className="text-xs">
                  Nombre
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={submitting}
                  maxLength={80}
                />
              </div>
              <div>
                <Label htmlFor="phone" className="text-xs">
                  Teléfono
                </Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  type="tel"
                  disabled={submitting}
                  maxLength={30}
                />
              </div>
              <div>
                <Label htmlFor="email" className="text-xs">
                  Email (opcional)
                </Label>
                <Input
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  disabled={submitting}
                />
              </div>
              {kind === "DELIVERY" ? (
                <div>
                  <Label htmlFor="address" className="text-xs">
                    Dirección
                  </Label>
                  <Textarea
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    disabled={submitting}
                    rows={2}
                    maxLength={300}
                  />
                </div>
              ) : null}
              <div>
                <Label htmlFor="notes" className="text-xs">
                  Notas para el restaurante
                </Label>
                <Textarea
                  id="notes"
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  rows={2}
                  maxLength={300}
                  disabled={submitting}
                />
              </div>
              <Button
                className="w-full"
                onClick={submit}
                disabled={submitting}
              >
                {submitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Confirmar pedido — {formatCurrency(cartTotalC)}
              </Button>
            </div>
          ) : null}
        </aside>
      </main>

      <ModifierPickerDialog
        item={
          picker
            ? ({
                id: picker.id,
                name: picker.name,
                priceCents: picker.priceCents,
                modifierGroups: picker.modifierGroups.map((group) => ({
                  id: group.id,
                  name: group.name,
                  required: group.required,
                  minSelect: group.minSelect,
                  maxSelect: group.maxSelect,
                  position: 0,
                  modifiers: group.modifiers.map((modifier) => ({
                    id: modifier.id,
                    name: modifier.name,
                    priceDeltaC: modifier.priceDeltaC,
                  })),
                })),
              } satisfies ModifierPickerItem)
            : null
        }
        open={picker !== null}
        onOpenChange={(open) => {
          if (!open) setPicker(null);
        }}
        onConfirm={({ modifiers, quantity, notes }) => {
          if (!picker) return;
          commit(picker, modifiers, quantity, notes);
          setPicker(null);
        }}
      />
    </div>
  );
}
