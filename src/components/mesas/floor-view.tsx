"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  AlertCircle,
  Banknote,
  CheckCircle2,
  Clock3,
  Flame,
  Loader2,
  Percent,
  Plus,
  RefreshCcw,
  UtensilsCrossed,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { DiscountDialog } from "@/components/orders/discount-dialog";
import { PaymentDialog } from "@/components/orders/payment-dialog";

type FloorState =
  | "FREE"
  | "ORDERING"
  | "PREPARING"
  | "READY"
  | "TO_PAY"
  | "DISABLED";

type OrderStatus =
  | "DRAFT"
  | "PLACED"
  | "ACCEPTED"
  | "PREPARING"
  | "READY"
  | "SERVED"
  | "CANCELLED";

type Modifier = {
  id: string;
  groupName: string;
  name: string;
  priceDeltaC: number;
};

type Item = {
  id: string;
  name: string;
  quantity: number;
  priceC: number;
  modifiersPriceC: number;
  totalC: number;
  notes: string | null;
  status: string;
  modifiers: Modifier[];
};

type FloorOrder = {
  id: string;
  number: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  notes: string | null;
  totalC: number;
  discountsC: number;
  netDueC: number;
  paidC: number;
  tipsC: number;
  remainingC: number;
  isPaid: boolean;
  items: Item[];
};

type FloorTable = {
  id: string;
  number: number;
  zoneId: string | null;
  zone: { id: string; name: string; color: string | null } | null;
  positionX: number | null;
  positionY: number | null;
  width: number | null;
  height: number | null;
  shape: string | null;
  rotation: number | null;
  isEnabled: boolean;
  state: FloorState;
  order: FloorOrder | null;
};

type FloorZone = {
  id: string;
  name: string;
  color: string | null;
  position: number;
};

type Props = {
  orgId: string;
  orgSlug?: string;
};

const formatCurrency = (cents: number) => `S/ ${(cents / 100).toFixed(2)}`;

const stateMeta: Record<
  FloorState,
  { label: string; bg: string; border: string; text: string }
> = {
  FREE: {
    label: "Libre",
    bg: "bg-emerald-50",
    border: "border-emerald-300",
    text: "text-emerald-700",
  },
  ORDERING: {
    label: "Tomando pedido",
    bg: "bg-sky-50",
    border: "border-sky-300",
    text: "text-sky-700",
  },
  PREPARING: {
    label: "En cocina",
    bg: "bg-blue-50",
    border: "border-blue-400",
    text: "text-blue-700",
  },
  READY: {
    label: "Listo",
    bg: "bg-amber-50",
    border: "border-amber-400",
    text: "text-amber-700",
  },
  TO_PAY: {
    label: "Pago pendiente",
    bg: "bg-rose-50",
    border: "border-rose-400",
    text: "text-rose-700",
  },
  DISABLED: {
    label: "Deshabilitada",
    bg: "bg-slate-50",
    border: "border-slate-200",
    text: "text-slate-500",
  },
};

function elapsedMinutes(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
}

