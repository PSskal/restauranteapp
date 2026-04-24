"use client";

import type { ComponentType } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  AlertCircle,
  CheckCircle2,
  ChefHat,
  CircleCheck,
  Clock3,
  Flame,
  Loader2,
  PlayCircle,
  RefreshCcw,
  RotateCcw,
  UtensilsCrossed,
  XCircle,
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
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

type OrderStatus =
  | "DRAFT"
  | "PLACED"
  | "ACCEPTED"
  | "PREPARING"
  | "READY"
  | "SERVED"
  | "CANCELLED";

type OrderItemStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "READY"
  | "SERVED"
  | "CANCELLED";

type KitchenOrderItemModifier = {
  id: string;
  groupName: string;
  name: string;
  priceDeltaC: number;
};

type KitchenStation = {
  id: string;
  name: string;
  color: string | null;
};

type KitchenOrderItem = {
  id: string;
  name: string;
  quantity: number;
  notes: string | null;
  status: OrderItemStatus;
  courseNumber: number;
  stationId: string | null;
  prepMinutes: number | null;
  firedAt: string | null;
  station: KitchenStation | null;
  modifiers: KitchenOrderItemModifier[];
};

type KitchenOrder = {
  id: string;
  number: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  notes: string | null;
  table: {
    id: string;
    number: number;
  } | null;
  items: KitchenOrderItem[];
};

const ACTIVE_STATUSES = ["ACCEPTED", "PREPARING", "READY"] as const;

const statusLabels: Record<OrderStatus, string> = {
  DRAFT: "Borrador",
  PLACED: "Nuevo",
  ACCEPTED: "Aceptado",
  PREPARING: "Preparando",
  READY: "Listo",
  SERVED: "Servido",
  CANCELLED: "Cancelado",
};

type ColumnKey = (typeof ACTIVE_STATUSES)[number];

const columnConfig: Record<
  ColumnKey,
  {
    title: string;
    description: string;
    icon: ComponentType<{ className?: string }>;
    accent: string;
  }
> = {
  ACCEPTED: {
    title: "Pedidos aceptados",
    description: "Revisados por el staff y listos para cocina",
    icon: CircleCheck,
    accent: "border-amber-200 bg-amber-50",
  },
  PREPARING: {
    title: "En preparación",
    description: "Pedidos en cocina o barra",
    icon: ChefHat,
    accent: "border-blue-200 bg-blue-50",
  },
  READY: {
    title: "Listos para servir",
    description: "Avisar a servicio o marcar como servidos",
    icon: CheckCircle2,
    accent: "border-emerald-200 bg-emerald-50",
  },
};

const statusBadgeVariants: Record<
  OrderStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  DRAFT: "secondary",
  PLACED: "default",
  ACCEPTED: "default",
  PREPARING: "default",
  READY: "default",
  SERVED: "secondary",
  CANCELLED: "destructive",
};

const itemStatusLabels: Record<OrderItemStatus, string> = {
  PENDING: "Pendiente",
  IN_PROGRESS: "En cocina",
  READY: "Listo",
  SERVED: "Servido",
  CANCELLED: "Cancelado",
};

const itemStatusBadge: Record<
  OrderItemStatus,
  { className: string; label: string }
> = {
  PENDING: {
    className: "border-slate-200 bg-slate-50 text-slate-700",
    label: itemStatusLabels.PENDING,
  },
  IN_PROGRESS: {
    className: "border-blue-200 bg-blue-50 text-blue-700",
    label: itemStatusLabels.IN_PROGRESS,
  },
  READY: {
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    label: itemStatusLabels.READY,
  },
  SERVED: {
    className: "border-gray-200 bg-gray-50 text-gray-700",
    label: itemStatusLabels.SERVED,
  },
  CANCELLED: {
    className: "border-red-200 bg-red-50 text-red-700",
    label: itemStatusLabels.CANCELLED,
  },
};

