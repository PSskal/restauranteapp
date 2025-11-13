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
  Loader2,
  RefreshCcw,
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
type KitchenOrderItem = {
  id: string;
  name: string;
  quantity: number;
  notes: string | null;
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
const statusTransitions: Record<OrderStatus, OrderStatus[]> = {
  DRAFT: ["PLACED", "CANCELLED"],
  PLACED: ["ACCEPTED", "CANCELLED"],
  ACCEPTED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["SERVED", "CANCELLED"],
  SERVED: [],
  CANCELLED: [],
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
    title: "En preparacion",
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
function formatTime(dateIso: string) {
  const date = new Date(dateIso);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function KitchenDashboard() {
  const { currentOrg, isLoading: orgLoading } = useOrganization();
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  const orgId = currentOrg?.id ?? null;

  const isActiveStatus = (status: OrderStatus): status is ColumnKey => {
    return (ACTIVE_STATUSES as readonly OrderStatus[]).includes(status);
  };

  const groupedOrders = useMemo(() => {
    return orders.reduce<Record<ColumnKey, KitchenOrder[]>>(
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
  }, [orders]);

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

  const handleStatusChange = useCallback(
    async (orderId: string, status: OrderStatus) => {
      if (!orgId) {
        return;
      }

      setUpdatingOrderId(orderId);

      try {
        const response = await fetch(
          `/api/organizations/${orgId}/orders/${orderId}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
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
        toast.success(`Pedido actualizado a ${statusLabels[status]}`);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Error desconocido al actualizar";
        toast.error(message);
      } finally {
        setUpdatingOrderId(null);
      }
    },
    [fetchOrders, orgId]
  );

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

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
            Elige una organizacion para ver los pedidos de cocina.
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
            Control en tiempo real de pedidos activos.
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
              Actualizacion automatica (15s)
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

      <div className="grid gap-4 lg:grid-cols-3">
        {ACTIVE_STATUSES.map((status) => (
          <KitchenStatusColumn
            key={status}
            status={status}
            orders={groupedOrders[status as ColumnKey]}
            onStatusChange={handleStatusChange}
            updatingOrderId={updatingOrderId}
          />
        ))}
      </div>
    </div>
  );
}

type KitchenStatusColumnProps = {
  status: ColumnKey;
  orders: KitchenOrder[];
  updatingOrderId: string | null;
  onStatusChange: (
    orderId: string,
    status: OrderStatus
  ) => Promise<void> | void;
};

function KitchenStatusColumn({
  status,
  orders,
  updatingOrderId,
  onStatusChange,
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
              updatingOrderId={updatingOrderId}
              onStatusChange={onStatusChange}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}

type KitchenOrderCardProps = {
  order: KitchenOrder;
  updatingOrderId: string | null;
  onStatusChange: (
    orderId: string,
    status: OrderStatus
  ) => Promise<void> | void;
};

function KitchenOrderCard({
  order,
  updatingOrderId,
  onStatusChange,
}: KitchenOrderCardProps) {
  const nextStatuses = statusTransitions[order.status] || [];
  const primaryStatus = nextStatuses.find((status) => status !== "CANCELLED");
  const canCancel = nextStatuses.includes("CANCELLED");
  const isUpdating = updatingOrderId === order.id;

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4 shadow-sm transition hover:shadow-md">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Pedido #{order.number}</p>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>
              {order.table ? `Mesa ${order.table.number}` : "Para llevar"}
            </span>
            <span>&bull;</span>
            <span>Creado {formatTime(order.createdAt)}</span>
          </div>
        </div>
        <Badge variant={statusBadgeVariants[order.status]}>
          {statusLabels[order.status]}
        </Badge>
      </div>

      <div className="space-y-2">
        {order.items.map((item) => (
          <div key={item.id} className="rounded-md bg-muted/40 p-2">
            <p className="text-sm font-medium">
              {item.quantity}x {item.name}
            </p>
            {item.notes ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Nota: {item.notes}
              </p>
            ) : null}
          </div>
        ))}
      </div>

      {order.notes ? (
        <div className="rounded-md bg-amber-50 p-3 text-xs text-amber-800">
          <p className="font-semibold">Nota adicional</p>
          <p className="mt-1 whitespace-pre-wrap">{order.notes}</p>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {primaryStatus ? (
          <Button
            size="sm"
            onClick={() => onStatusChange(order.id, primaryStatus)}
            disabled={isUpdating}
            className="flex items-center gap-2"
          >
            {isUpdating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {statusLabels[primaryStatus]}
          </Button>
        ) : null}
        {canCancel ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onStatusChange(order.id, "CANCELLED")}
            disabled={isUpdating}
            className="flex items-center gap-2"
          >
            {isUpdating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            Cancelar
          </Button>
        ) : null}
      </div>
    </div>
  );
}