export function FloorView({ orgId, orgSlug }: Props) {
  const [zones, setZones] = useState<FloorZone[]>([]);
  const [tables, setTables] = useState<FloorTable[]>([]);
  const [activeZone, setActiveZone] = useState<string>("all");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [showDiscount, setShowDiscount] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [updating, setUpdating] = useState(false);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/organizations/${orgId}/floor`,
          { cache: "no-store" }
        );
        if (!response.ok) {
          const data = await response.json().catch(() => null);
          throw new Error(data?.error || "No se pudo cargar la sala");
        }
        const data = (await response.json()) as {
          zones: FloorZone[];
          tables: FloorTable[];
        };
        setZones(data.zones);
        setTables(data.tables);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Error cargando la sala";
        setError(message);
        if (!silent) toast.error(message);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [orgId]
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => load(true), 15_000);
    return () => clearInterval(interval);
  }, [autoRefresh, load]);

  const filteredTables = useMemo(() => {
    if (activeZone === "all") return tables;
    if (activeZone === "__none__")
      return tables.filter((table) => !table.zoneId);
    return tables.filter((table) => table.zoneId === activeZone);
  }, [tables, activeZone]);

  const selectedTable = useMemo(
    () => tables.find((table) => table.id === selectedTableId) ?? null,
    [tables, selectedTableId]
  );

  // Cuenta de mesas por estado para badges en los tabs
  const stateCounts = useMemo(() => {
    return filteredTables.reduce(
      (acc, table) => {
        acc[table.state] = (acc[table.state] ?? 0) + 1;
        return acc;
      },
      {} as Record<FloorState, number>
    );
  }, [filteredTables]);

  const updateOrderStatus = async (
    orderId: string,
    nextStatus: OrderStatus
  ) => {
    setUpdating(true);
    try {
      const response = await fetch(
        `/api/organizations/${orgId}/orders/${orderId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: nextStatus }),
        }
      );
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "No se pudo actualizar el pedido");
      }
      await load(true);
      toast.success("Pedido actualizado");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Error actualizando pedido"
      );
    } finally {
      setUpdating(false);
    }
  };

  const fireNextCourse = async (orderId: string) => {
    setUpdating(true);
    try {
      const response = await fetch(
        `/api/organizations/${orgId}/orders/${orderId}/fire-course`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }
      );
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "No hay cursos pendientes");
      }
      await load(true);
      toast.success("Curso disparado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={`rounded-full border px-3 py-1 text-xs ${
              activeZone === "all"
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white border-slate-300"
            }`}
            onClick={() => setActiveZone("all")}
          >
            Todas ({tables.length})
          </button>
          {zones.map((zone) => {
            const count = tables.filter((t) => t.zoneId === zone.id).length;
            const isActive = activeZone === zone.id;
            return (
              <button
                key={zone.id}
                type="button"
                onClick={() => setActiveZone(zone.id)}
                className={`flex items-center gap-1 rounded-full border px-3 py-1 text-xs ${
                  isActive
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white border-slate-300"
                }`}
              >
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: zone.color ?? "#94A3B8" }}
                />
                {zone.name} ({count})
              </button>
            );
          })}
          {tables.some((table) => !table.zoneId) ? (
            <button
              type="button"
              className={`rounded-full border px-3 py-1 text-xs ${
                activeZone === "__none__"
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white border-slate-300"
              }`}
              onClick={() => setActiveZone("__none__")}
            >
              Sin zona
            </button>
          ) : null}

          <div className="ml-auto flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Switch
                id="floor-auto"
                checked={autoRefresh}
                onCheckedChange={setAutoRefresh}
              />
              <label htmlFor="floor-auto">Auto (15s)</label>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => load()}
              disabled={loading}
              className="gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCcw className="h-4 w-4" />
              )}
              Recargar
            </Button>
          </div>
        </div>

        {error ? (
          <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          {(
            ["FREE", "ORDERING", "PREPARING", "READY", "TO_PAY", "DISABLED"] as FloorState[]
          ).map((state) => {
            const meta = stateMeta[state];
            const count = stateCounts[state] ?? 0;
            return (
              <span
                key={state}
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${meta.bg} ${meta.border} ${meta.text}`}
              >
                <span className="font-semibold">{count}</span>
                {meta.label}
              </span>
            );
          })}
        </div>

        {filteredTables.length === 0 ? (
          <div className="rounded-md border border-dashed p-12 text-center text-sm text-muted-foreground">
            No hay mesas en esta zona.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {filteredTables.map((table) => {
              const meta = stateMeta[table.state];
              const minutes = table.order
                ? elapsedMinutes(table.order.createdAt)
                : 0;
              return (
                <button
                  key={table.id}
                  type="button"
                  onClick={() => setSelectedTableId(table.id)}
                  className={`flex flex-col items-start gap-2 rounded-lg border-2 p-3 text-left shadow-sm transition hover:shadow-md ${meta.bg} ${meta.border}`}
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="text-lg font-bold">
                      Mesa {table.number}
                    </span>
                    <span className={`text-[10px] font-semibold uppercase ${meta.text}`}>
                      {meta.label}
                    </span>
                  </div>
                  {table.zone ? (
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{
                          backgroundColor: table.zone.color ?? "#94A3B8",
                        }}
                      />
                      {table.zone.name}
                    </span>
                  ) : null}
                  {table.order ? (
                    <div className="w-full space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">
                          #{table.order.number}
                        </span>
                        <span className="font-bold">
                          {formatCurrency(table.order.netDueC)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock3 className="h-3 w-3" />
                          {minutes}m
                        </span>
                        <span>
                          {table.order.items.length} ítem
                          {table.order.items.length === 1 ? "" : "s"}
                        </span>
                      </div>
                      {table.order.remainingC > 0 &&
                      table.order.status === "SERVED" ? (
                        <p className={`text-[10px] font-semibold ${meta.text}`}>
                          Saldo: {formatCurrency(table.order.remainingC)}
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">
                      {table.isEnabled
                        ? "Toca para iniciar pedido"
                        : "Mesa deshabilitada"}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <Sheet
        open={selectedTable !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedTableId(null);
        }}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          {selectedTable ? (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  Mesa {selectedTable.number}
                  {selectedTable.zone ? (
                    <Badge
                      variant="outline"
                      className="text-[10px]"
                      style={{
                        borderColor: selectedTable.zone.color ?? undefined,
                      }}
                    >
                      {selectedTable.zone.name}
                    </Badge>
                  ) : null}
                </SheetTitle>
                <SheetDescription className={stateMeta[selectedTable.state].text}>
                  {stateMeta[selectedTable.state].label}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-4 space-y-4 px-4 pb-4">
                {selectedTable.order ? (
                  <>
                    <div className="rounded-md border bg-muted/30 p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">
                          Pedido #{selectedTable.order.number}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {elapsedMinutes(selectedTable.order.createdAt)} min
                        </span>
                      </div>
                      <ul className="mt-2 space-y-1.5 text-xs">
                        {selectedTable.order.items.map((item) => (
                          <li key={item.id}>
                            <div className="flex justify-between">
                              <span>
                                {item.quantity}× {item.name}
                              </span>
                              <span className="font-semibold">
                                {formatCurrency(item.totalC)}
                              </span>
                            </div>
                            {item.modifiers.length > 0 ? (
                              <ul className="pl-3 text-[10px] text-muted-foreground">
                                {item.modifiers.map((modifier) => (
                                  <li key={modifier.id}>
                                    + {modifier.groupName}: {modifier.name}
                                  </li>
                                ))}
                              </ul>
                            ) : null}
                            {item.notes ? (
                              <p className="pl-3 text-[10px] italic text-amber-700">
                                {item.notes}
                              </p>
                            ) : null}
                          </li>
                        ))}
                      </ul>

                      <div className="mt-3 space-y-0.5 border-t pt-2 text-xs">
                        <div className="flex justify-between text-muted-foreground">
                          <span>Subtotal</span>
                          <span>
                            {formatCurrency(selectedTable.order.totalC)}
                          </span>
                        </div>
                        {selectedTable.order.discountsC > 0 ? (
                          <div className="flex justify-between text-destructive">
                            <span>Descuentos</span>
                            <span>
                              -{formatCurrency(selectedTable.order.discountsC)}
                            </span>
                          </div>
                        ) : null}
                        {selectedTable.order.paidC > 0 ? (
                          <div className="flex justify-between text-muted-foreground">
                            <span>Pagado</span>
                            <span>
                              {formatCurrency(selectedTable.order.paidC)}
                            </span>
                          </div>
                        ) : null}
                        <div className="flex justify-between border-t pt-1 font-semibold">
                          <span>Saldo</span>
                          <span
                            className={
                              selectedTable.order.remainingC === 0
                                ? "text-emerald-600"
                                : "text-amber-700"
                            }
                          >
                            {formatCurrency(selectedTable.order.remainingC)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {selectedTable.order.status === "PLACED" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          onClick={() =>
                            updateOrderStatus(
                              selectedTable.order!.id,
                              "ACCEPTED"
                            )
                          }
                          disabled={updating}
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          Aceptar
                        </Button>
                      ) : null}
                      {(selectedTable.order.status === "ACCEPTED" ||
                        selectedTable.order.status === "PREPARING") && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          onClick={() =>
                            fireNextCourse(selectedTable.order!.id)
                          }
                          disabled={updating}
                        >
                          <Flame className="h-3 w-3" />
                          Disparar curso
                        </Button>
                      )}
                      {selectedTable.order.status === "READY" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          onClick={() =>
                            updateOrderStatus(
                              selectedTable.order!.id,
                              "SERVED"
                            )
                          }
                          disabled={updating}
                        >
                          <UtensilsCrossed className="h-3 w-3" />
                          Servir
                        </Button>
                      ) : null}
                      {selectedTable.order.status !== "PREPARING" &&
                      selectedTable.order.status !== "READY" &&
                      selectedTable.order.status !== "SERVED" ? null : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          onClick={() => setShowDiscount(true)}
                          disabled={
                            updating || selectedTable.order.remainingC === 0
                          }
                        >
                          <Percent className="h-3 w-3" />
                          Descuento
                        </Button>
                      )}
                      <Button
                        size="sm"
                        className="col-span-2 gap-1"
                        onClick={() => setShowPayment(true)}
                        disabled={
                          updating || selectedTable.order.remainingC === 0
                        }
                      >
                        <Banknote className="h-3 w-3" />
                        Cobrar{" "}
                        {selectedTable.order.remainingC > 0
                          ? `(${formatCurrency(selectedTable.order.remainingC)})`
                          : ""}
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="space-y-3">
                    <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
                      No hay pedido activo en esta mesa.
                    </p>
                    <Button
                      asChild
                      className="w-full gap-2"
                      disabled={!selectedTable.isEnabled}
                    >
                      <Link
                        href={`/dashboard/pos?tableId=${selectedTable.id}`}
                        onClick={() => setSelectedTableId(null)}
                      >
                        <Plus className="h-4 w-4" />
                        Iniciar pedido aquí
                      </Link>
                    </Button>
                  </div>
                )}

                {orgSlug && selectedTable.isEnabled ? (
                  <p className="text-xs text-muted-foreground">
                    QR público:{" "}
                    <code className="rounded bg-muted px-1 py-0.5 text-[10px]">
                      /table/{selectedTable.id.slice(0, 8)}…
                    </code>
                  </p>
                ) : null}
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <DiscountDialog
        open={showDiscount}
        onOpenChange={setShowDiscount}
        orgId={orgId}
        orderId={selectedTable?.order?.id ?? null}
        netDueC={
          selectedTable?.order
            ? selectedTable.order.netDueC - selectedTable.order.paidC
            : 0
        }
        onApplied={() => load(true)}
      />

      <PaymentDialog
        open={showPayment}
        onOpenChange={setShowPayment}
        orgId={orgId}
        orderId={selectedTable?.order?.id ?? null}
        netDueC={selectedTable?.order?.netDueC ?? 0}
        paidC={selectedTable?.order?.paidC ?? 0}
        onPaid={() => load(true)}
      />
    </>
  );
}

