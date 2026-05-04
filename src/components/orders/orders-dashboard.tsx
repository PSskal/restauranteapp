"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";

import {
  AlertCircle,
  CheckCircle2,
  CircleCheck,
  ChefHat,
  DollarSign,
  Loader2,
  Percent,
  Plus,
  Printer,
  RefreshCcw,
  UtensilsCrossed,
  XCircle,
} from "lucide-react";

import { DiscountDialog } from "@/components/orders/discount-dialog";
import { PaymentDialog } from "@/components/orders/payment-dialog";

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

type OrderItemStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "READY"
  | "SERVED"
  | "CANCELLED";

type StaffOrderItemModifier = {
  id: string;
  groupName: string;
  name: string;
  priceDeltaC: number;
};

type StaffOrderItem = {
  id: string;
  name: string;
  quantity: number;
  priceC: number;
  modifiersPriceC?: number;
  totalC: number;
  notes: string | null;
  status?: OrderItemStatus;
  modifiers?: StaffOrderItemModifier[];
};

type OrderDiscount = {
  id: string;
  type: "PERCENT" | "FIXED" | "COMP";
  valueBp: number | null;
  amountC: number;
  reason: string;
  orderItemId: string | null;
  createdAt: string;
};

type OrderPayment = {
  id: string;
  method: "CASH" | "CARD";
  amountC: number;
  tipC: number;
  createdAt: string;
};

type OrderKind = "DINE_IN" | "PICKUP" | "DELIVERY";

