"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  AlertCircle,
  CheckCircle2,
  CircleCheck,
  ChefHat,
  ClipboardList,
  DollarSign,
  Loader2,
  Plus,
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
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";

type OrderStatus =
  | "DRAFT"
  | "PLACED"
  | "ACCEPTED"
  | "PREPARING"
  | "READY"
  | "SERVED"
  | "CANCELLED";

type StaffOrderItem = {
  id: string;
  name: string;
  quantity: number;
  priceC: number;
  totalC: number;
  notes: string | null;
};

type StaffOrder = {
  id: string;
  number: number;
  status: OrderStatus;
  totalC: number;
  createdAt: string;
  updatedAt: string;
  notes: string | null;
  table: {
    id: string;
    number: number;
  } | null;
  items: StaffOrderItem[];
};

type Metrics = {
  total: number;
  active: number;
  byStatus: Record<OrderStatus, number>;
  servedRevenueCents: number;
};

const statusLabels: Record<OrderStatus, string> = {
  DRAFT: "Borrador",
  PLACED: "Nuevo",
  ACCEPTED: "Aceptado",
  PREPARING: "Preparando",
  READY: "Listo",
  SERVED: "Servido",
  CANCELLED: "Cancelado",
};
const statusBadgeVariants: Record<OrderStatus, "default" | "secondary" | "destructive" | "outline"> = {
  DRAFT: "secondary",
  PLACED: "default",
  ACCEPTED: "default",
  PREPARING: "default",
  READY: "default",
  SERVED: "secondary",
  CANCELLED: "destructive",
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

const statusIcons: Partial<Record<OrderStatus, JSX.Element>> = {
  PLACED: <Plus className="h-4 w-4" />,
  ACCEPTED: <CircleCheck className="h-4 w-4" />,
  PREPARING: <ChefHat className="h-4 w-4" />,
  READY: <CheckCircle2 className="h-4 w-4" />,
  SERVED: <UtensilsCrossed className="h-4 w-4" />,
  CANCELLED: <XCircle className="h-4 w-4" />,
};
const ACTIVE_STATUSES: OrderStatus[] = ["PLACED", "ACCEPTED", "PREPARING", "READY"];

const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`;

function formatTime(dateIso: string) {
  const date = new Date(dateIso);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function OrdersDashboard() {
  const { currentOrg, isLoading: isOrgLoading } = useOrganization();
  const [orders, setOrders] = useState<StaffOrder[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const currentOrgId = currentOrg?.id ?? null;

  const fetchOrders = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!currentOrgId) {
        return;
      }

      const silent = options?.silent ?? false;

      if (!silent) {
        setIsLoading(true);
      }

      try {
        setError(null);
        const response = await fetch(
          `/api/organizations/${currentOrgId}/orders?limit=50`,
          {
            cache: "no-store",
          }
        );

        if (!response.ok) {
          const data = await response.json().catch(() => null);
          const message = data?.error || "No pudimos cargar los pedidos";
          throw new Error(message);
        }

        const data = await response.json();
        setOrders(data.orders ?? []);
        setMetrics(data.metrics ?? null);
        setLastUpdated(new Date());
      } catch (requestError) {
        console.error("Error loading orders:", requestError);
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Error al cargar los pedidos"
        );
      } finally {
        if (!silent) {
          setIsLoading(false);
        }
      }
    },
    [currentOrgId]
  );

  useEffect(() => {
    if (!currentOrgId) {
      return;
    }
    fetchOrders();
  }, [currentOrgId, fetchOrders]);

  useEffect(() => {
    if (!autoRefresh || !currentOrgId) {
      return;
    }

    const interval = setInterval(() => {
      fetchOrders({ silent: true });
    }, 1000 * 10);

    return () => {
      clearInterval(interval);
    };
  }, [autoRefresh, currentOrgId, fetchOrders]);

  const ordersByStatus = useMemo(() => {
    const grouped: Record<OrderStatus, StaffOrder[]> = {
      DRAFT: [],
      PLACED: [],
      ACCEPTED: [],
      PREPARING: [],
      READY: [],
      SERVED: [],
      CANCELLED: [],
    };
    orders.forEach((order) => {
      grouped[order.status].push(order);
    });

    return grouped;
  }, [orders]);

  const handleStatusUpdate = useCallback(
    async (orderId: string, nextStatus: OrderStatus) => {
      if (!currentOrgId) {
        return;
      }

      setUpdatingOrderId(orderId);

      try {
        const response = await fetch(
          `/api/organizations/${currentOrgId}/orders/${orderId}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ status: nextStatus }),
          }
        );

        if (!response.ok) {
          const body = await response.json().catch(() => null);
          const message = body?.error || "No pudimos actualizar el pedido";
          throw new Error(message);
        }

        toast.success(`Pedido actualizado a ${statusLabels[nextStatus]}`);
        await fetchOrders({ silent: true });
      } catch (updateError) {
        console.error("Error updating order:", updateError);
        toast.error(
          updateError instanceof Error
            ? updateError.message
            : "Error al actualizar el pedido"
        );
      } finally {
        setUpdatingOrderId(null);
      }
    },
    [currentOrgId, fetchOrders]
  );

  const activeCounts = ACTIVE_STATUSES.reduce((acc, status) => {
    return acc + ordersByStatus[status].length;
  }, 0);

  if (isOrgLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!currentOrgId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Selecciona un restaurante</CardTitle>
          <CardDescription>
            Elige una organizacion en el selector lateral para ver los pedidos.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Pedidos en curso
          </h1>
          <p className="text-sm text-muted-foreground">
            Gestiona los pedidos que llegan desde los QR de las mesas.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Switch
              id="orders-autorefresh"
              checked={autoRefresh}
              onCheckedChange={setAutoRefresh}
            />
            <label htmlFor="orders-autorefresh">Auto actualizar</label>
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
            Actualizar
          </Button>
        </div>
      </div>

      {metrics ? (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total pedidos</CardTitle>\n              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.total}</div>
              <p className="text-xs text-muted-foreground">
                Historial completo del restaurante
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">En curso</CardTitle>
              <ChefHat className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.active}</div>
              <p className="text-xs text-muted-foreground">
                Pendientes de ser servidos
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Servidos</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metrics.byStatus.SERVED ?? 0}
              </div>
              <p className="text-xs text-muted-foreground">Pedidos completados</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ingresos</CardTitle>\n              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(metrics.servedRevenueCents)}
              </div>
              <p className="text-xs text-muted-foreground">
                Total acumulado de pedidos servidos
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {error ? (
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="flex flex-row items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <div>
              <CardTitle className="text-base text-red-600">Error</CardTitle>
              <CardDescription className="text-red-600">
                {error}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm" onClick={() => fetchOrders()}>
              Reintentar
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          Actualizados: {lastUpdated ? formatTime(lastUpdated.toISOString()) : "--"}
        </span>
        <span>Pedidos activos: {activeCounts}</span>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {ACTIVE_STATUSES.map((status) => (
          <OrderColumn
            key={status}
            title={statusLabels[status]}
            description={columnDescription(status)}
            orders={ordersByStatus[status]}
            onStatusChange={handleStatusUpdate}
            updatingOrderId={updatingOrderId}
          />
        ))}
      </div>

      <HistorySection
        served={ordersByStatus.SERVED}
        cancelled={ordersByStatus.CANCELLED}
      />
    </div>
  );
}