function formatTime(dateIso: string) {
  const date = new Date(dateIso);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function KitchenDashboard() {
  const { currentOrg, isLoading: orgLoading } = useOrganization();
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [stations, setStations] = useState<KitchenStation[]>([]);
  const [stationFilter, setStationFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [firingOrderId, setFiringOrderId] = useState<string | null>(null);

  const orgId = currentOrg?.id ?? null;

  const isActiveStatus = (status: OrderStatus): status is ColumnKey => {
    return (ACTIVE_STATUSES as readonly OrderStatus[]).includes(status);
  };

  const filteredOrders = useMemo(() => {
    if (stationFilter === "all") return orders;
    return orders
      .map((order) => ({
        ...order,
        items: order.items.filter((item) => {
          if (stationFilter === "__unassigned__") return !item.stationId;
          return item.stationId === stationFilter;
        }),
      }))
      .filter((order) => order.items.length > 0);
  }, [orders, stationFilter]);

  const groupedOrders = useMemo(() => {
    return filteredOrders.reduce<Record<ColumnKey, KitchenOrder[]>>(
      (acc, order) => {
        if (isActiveStatus(order.status)) {
          acc[order.status].push(order);
        }
        return acc;
      },
      {
        ACCEPTED: [],
        PREPARING: [],
        READY: [],
      }
    );
  }, [filteredOrders]);

  const fetchOrders = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!orgId) {
        setOrders([]);
        setLastUpdated(null);
        return;
      }

      if (!options?.silent) {
        setIsLoading(true);
      }

      setError(null);

      try {
        const params = new URLSearchParams();
        ACTIVE_STATUSES.forEach((status) => params.append("status", status));
        params.set("limit", "50");

        const response = await fetch(
          `/api/organizations/${orgId}/orders?${params.toString()}`,
          {
            cache: "no-store",
          }
        );

        if (!response.ok) {
          const data = (await response.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(data?.error || "No se pudieron cargar los pedidos");
        }

        const data = (await response.json()) as { orders?: KitchenOrder[] };
        setOrders(data.orders ?? []);
        setLastUpdated(new Date());
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Error desconocido al cargar pedidos";
        setError(message);
        toast.error(message);
      } finally {
        if (!options?.silent) {
          setIsLoading(false);
        }
      }
    },
    [orgId]
  );

  const fetchStations = useCallback(async () => {
    if (!orgId) return;
    try {
      const response = await fetch(
        `/api/organizations/${orgId}/kitchen-stations`
      );
      if (response.ok) {
        const data = (await response.json()) as { stations: KitchenStation[] };
        setStations(data.stations.filter((station) => station));
      }
    } catch {
      // Silencioso: el filtro "Todas" siempre funciona
    }
  }, [orgId]);

  const handleFireCourse = useCallback(
    async (orderId: string, courseNumber?: number) => {
      if (!orgId) return;
      setFiringOrderId(orderId);
      try {
        const response = await fetch(
          `/api/organizations/${orgId}/orders/${orderId}/fire-course`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(courseNumber ? { courseNumber } : {}),
          }
        );
        if (!response.ok) {
          const data = (await response.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(data?.error || "No se pudo disparar el curso");
        }
        const data = (await response.json()) as {
          courseNumber: number;
          firedCount: number;
        };
        await fetchOrders({ silent: true });
        toast.success(
          `Curso ${data.courseNumber} disparado (${data.firedCount} platos)`
        );
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Error disparando curso"
        );
      } finally {
        setFiringOrderId(null);
      }
    },
    [fetchOrders, orgId]
  );

  const handleItemStatusChange = useCallback(
    async (
      orderId: string,
      itemId: string,
      status: OrderItemStatus
    ) => {
      if (!orgId) return;
      setUpdatingItemId(itemId);
      try {
        const response = await fetch(
          `/api/organizations/${orgId}/orders/${orderId}/items/${itemId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
          }
        );
        if (!response.ok) {
          const data = (await response.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(data?.error || "No se pudo actualizar el ítem");
        }
        await fetchOrders({ silent: true });
        toast.success(`Plato: ${itemStatusLabels[status]}`);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Error al actualizar ítem"
        );
      } finally {
        setUpdatingItemId(null);
      }
    },
    [fetchOrders, orgId]
  );

  const handleOrderStatusChange = useCallback(
    async (orderId: string, status: OrderStatus) => {
      if (!orgId) return;
      setUpdatingOrderId(orderId);
      try {
        const response = await fetch(
          `/api/organizations/${orgId}/orders/${orderId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
          }
        );
        if (!response.ok) {
          const data = (await response.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(data?.error || "No se pudo actualizar el pedido");
        }
        await fetchOrders({ silent: true });
        toast.success(`Pedido ${statusLabels[status].toLowerCase()}`);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Error al actualizar pedido"
        );
      } finally {
        setUpdatingOrderId(null);
      }
    },
    [fetchOrders, orgId]
  );

  useEffect(() => {
    fetchOrders();
    fetchStations();
  }, [fetchOrders, fetchStations]);

  useEffect(() => {
    if (!autoRefresh || !orgId) {
      return;
    }

    const interval = setInterval(() => {
      fetchOrders({ silent: true });
    }, 15000);

    return () => clearInterval(interval);
  }, [autoRefresh, fetchOrders, orgId]);

  if (orgLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!orgId) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-10 text-center">
        <ChefHat className="h-8 w-8 text-muted-foreground" />
        <div>
          <p className="text-lg font-semibold">Selecciona un restaurante</p>
          <p className="text-sm text-muted-foreground">
            Elige una organización para ver los pedidos de cocina.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Vista de cocina</h1>
          <p className="text-sm text-muted-foreground">
            Control en tiempo real por plato. Marca cada ítem individualmente
            cuando esté listo.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <Switch
              id="kitchen-auto-refresh"
              checked={autoRefresh}
              onCheckedChange={setAutoRefresh}
            />
            <label htmlFor="kitchen-auto-refresh" className="text-sm">
              Actualización automática (15s)
            </label>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchOrders()}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCcw className="h-4 w-4" />
            )}
            Recargar
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        {lastUpdated ? (
          <span className="flex items-center gap-2">
            <Clock3 className="h-4 w-4" />
            Actualizado a las {formatTime(lastUpdated.toISOString())}
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Clock3 className="h-4 w-4" />
            Sin datos recientes
          </span>
        )}
        <Separator orientation="vertical" className="hidden h-4 sm:block" />
        {error ? (
          <span className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            {error}
          </span>
        ) : null}
      </div>

      {stations.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground">
            Estación:
          </span>
          <button
            type="button"
            className={`rounded-full border px-3 py-1 text-xs transition ${
              stationFilter === "all"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border hover:bg-muted"
            }`}
            onClick={() => setStationFilter("all")}
          >
            Todas
          </button>
          {stations.map((station) => {
            const isActive = stationFilter === station.id;
            return (
              <button
                key={station.id}
                type="button"
                className={`flex items-center gap-1 rounded-full border px-3 py-1 text-xs transition ${
                  isActive
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:bg-muted"
                }`}
                onClick={() => setStationFilter(station.id)}
              >
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: station.color ?? "#94A3B8" }}
                />
                {station.name}
              </button>
            );
          })}
          <button
            type="button"
            className={`rounded-full border px-3 py-1 text-xs transition ${
              stationFilter === "__unassigned__"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border hover:bg-muted"
            }`}
            onClick={() => setStationFilter("__unassigned__")}
          >
            Sin asignar
          </button>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        {ACTIVE_STATUSES.map((status) => (
          <KitchenStatusColumn
            key={status}
            status={status}
            orders={groupedOrders[status as ColumnKey]}
            updatingItemId={updatingItemId}
            updatingOrderId={updatingOrderId}
            firingOrderId={firingOrderId}
            onItemStatusChange={handleItemStatusChange}
            onOrderStatusChange={handleOrderStatusChange}
            onFireCourse={handleFireCourse}
          />
        ))}
      </div>
    </div>
  );
}

