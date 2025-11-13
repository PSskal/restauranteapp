"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
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
import { fetcher } from "@/lib/utils";
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
  isPaid: boolean;
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

type OrdersResponse = {
  orders: StaffOrder[];
  metrics: Metrics;
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
const statusTransitions: Record<OrderStatus, OrderStatus[]> = {
  DRAFT: ["PLACED", "CANCELLED"],
  PLACED: ["ACCEPTED", "CANCELLED"],
  ACCEPTED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["SERVED", "CANCELLED"],
  SERVED: [],
  CANCELLED: [],
};

const statusIcons: Partial<Record<OrderStatus, React.ReactElement>> = {
  PLACED: <Plus className="h-4 w-4" />,
  ACCEPTED: <CircleCheck className="h-4 w-4" />,
  PREPARING: <ChefHat className="h-4 w-4" />,
  READY: <CheckCircle2 className="h-4 w-4" />,
  SERVED: <UtensilsCrossed className="h-4 w-4" />,
  CANCELLED: <XCircle className="h-4 w-4" />,
};
const ACTIVE_STATUSES: OrderStatus[] = [
  "PLACED",
  "ACCEPTED",
  "PREPARING",
  "READY",
];

const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`;

function formatTime(dateIso: string) {
  const date = new Date(dateIso);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function OrdersDashboard() {
  const { currentOrg, isLoading: isOrgLoading } = useOrganization();
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [payingOrderId, setPayingOrderId] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const currentOrgId = currentOrg?.id ?? null;

  const ordersKey = currentOrgId
    ? `/api/organizations/${currentOrgId}/orders?limit=50`
    : null;

  const { data, error, isLoading, isValidating, mutate } =
    useSWR<OrdersResponse>(ordersKey, fetcher, {
      refreshInterval: autoRefresh ? 1000 * 10 : 0,
      dedupingInterval: 3000,
      revalidateOnFocus: false,
      keepPreviousData: true,
    });

  useEffect(() => {
    if (data) {
      setLastUpdated(new Date());
    }
  }, [data]);

  const refreshOrders = useCallback(
    async (showToast?: string) => {
      await mutate();
      if (showToast) {
        toast.success(showToast);
      }
    },
    [mutate]
  );

  const orders = useMemo(() => data?.orders ?? [], [data]);
  const metrics = data?.metrics ?? null;
  const isInitialLoad = isLoading && !data;
  const errorMessage =
    error instanceof Error
      ? error.message
      : error
        ? "No pudimos cargar los pedidos"
        : null;

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

        await refreshOrders(`Pedido actualizado a ${statusLabels[nextStatus]}`);
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
    [currentOrgId, refreshOrders]
  );

  const handleRegisterPayment = useCallback(
    async (orderId: string) => {
      if (!currentOrgId) {
        return;
      }

      setPayingOrderId(orderId);

      try {
        const response = await fetch(
          `/api/organizations/${currentOrgId}/orders/${orderId}/pay`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          const body = await response.json().catch(() => null);
          const message =
            body?.error || "No pudimos registrar el pago del pedido";
          throw new Error(message);
        }

        await refreshOrders("Pedido marcado como pagado");
      } catch (paymentError) {
        console.error("Error registering payment:", paymentError);
        toast.error(
          paymentError instanceof Error
            ? paymentError.message
            : "Error al registrar el pago"
        );
      } finally {
        setPayingOrderId(null);
      }
    },
    [currentOrgId, refreshOrders]
  );

  const activeCounts = ACTIVE_STATUSES.reduce((acc, status) => {
    return acc + ordersByStatus[status].length;
  }, 0);

  if (isOrgLoading || (isInitialLoad && !errorMessage)) {
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
              disabled={!ordersKey}
            />
            <label htmlFor="orders-autorefresh">Auto actualizar</label>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refreshOrders()}
            disabled={isLoading || isValidating || !ordersKey}
            className="flex flex-wrap items-center gap-2"
          >
            {isLoading || isValidating ? (
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
              <CardTitle className="text-sm font-medium">
                Total pedidos
              </CardTitle>
              \n <ClipboardList className="h-4 w-4 text-muted-foreground" />
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
              <p className="text-xs text-muted-foreground">
                Pedidos completados
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ingresos</CardTitle>\n{" "}
              <DollarSign className="h-4 w-4 text-muted-foreground" />
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

      {errorMessage ? (
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="flex flex-row items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <div>
              <CardTitle className="text-base text-red-600">Error</CardTitle>
              <CardDescription className="text-red-600">
                {errorMessage}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm" onClick={() => refreshOrders()}>
              Reintentar
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          Actualizados:{" "}
          {lastUpdated ? formatTime(lastUpdated.toISOString()) : "--"}
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
            onRegisterPayment={handleRegisterPayment}
            payingOrderId={payingOrderId}
          />
        ))}
      </div>

      <HistorySection
        served={ordersByStatus.SERVED}
        cancelled={ordersByStatus.CANCELLED}
        onRegisterPayment={handleRegisterPayment}
        payingOrderId={payingOrderId}
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
  onRegisterPayment: (orderId: string) => void;
  payingOrderId: string | null;
};

function OrderColumn({
  title,
  description,
  orders,
  updatingOrderId,
  onStatusChange,
  onRegisterPayment,
  payingOrderId,
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
              onRegisterPayment={onRegisterPayment}
              isPaying={payingOrderId === order.id}
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
  onRegisterPayment: (orderId: string) => void;
  isPaying: boolean;
};

function OrderCard({
  order,
  updating,
  onStatusChange,
  onRegisterPayment,
  isPaying,
}: OrderCardProps) {
  const nextStatuses = statusTransitions[order.status] || [];

  return (
    <div className="space-y-4 rounded-xl border p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold">Pedido #{order.number}</h3>
            <Badge variant={statusBadgeVariants[order.status]}>
              {statusLabels[order.status]}
            </Badge>
            <Badge
              variant="outline"
              className={
                order.isPaid
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-amber-200 bg-amber-50 text-amber-700"
              }
            >
              {order.isPaid ? "Pagado" : "Pago pendiente"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {order.table ? `Mesa ${order.table.number}` : "Sin mesa"} • &nbsp;
            {formatTime(order.createdAt)}
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
                <span className="font-medium">
                  {item.quantity}x {item.name}
                </span>
                {item.notes ? (
                  <p className="text-xs text-muted-foreground">
                    Nota: {item.notes}
                  </p>
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
          <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">
            {order.notes}
          </p>
        </div>
      ) : null}

      {!order.isPaid ? (
        <Button
          variant="secondary"
          size="sm"
          className="flex items-center gap-2"
          onClick={() => onRegisterPayment(order.id)}
          disabled={updating || isPaying}
        >
          {isPaying ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <DollarSign className="h-4 w-4" />
          )}
          Registrar pago
        </Button>
      ) : null}

      {nextStatuses.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {nextStatuses.map((status) => (
            <Button
              key={status}
              size="sm"
              variant={status === "CANCELLED" ? "outline" : "default"}
              className="flex flex-wrap items-center gap-2"
              onClick={() => onStatusChange(order.id, status)}
              disabled={updating}
            >
              {updating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                (statusIcons[status] ?? <Plus className="h-4 w-4" />)
              )}
              {status === "CANCELLED"
                ? "Cancelar"
                : status === "ACCEPTED"
                  ? "Aceptar"
                  : statusLabels[status]}
            </Button>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Estado final alcanzado.</p>
      )}
    </div>
  );
}

type HistorySectionProps = {
  served: StaffOrder[];
  cancelled: StaffOrder[];
  onRegisterPayment: (orderId: string) => void;
  payingOrderId: string | null;
};

function HistorySection({
  served,
  cancelled,
  onRegisterPayment,
  payingOrderId,
}: HistorySectionProps) {
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
                <div key={order.id} className="space-y-3 rounded-lg border p-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold">
                          Pedido #{order.number}
                        </span>
                        <Badge variant={statusBadgeVariants[order.status]}>
                          {statusLabels[order.status]}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={
                            order.isPaid
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-amber-200 bg-amber-50 text-amber-700"
                          }
                        >
                          {order.isPaid ? "Pagado" : "Pago pendiente"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {order.table
                          ? `Mesa ${order.table.number}`
                          : "Sin mesa"}{" "}
                        • &nbsp;{formatTime(order.updatedAt)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="text-sm font-semibold text-green-600">
                        {formatCurrency(order.totalC)}
                      </span>
                      {!order.isPaid ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          onClick={() => onRegisterPayment(order.id)}
                          disabled={payingOrderId === order.id}
                        >
                          {payingOrderId === order.id ? (
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          ) : (
                            <DollarSign className="mr-1 h-3 w-3" />
                          )}
                          Registrar pago
                        </Button>
                      ) : null}
                    </div>
                  </div>
                  {order.items.length > 0 ? (
                    <div className="space-y-1 rounded-md bg-muted/40 p-2 text-xs text-muted-foreground">
                      {order.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between"
                        >
                          <span>
                            {item.quantity}x {item.name}
                          </span>
                          <span className="font-semibold text-foreground">
                            {formatCurrency(item.totalC)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