function columnDescription(status: OrderStatus) {
  switch (status) {
    case "PLACED":
      return "Pedidos nuevos esperando confirmacion.";
    case "ACCEPTED":
      return "Confirmados por staff, listos para cocina.";
    case "PREPARING":
      return "En cocina / barra.";
    case "READY":
      return "Listos para servir.";
    default:
      return "";
  }
}
type OrderColumnProps = {
  title: string;
  description: string;
  orders: StaffOrder[];
  updatingOrderId: string | null;
  onStatusChange: (orderId: string, status: OrderStatus) => void;
};

function OrderColumn({
  title,
  description,
  orders,
  updatingOrderId,
  onStatusChange,
}: OrderColumnProps) {
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {orders.length === 0 ? (
          <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
            Sin pedidos en esta etapa
          </div>
        ) : (
          orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              updating={updatingOrderId === order.id}
              onStatusChange={onStatusChange}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}

type OrderCardProps = {
  order: StaffOrder;
  updating: boolean;
  onStatusChange: (orderId: string, status: OrderStatus) => void;
};

function OrderCard({ order, updating, onStatusChange }: OrderCardProps) {
  const nextStatuses = statusTransitions[order.status] || [];

  return (
    <div className="space-y-4 rounded-xl border p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">Pedido #{order.number}</h3>
            <Badge variant={statusBadgeVariants[order.status]}>
              {statusLabels[order.status]}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {order.table ? `Mesa ${order.table.number}` : "Sin mesa"} •
            &nbsp;{formatTime(order.createdAt)}
          </p>
        </div>
        <div className="text-right font-semibold text-green-600">
          {formatCurrency(order.totalC)}
        </div>
      </div>

      {order.items.length > 0 ? (
        <div className="space-y-2 text-sm">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between gap-3">
              <div>
                <span className="font-medium">{item.quantity}x {item.name}</span>
                {item.notes ? (
                  <p className="text-xs text-muted-foreground">Nota: {item.notes}</p>
                ) : null}
              </div>
              <span>{formatCurrency(item.totalC)}</span>
            </div>
          ))}
        </div>
      ) : null}

      {order.notes ? (
        <div className="rounded-md bg-yellow-50 p-3 text-sm">
          <p className="font-medium">Notas del cliente</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">{order.notes}</p>
        </div>
      ) : null}

      {nextStatuses.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {nextStatuses.map((status) => (
            <Button
              key={status}
              size="sm"
              variant={status === "CANCELLED" ? "outline" : "default"}
              className="flex items-center gap-2"
              onClick={() => onStatusChange(order.id, status)}
              disabled={updating}
            >
              {updating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                statusIcons[status] ?? <Plus className="h-4 w-4" />
              )}
              {status === "CANCELLED" ? "Cancelar" : status === "ACCEPTED" ? "Aceptar" : statusLabels[status]}
            </Button>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Estado final alcanzado.
        </p>
      )}
    </div>
  );
}

type HistorySectionProps = {
  served: StaffOrder[];
  cancelled: StaffOrder[];
};

function HistorySection({ served, cancelled }: HistorySectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Historial reciente</CardTitle>
        <CardDescription>
          Ultimos pedidos completados o cancelados (maximo 10)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {served.length === 0 && cancelled.length === 0 ? (
          <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
            Aun no hay historial para mostrar
          </div>
        ) : (
          <div className="grid gap-3">
            {[...served, ...cancelled]
              .sort(
                (a, b) =>
                  new Date(b.updatedAt).getTime() -
                  new Date(a.updatedAt).getTime()
              )
              .slice(0, 10)
              .map((order) => (
                <div
                  key={order.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">
                        Pedido #{order.number}
                      </span>
                      <Badge variant={statusBadgeVariants[order.status]}>
                        {statusLabels[order.status]}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {order.table ? `Mesa ${order.table.number}` : "Sin mesa"} •
                      &nbsp;{formatTime(order.updatedAt)}
                    </p>
                  </div>
                  <span className="text-sm font-medium text-green-600">
                    {formatCurrency(order.totalC)}
                  </span>
                </div>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}