type KitchenStatusColumnProps = {
  status: ColumnKey;
  orders: KitchenOrder[];
  updatingItemId: string | null;
  updatingOrderId: string | null;
  firingOrderId: string | null;
  onItemStatusChange: (
    orderId: string,
    itemId: string,
    status: OrderItemStatus
  ) => Promise<void> | void;
  onOrderStatusChange: (
    orderId: string,
    status: OrderStatus
  ) => Promise<void> | void;
  onFireCourse: (
    orderId: string,
    courseNumber?: number
  ) => Promise<void> | void;
};

function KitchenStatusColumn({
  status,
  orders,
  updatingItemId,
  updatingOrderId,
  firingOrderId,
  onItemStatusChange,
  onOrderStatusChange,
  onFireCourse,
}: KitchenStatusColumnProps) {
  const config = columnConfig[status];
  const StatusIcon = config.icon;
  const emptyIllustrations: Record<ColumnKey, string> = {
    ACCEPTED: "Sin pedidos aceptados",
    PREPARING: "Esperando preparaciones",
    READY: "Nada listo por ahora",
  };

  return (
    <Card className={`flex h-full flex-col border-2 ${config.accent}`}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2 text-base">
          <span className="flex items-center gap-2">
            <StatusIcon className="h-4 w-4" />
            {config.title}
          </span>
          <Badge variant="secondary">{orders.length}</Badge>
        </CardTitle>
        <CardDescription>{config.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 space-y-3">
        {orders.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            <UtensilsCrossed className="h-6 w-6" />
            <span>{emptyIllustrations[status]}</span>
          </div>
        ) : (
          orders.map((order) => (
            <KitchenOrderCard
              key={order.id}
              order={order}
              updatingItemId={updatingItemId}
              updatingOrderId={updatingOrderId}
              firingOrderId={firingOrderId}
              onItemStatusChange={onItemStatusChange}
              onOrderStatusChange={onOrderStatusChange}
              onFireCourse={onFireCourse}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}

type KitchenOrderCardProps = {
  order: KitchenOrder;
  updatingItemId: string | null;
  updatingOrderId: string | null;
  firingOrderId: string | null;
  onItemStatusChange: (
    orderId: string,
    itemId: string,
    status: OrderItemStatus
  ) => Promise<void> | void;
  onOrderStatusChange: (
    orderId: string,
    status: OrderStatus
  ) => Promise<void> | void;
  onFireCourse: (
    orderId: string,
    courseNumber?: number
  ) => Promise<void> | void;
};

function KitchenOrderCard({
  order,
  updatingItemId,
  updatingOrderId,
  firingOrderId,
  onItemStatusChange,
  onOrderStatusChange,
  onFireCourse,
}: KitchenOrderCardProps) {
  const nonCancelled = order.items.filter((item) => item.status !== "CANCELLED");
  const readyCount = nonCancelled.filter(
    (item) => item.status === "READY" || item.status === "SERVED"
  ).length;
  const totalCount = nonCancelled.length;
  const progressPct =
    totalCount > 0 ? Math.round((readyCount / totalCount) * 100) : 0;
  const isOrderUpdating = updatingOrderId === order.id;
  const isFiring = firingOrderId === order.id;

  // Próximo curso pendiente de disparar
  const nextPendingCourse = nonCancelled
    .filter((item) => item.firedAt === null)
    .map((item) => item.courseNumber)
    .sort((a, b) => a - b)[0];

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4 shadow-sm transition hover:shadow-md">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Pedido #{order.number}</p>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>
              {order.table ? `Mesa ${order.table.number}` : "Para llevar"}
            </span>
            <span>•</span>
            <span>Creado {formatTime(order.createdAt)}</span>
          </div>
        </div>
        <Badge variant={statusBadgeVariants[order.status]}>
          {statusLabels[order.status]}
        </Badge>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {readyCount}/{totalCount} platos listos
          </span>
          <span>{progressPct}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-emerald-500 transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      <div className="space-y-2">
        {order.items.map((item) => {
          const badge = itemStatusBadge[item.status];
          const isItemUpdating = updatingItemId === item.id;
          const disabled = isItemUpdating || isOrderUpdating;
          const isWaitingFire = item.firedAt === null;

          return (
            <div
              key={item.id}
              className={`space-y-2 rounded-md p-2 ${
                isWaitingFire ? "bg-slate-100" : "bg-muted/40"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {item.quantity}x {item.name}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-1">
                    <Badge
                      variant="outline"
                      className="border-slate-300 bg-white px-1.5 py-0 text-[10px]"
                    >
                      {item.courseNumber}º curso
                    </Badge>
                    {item.station ? (
                      <Badge
                        variant="outline"
                        className="border px-1.5 py-0 text-[10px]"
                        style={{
                          borderColor: item.station.color ?? "#94A3B8",
                          color: item.station.color ?? "#475569",
                        }}
                      >
                        {item.station.name}
                      </Badge>
                    ) : null}
                    {item.status === "IN_PROGRESS" &&
                    item.firedAt &&
                    item.prepMinutes ? (
                      <PrepCountdown
                        firedAt={item.firedAt}
                        prepMinutes={item.prepMinutes}
                      />
                    ) : null}
                  </div>
                  {item.modifiers.length > 0 ? (
                    <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                      {item.modifiers.map((modifier) => (
                        <li key={modifier.id}>
                          <span className="font-medium">
                            {modifier.groupName}:
                          </span>{" "}
                          {modifier.name}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {item.notes ? (
                    <p className="mt-1 text-xs italic text-amber-700">
                      Nota: {item.notes}
                    </p>
                  ) : null}
                </div>
                <Badge variant="outline" className={badge.className}>
                  {isWaitingFire ? "Esperando disparo" : badge.label}
                </Badge>
              </div>

              <div className="flex flex-wrap gap-1">
                {item.status === "PENDING" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1 text-xs"
                    onClick={() =>
                      onItemStatusChange(order.id, item.id, "IN_PROGRESS")
                    }
                    disabled={disabled}
                  >
                    {isItemUpdating ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <PlayCircle className="h-3 w-3" />
                    )}
                    Iniciar
                  </Button>
                ) : null}

                {(item.status === "PENDING" ||
                  item.status === "IN_PROGRESS") && (
                  <Button
                    size="sm"
                    className="h-7 gap-1 text-xs"
                    onClick={() =>
                      onItemStatusChange(order.id, item.id, "READY")
                    }
                    disabled={disabled}
                  >
                    {isItemUpdating ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-3 w-3" />
                    )}
                    Marcar listo
                  </Button>
                )}

                {item.status === "READY" ? (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1 text-xs"
                      onClick={() =>
                        onItemStatusChange(order.id, item.id, "IN_PROGRESS")
                      }
                      disabled={disabled}
                    >
                      <RotateCcw className="h-3 w-3" />
                      Reabrir
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1 text-xs"
                      onClick={() =>
                        onItemStatusChange(order.id, item.id, "SERVED")
                      }
                      disabled={disabled}
                    >
                      <UtensilsCrossed className="h-3 w-3" />
                      Servido
                    </Button>
                  </>
                ) : null}

                {item.status !== "CANCELLED" && item.status !== "SERVED" ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 gap-1 text-xs text-destructive"
                    onClick={() =>
                      onItemStatusChange(order.id, item.id, "CANCELLED")
                    }
                    disabled={disabled}
                  >
                    <XCircle className="h-3 w-3" />
                    Anular
                  </Button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {order.notes ? (
        <div className="rounded-md bg-amber-50 p-3 text-xs text-amber-800">
          <p className="font-semibold">Nota adicional</p>
          <p className="mt-1 whitespace-pre-wrap">{order.notes}</p>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {nextPendingCourse ? (
          <Button
            size="sm"
            variant="outline"
            className="flex items-center gap-2 border-orange-300 bg-orange-50 text-orange-800 hover:bg-orange-100"
            onClick={() => onFireCourse(order.id, nextPendingCourse)}
            disabled={isFiring || isOrderUpdating}
          >
            {isFiring ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Flame className="h-4 w-4" />
            )}
            Fire curso {nextPendingCourse}
          </Button>
        ) : null}
        {order.status !== "READY" && progressPct === 100 && totalCount > 0 ? (
          <Button
            size="sm"
            onClick={() => onOrderStatusChange(order.id, "READY")}
            disabled={isOrderUpdating}
            className="flex items-center gap-2"
          >
            {isOrderUpdating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Marcar pedido listo
          </Button>
        ) : null}
        {order.status === "READY" ? (
          <Button
            size="sm"
            onClick={() => onOrderStatusChange(order.id, "SERVED")}
            disabled={isOrderUpdating}
            className="flex items-center gap-2"
          >
            {isOrderUpdating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UtensilsCrossed className="h-4 w-4" />
            )}
            Servido
          </Button>
        ) : null}
        <Button
          size="sm"
          variant="outline"
          onClick={() => onOrderStatusChange(order.id, "CANCELLED")}
          disabled={isOrderUpdating}
          className="flex items-center gap-2"
        >
          <XCircle className="h-4 w-4" />
          Cancelar pedido
        </Button>
      </div>
    </div>
  );
}

function PrepCountdown({
  firedAt,
  prepMinutes,
}: {
  firedAt: string;
  prepMinutes: number;
}) {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 10_000);
    return () => clearInterval(interval);
  }, []);

  const firedMs = new Date(firedAt).getTime();
  const targetMs = firedMs + prepMinutes * 60_000;
  const diffMs = targetMs - now;
  const overdue = diffMs < 0;
  const minutes = Math.floor(Math.abs(diffMs) / 60_000);
  const seconds = Math.floor((Math.abs(diffMs) % 60_000) / 1000);
  const label = `${minutes}:${String(seconds).padStart(2, "0")}`;

  return (
    <Badge
      variant="outline"
      className={`px-1.5 py-0 text-[10px] ${
        overdue
          ? "border-red-300 bg-red-50 text-red-700"
          : minutes < 2
            ? "border-amber-300 bg-amber-50 text-amber-700"
            : "border-slate-300 bg-white text-slate-700"
      }`}
    >
      <Clock3 className="mr-0.5 h-2.5 w-2.5" />
      {overdue ? `+${label}` : label}
    </Badge>
  );
}