type StaffOrder = {
  id: string;
  number: number;
  status: OrderStatus;
  kind?: OrderKind;
  customerName?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  deliveryAddress?: string | null;
  pickupTime?: string | null;
  totalC: number;
  discountsC?: number;
  netDueC?: number;
  paidC?: number;
  tipsC?: number;
  remainingC?: number;
  createdAt: string;
  updatedAt: string;
  notes: string | null;
  isPaid: boolean;
  discounts?: OrderDiscount[];
  payments?: OrderPayment[];
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

const formatCurrency = (cents: number) => `S/ ${(cents / 100).toFixed(2)}`;

function formatTime(dateIso: string) {
  const date = new Date(dateIso);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function OrdersDashboard() {
  const { currentOrg, isLoading: isOrgLoading } = useOrganization();
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [paymentOrder, setPaymentOrder] = useState<StaffOrder | null>(null);
  const [discountOrder, setDiscountOrder] = useState<StaffOrder | null>(null);
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

  // Filtrar pedidos con pago pendiente (SERVED y no pagados)
  const unpaidOrders = useMemo(() => {
    return orders.filter((order) => order.status === "SERVED" && !order.isPaid);
  }, [orders]);

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

  const handlePrintPrecheck = useCallback((order: StaffOrder) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("No se pudo abrir la ventana de impresión");
      return;
    }

    const subtotal = order.totalC;
    const total = subtotal;

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Precuenta - Pedido #${order.number}</title>
          <meta charset="UTF-8" />
          <style>
            @media print {
              @page { margin: 0; size: 80mm auto; }
              body { margin: 0; padding: 0; }
            }
            body {
              font-family: 'Courier New', monospace;
              font-size: 12px;
              line-height: 1.4;
              max-width: 80mm;
              margin: 0 auto;
              padding: 10mm;
            }
            .header {
              text-align: center;
              margin-bottom: 15px;
              border-bottom: 2px dashed #000;
              padding-bottom: 10px;
            }
            .header h1 {
              margin: 0 0 5px 0;
              font-size: 18px;
              font-weight: bold;
            }
            .header p {
              margin: 3px 0;
              font-size: 11px;
            }
            .info {
              margin-bottom: 15px;
              padding-bottom: 10px;
              border-bottom: 1px dashed #000;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              margin: 3px 0;
            }
            .items {
              margin-bottom: 15px;
              border-bottom: 1px dashed #000;
              padding-bottom: 10px;
            }
            .item {
              margin: 8px 0;
            }
            .item-header {
              display: flex;
              justify-content: space-between;
              font-weight: bold;
            }
            .item-notes {
              font-size: 10px;
              font-style: italic;
              margin-left: 10px;
              color: #555;
            }
            .totals {
              margin-top: 10px;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              margin: 5px 0;
            }
            .total-row.grand {
              font-size: 14px;
              font-weight: bold;
              border-top: 2px solid #000;
              padding-top: 8px;
              margin-top: 8px;
            }
            .footer {
              text-align: center;
              margin-top: 15px;
              padding-top: 10px;
              border-top: 2px dashed #000;
              font-size: 11px;
            }
            .footer p {
              margin: 3px 0;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>PRECUENTA</h1>
            <p>No válido como comprobante de pago</p>
            <p>${new Date().toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" })}</p>
          </div>

          <div class="info">
            <div class="info-row">
              <span><strong>Pedido:</strong> #${order.number}</span>
              <span><strong>Mesa:</strong> ${order.table?.number || "N/A"}</span>
            </div>
            ${order.notes ? `<div class="info-row"><span><strong>Nota:</strong> ${order.notes}</span></div>` : ""}
          </div>

          <div class="items">
            <div style="font-weight: bold; margin-bottom: 8px;">DETALLE:</div>
            ${order.items
              .map((item) => {
                const modifiersHtml = (item.modifiers ?? [])
                  .map(
                    (modifier) =>
                      `<div class="item-notes">+ ${modifier.groupName}: ${modifier.name}${
                        modifier.priceDeltaC !== 0
                          ? ` (${modifier.priceDeltaC > 0 ? "+" : ""}S/ ${(
                              modifier.priceDeltaC / 100
                            ).toFixed(2)})`
                          : ""
                      }</div>`,
                  )
                  .join("");
                return `
              <div class="item">
                <div class="item-header">
                  <span>${item.quantity}x ${item.name}</span>
                  <span>S/ ${(item.totalC / 100).toFixed(2)}</span>
                </div>
                ${modifiersHtml}
                ${item.notes ? `<div class="item-notes">* ${item.notes}</div>` : ""}
              </div>
            `;
              })
              .join("")}
          </div>

          <div class="totals">
            <div class="total-row grand">
              <span>TOTAL:</span>
              <span>S/ ${(total / 100).toFixed(2)}</span>
            </div>
          </div>

          <div class="footer">
            <p>¡Gracias por su preferencia!</p>
            <p>Solicite su comprobante de pago</p>
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                setTimeout(function() {
                  window.close();
                }, 100);
              }, 250);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
  }, []);

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

  const handleOpenPayment = useCallback((order: StaffOrder) => {
    setPaymentOrder(order);
  }, []);

  const handleOpenDiscount = useCallback((order: StaffOrder) => {
    setDiscountOrder(order);
  }, []);

  const handleRemoveDiscount = useCallback(
    async (orderId: string, discountId: string) => {
      if (!currentOrgId) return;
      try {
        const response = await fetch(
          `/api/organizations/${currentOrgId}/orders/${orderId}/discounts/${discountId}`,
          { method: "DELETE" }
        );
        if (!response.ok) {
          const body = await response.json().catch(() => null);
          throw new Error(body?.error || "No se pudo eliminar el descuento");
        }
        await refreshOrders("Descuento eliminado");
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Error eliminando descuento"
        );
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
              <CardTitle className="text-sm font-medium">Ingresos</CardTitle>{" "}
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
            onRegisterPayment={handleOpenPayment}
            onApplyDiscount={handleOpenDiscount}
            onRemoveDiscount={handleRemoveDiscount}
            onPrintPrecheck={handlePrintPrecheck}
          />
        ))}
      </div>

      {/* Sección de Pagos Pendientes */}
      {unpaidOrders.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-amber-600" />
                  Pagos Pendientes
                </CardTitle>
                <CardDescription>
                  Pedidos servidos que aún no han sido pagados
                </CardDescription>
              </div>
              <Badge
                variant="outline"
                className="border-amber-600 text-amber-700"
              >
                {unpaidOrders.length}{" "}
                {unpaidOrders.length === 1 ? "pedido" : "pedidos"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {unpaidOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  updating={updatingOrderId === order.id}
                  onStatusChange={handleStatusUpdate}
                  onRegisterPayment={handleOpenPayment}
                  onApplyDiscount={handleOpenDiscount}
                  onRemoveDiscount={handleRemoveDiscount}
                  onPrintPrecheck={handlePrintPrecheck}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <HistorySection
        served={ordersByStatus.SERVED}
        cancelled={ordersByStatus.CANCELLED}
        onRegisterPayment={handleOpenPayment}
        onApplyDiscount={handleOpenDiscount}
        onRemoveDiscount={handleRemoveDiscount}
      />

      <PaymentDialog
        open={paymentOrder !== null}
        onOpenChange={(open) => {
          if (!open) setPaymentOrder(null);
        }}
        orgId={currentOrgId ?? ""}
        orderId={paymentOrder?.id ?? null}
        netDueC={paymentOrder?.netDueC ?? paymentOrder?.totalC ?? 0}
        paidC={paymentOrder?.paidC ?? 0}
        onPaid={() => refreshOrders()}
      />

      <DiscountDialog
        open={discountOrder !== null}
        onOpenChange={(open) => {
          if (!open) setDiscountOrder(null);
        }}
        orgId={currentOrgId ?? ""}
        orderId={discountOrder?.id ?? null}
        netDueC={
          discountOrder
            ? Math.max(
                0,
                (discountOrder.netDueC ?? discountOrder.totalC) -
                  (discountOrder.paidC ?? 0)
              )
            : 0
        }
        onApplied={() => refreshOrders()}
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
  onRegisterPayment: (order: StaffOrder) => void;
  onApplyDiscount: (order: StaffOrder) => void;
  onRemoveDiscount: (orderId: string, discountId: string) => void;
  onPrintPrecheck: (order: StaffOrder) => void;
};

function OrderColumn({
  title,
  description,
  orders,
  updatingOrderId,
  onStatusChange,
  onRegisterPayment,
  onApplyDiscount,
  onRemoveDiscount,
  onPrintPrecheck,
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
              onApplyDiscount={onApplyDiscount}
              onRemoveDiscount={onRemoveDiscount}
              onPrintPrecheck={onPrintPrecheck}
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
  onRegisterPayment: (order: StaffOrder) => void;
  onApplyDiscount: (order: StaffOrder) => void;
  onRemoveDiscount: (orderId: string, discountId: string) => void;
  onPrintPrecheck: (order: StaffOrder) => void;
};

function OrderCard({
  order,
  updating,
  onStatusChange,
  onRegisterPayment,
  onApplyDiscount,
  onRemoveDiscount,
  onPrintPrecheck,
}: OrderCardProps) {
  const nextStatuses = statusTransitions[order.status] || [];
  const discountsC = order.discountsC ?? 0;
  const netDueC = order.netDueC ?? order.totalC;
  const paidC = order.paidC ?? 0;
  const tipsC = order.tipsC ?? 0;
  const remainingC = order.remainingC ?? Math.max(0, netDueC - paidC);

  return (
    <div className="space-y-4 rounded-xl border p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-bold">
              {order.kind === "PICKUP"
                ? "Recoger"
                : order.kind === "DELIVERY"
                  ? "Delivery"
                  : order.table
                    ? `Mesa ${order.table.number}`
                    : "Sin Mesa"}
            </h3>
            <Badge variant={statusBadgeVariants[order.status]}>
              {statusLabels[order.status]}
            </Badge>
            {order.kind && order.kind !== "DINE_IN" ? (
              <Badge
                variant="outline"
                className="border-purple-200 bg-purple-50 text-purple-700"
              >
                {order.kind === "PICKUP" ? "Online · Recoger" : "Online · Delivery"}
              </Badge>
            ) : null}
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
            Pedido #{order.number} • {formatTime(order.createdAt)}
          </p>
          {order.kind && order.kind !== "DINE_IN" && order.customerName ? (
            <p className="mt-1 text-xs text-slate-700">
              <span className="font-semibold">{order.customerName}</span>
              {order.customerPhone ? ` · ${order.customerPhone}` : ""}
            </p>
          ) : null}
          {order.deliveryAddress ? (
            <p className="text-xs text-slate-600">
              📍 {order.deliveryAddress}
            </p>
          ) : null}
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
                {item.modifiers && item.modifiers.length > 0 ? (
                  <ul className="mt-0.5 space-y-0.5 text-xs text-muted-foreground">
                    {item.modifiers.map((modifier) => (
                      <li key={modifier.id}>
                        + {modifier.groupName}: {modifier.name}
                      </li>
                    ))}
                  </ul>
                ) : null}
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

      {order.discounts && order.discounts.length > 0 ? (
        <div className="space-y-1 rounded-md bg-amber-50 p-2 text-xs">
          <p className="font-semibold text-amber-900">Descuentos</p>
          {order.discounts.map((discount) => (
            <div
              key={discount.id}
              className="flex items-center justify-between gap-2 text-amber-900"
            >
              <span className="truncate">
                {discount.type === "PERCENT"
                  ? `${((discount.valueBp ?? 0) / 100).toFixed(0)}%`
                  : discount.type === "COMP"
                    ? "Cortesía"
                    : "Monto"}
                {" — "}
                <span className="italic">{discount.reason}</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="font-semibold">
                  -{formatCurrency(discount.amountC)}
                </span>
                <button
                  type="button"
                  className="text-amber-700 hover:text-destructive"
                  onClick={() => onRemoveDiscount(order.id, discount.id)}
                  disabled={updating}
                  aria-label="Eliminar descuento"
                >
                  <XCircle className="h-3 w-3" />
                </button>
              </span>
            </div>
          ))}
        </div>
      ) : null}

      <div className="space-y-1 rounded-md border bg-muted/30 p-2 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span>{formatCurrency(order.totalC)}</span>
        </div>
        {discountsC > 0 ? (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Descuentos</span>
            <span className="text-destructive">
              -{formatCurrency(discountsC)}
            </span>
          </div>
        ) : null}
        {paidC > 0 ? (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Pagado</span>
            <span>{formatCurrency(paidC)}</span>
          </div>
        ) : null}
        {tipsC > 0 ? (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Propina cobrada</span>
            <span>{formatCurrency(tipsC)}</span>
          </div>
        ) : null}
        <div className="flex justify-between border-t pt-1 font-semibold">
          <span>Saldo</span>
          <span
            className={remainingC === 0 ? "text-emerald-600" : "text-amber-700"}
          >
            {formatCurrency(remainingC)}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(order.status === "READY" || order.status === "SERVED") && (
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
            onClick={() => onPrintPrecheck(order)}
            disabled={updating}
          >
            <Printer className="h-4 w-4" />
            Precuenta
          </Button>
        )}

        {!order.isPaid && remainingC > 0 ? (
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
            onClick={() => onApplyDiscount(order)}
            disabled={updating}
          >
            <Percent className="h-4 w-4" />
            Descuento
          </Button>
        ) : null}

        {!order.isPaid && remainingC > 0 ? (
          <Button
            variant="secondary"
            size="sm"
            className="flex items-center gap-2"
            onClick={() => onRegisterPayment(order)}
            disabled={updating}
          >
            <DollarSign className="h-4 w-4" />
            Cobrar
          </Button>
        ) : null}
      </div>

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
  onRegisterPayment: (order: StaffOrder) => void;
  onApplyDiscount: (order: StaffOrder) => void;
  onRemoveDiscount: (orderId: string, discountId: string) => void;
};

function HistorySection({
  served,
  cancelled,
  onRegisterPayment,
  onApplyDiscount,
  onRemoveDiscount,
}: HistorySectionProps) {
  // Dejamos referenciadas las props de descuento aunque el historial hoy
  // sólo las necesita cuando se agregue soporte directo.
  void onApplyDiscount;
  void onRemoveDiscount;
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
                      {!order.isPaid && (order.remainingC ?? 0) > 0 ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          onClick={() => onRegisterPayment(order)}
                        >
                          <DollarSign className="mr-1 h-3 w-3" />
                          Cobrar ({formatCurrency(order.remainingC ?? 0)})
                        </Button>
                      ) : null}
                    </div>
                  </div>
                  {order.items.length > 0 ? (
                    <div className="space-y-1 rounded-md bg-muted/40 p-2 text-xs text-muted-foreground">
                      {order.items.map((item) => (
                        <div key={item.id} className="space-y-0.5">
                          <div className="flex items-center justify-between">
                            <span>
                              {item.quantity}x {item.name}
                            </span>
                            <span className="font-semibold text-foreground">
                              {formatCurrency(item.totalC)}
                            </span>
                          </div>
                          {item.modifiers && item.modifiers.length > 0 ? (
                            <ul className="pl-3">
                              {item.modifiers.map((modifier) => (
                                <li key={modifier.id}>
                                  + {modifier.groupName}: {modifier.name}
                                </li>
                              ))}
                            </ul>
                          ) : null}
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
