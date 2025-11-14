"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertCircle,
  BarChart3,
  CalendarClock,
  Loader2,
  PieChart,
  RefreshCcw,
  ShoppingBag,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { useOrganization } from "@/contexts/organization-context";
import { PlanGate } from "@/components/plans/plan-gate";
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
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type RangeKey = "today" | "7d" | "30d" | "90d";
type OrderStatusKey =
  | "DRAFT"
  | "PLACED"
  | "ACCEPTED"
  | "PREPARING"
  | "READY"
  | "SERVED"
  | "CANCELLED";
type PaymentMethodKey = "CASH" | "CARD";

type ReportsTimelineEntry = {
  date: string;
  orderCount: number;
  servedCount: number;
  cancelledCount: number;
  revenueCents: number;
  averageTicketCents: number;
};

type ReportsResponse = {
  range: {
    key: RangeKey | "custom";
    from: string;
    to: string;
    days: number;
  };
  totals: {
    revenueCents: number;
    totalOrders: number;
    servedOrders: number;
    cancelledOrders: number;
    averageTicketCents: number;
    cancellationRate: number;
  };
  statusCounts: Record<OrderStatusKey, number>;
  paymentBreakdown: Record<
    PaymentMethodKey,
    {
      amountCents: number;
      count: number;
    }
  >;
  topItems: Array<{
    id: string;
    name: string;
    quantity: number;
    revenueCents: number;
  }>;
  timeline: ReportsTimelineEntry[];
  highlights: {
    bestDay: ReportsTimelineEntry | null;
    topItem: ReportsResponse["topItems"][number] | null;
  };
};

const RANGE_OPTIONS: Array<{ key: RangeKey; label: string }> = [
  { key: "today", label: "Hoy" },
  { key: "7d", label: "7 dias" },
  { key: "30d", label: "30 dias" },
  { key: "90d", label: "90 dias" },
];

const ORDER_STATUS_LABELS: Record<OrderStatusKey, string> = {
  DRAFT: "Borrador",
  PLACED: "Nuevo",
  ACCEPTED: "Aceptado",
  PREPARING: "Preparando",
  READY: "Listo",
  SERVED: "Servido",
  CANCELLED: "Cancelado",
};

const ORDER_STATUS_BADGE: Record<
  OrderStatusKey,
  "default" | "secondary" | "outline" | "destructive"
> = {
  DRAFT: "outline",
  PLACED: "default",
  ACCEPTED: "default",
  PREPARING: "default",
  READY: "default",
  SERVED: "secondary",
  CANCELLED: "destructive",
};

const PAYMENT_LABELS: Record<PaymentMethodKey, string> = {
  CASH: "Efectivo",
  CARD: "Tarjeta",
};

const formatCurrency = (cents: number) => `S/ ${(cents / 100).toFixed(2)}`;

const parseISODateLocal = (iso: string) => {
  if (!iso) {
    return new Date(iso);
  }

  const safeIso = iso.slice(0, 10);
  const parts = safeIso.split("-").map((value) => Number.parseInt(value, 10));

  if (parts.length === 3 && parts.every((part) => Number.isInteger(part))) {
    const [year, month, day] = parts;
    return new Date(year, month - 1, day);
  }

  return new Date(iso);
};

const formatDisplayDate = (iso: string) =>
  parseISODateLocal(iso).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const formatShortDate = (iso: string) =>
  parseISODateLocal(iso).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "short",
  });

export function ReportsDashboard() {
  const { currentOrg, isLoading: isOrgLoading } = useOrganization();
  const currentOrgId = currentOrg?.id ?? null;

  const [range, setRange] = useState<RangeKey>("7d");
  const [data, setData] = useState<ReportsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchReports = useCallback(
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
          `/api/organizations/${currentOrgId}/reports?range=${range}`,
          { cache: "no-store" }
        );

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          const message =
            payload?.error || "No pudimos generar los reportes en este momento";
          throw new Error(message);
        }

        const payload = (await response.json()) as ReportsResponse;
        setData(payload);
        setLastUpdated(new Date());
      } catch (requestError) {
        console.error("Error loading reports:", requestError);
        const message =
          requestError instanceof Error
            ? requestError.message
            : "Error desconocido al cargar reportes";
        setError(message);
        toast.error(message);
      } finally {
        if (!silent) {
          setIsLoading(false);
        }
      }
    },
    [currentOrgId, range]
  );

  useEffect(() => {
    if (!currentOrgId) {
      setData(null);
      setError(null);
      setLastUpdated(null);
      return;
    }

    fetchReports();
  }, [currentOrgId, fetchReports]);

  const statusEntries = useMemo(() => {
    if (!data) {
      return [] as Array<{
        status: OrderStatusKey;
        count: number;
        percentage: number;
      }>;
    }

    const total = data.totals.totalOrders || 1;
    return (
      Object.entries(data.statusCounts) as Array<[OrderStatusKey, number]>
    )
      .map(([status, count]) => ({
        status,
        count,
        percentage: count / total,
      }))
      .sort((a, b) => b.count - a.count);
  }, [data]);

  const totalPaidCents = useMemo(() => {
    if (!data) {
      return 0;
    }
    return Object.values(data.paymentBreakdown).reduce(
      (sum, item) => sum + item.amountCents,
      0
    );
  }, [data]);

  const timelineChartData = useMemo(() => {
    if (!data) {
      return [];
    }

    return data.timeline.map((entry) => ({
      date: formatShortDate(entry.date),
      isoDate: entry.date,
      ingresos: Number((entry.revenueCents / 100).toFixed(2)),
      pedidos: entry.orderCount,
      servidos: entry.servedCount,
      cancelados: entry.cancelledCount,
      ticket: Number((entry.averageTicketCents / 100).toFixed(2)),
    }));
  }, [data]);

  const isInitialLoading = isLoading && !data;

  const rangeSummary = data
    ? `${formatShortDate(data.range.from)} - ${formatShortDate(data.range.to)}`
    : "Selecciona un rango";

  const refreshDisabled = isLoading || !currentOrgId;

  if (!isOrgLoading && currentOrg && currentOrg.plan !== "PREMIUM") {
    return (
      <PlanGate
        title="Reportes avanzados Premium"
        description="Desbloquea métricas históricas, productos más vendidos y tendencias al activar el plan Premium."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold">Reportes</h1>
          <p className="text-sm text-muted-foreground">
            Analiza el rendimiento de tu restaurante con metricas clave por
            periodo.
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CalendarClock className="h-4 w-4" />
            <span>{rangeSummary}</span>
            {lastUpdated ? (
              <>
                <span className="h-1 w-1 rounded-full bg-muted-foreground/60" />
                <span>
                  Actualizado{" "}
                  {lastUpdated.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {RANGE_OPTIONS.map((option) => (
            <Button
              key={option.key}
              variant={range === option.key ? "default" : "outline"}
              size="sm"
              onClick={() => setRange(option.key)}
              disabled={isLoading && range === option.key}
            >
              {option.label}
            </Button>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchReports({ silent: Boolean(data) })}
            disabled={refreshDisabled}
            className="flex items-center gap-1"
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

      {isOrgLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : null}

      {!currentOrgId && !isOrgLoading ? (
        <Card>
          <CardHeader>
            <CardTitle>Selecciona un restaurante</CardTitle>
            <CardDescription>
              Los reportes estaran disponibles cuando elijas una organizacion en
              el selector superior.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {error ? (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      ) : null}

      {isInitialLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : null}

      {!isInitialLoading && data ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Ingresos servidos
                </CardTitle>
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <TrendingUp className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">
                  {formatCurrency(data.totals.revenueCents)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Basado en pedidos marcados como servidos en el periodo.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Ticket promedio
                </CardTitle>
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Wallet className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">
                  {formatCurrency(data.totals.averageTicketCents)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Calculado sobre pedidos completados.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Pedidos servidos
                </CardTitle>
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <ShoppingBag className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">
                  {data.totals.servedOrders}
                </div>
                <p className="text-xs text-muted-foreground">
                  De {data.totals.totalOrders} pedidos totales en el rango.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Tasa de cancelacion
                </CardTitle>
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <BarChart3 className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">
                  {(data.totals.cancellationRate * 100).toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {data.totals.cancelledOrders} pedidos cancelados.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2 flex flex-col">
              <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Evolucion diaria</CardTitle>
                  <CardDescription>
                    Pedidos y montos generados por dia dentro del periodo.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="flex-1 px-2 pb-2 pt-0 sm:px-6 sm:pb-6">
                {timelineChartData.length > 0 ? (
                  <div className="h-full min-h-[18rem] w-full sm:min-h-[20rem]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={timelineChartData}>
                        <defs>
                          <linearGradient
                            id="colorIngresos"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#6366f1"
                              stopOpacity={0.8}
                            />
                            <stop
                              offset="95%"
                              stopColor="#6366f1"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          className="stroke-muted"
                        />
                        <XAxis
                          dataKey="date"
                          className="text-xs"
                          tick={{ fill: "hsl(var(--muted-foreground))" }}
                        />
                        <YAxis
                          className="text-xs"
                          tick={{ fill: "hsl(var(--muted-foreground))" }}
                          tickFormatter={(value) =>
                            formatCurrency(Math.round(value * 100))
                          }
                        />
                        <Tooltip
                          content={({ payload, active }) => {
                            if (!active || !payload?.length) {
                              return null;
                            }

                            const point = payload[0].payload as {
                              isoDate: string;
                              ingresos: number;
                              pedidos: number;
                              servidos: number;
                              cancelados: number;
                              ticket: number;
                            };

                            return (
                              <div className="rounded-lg border bg-background p-3 text-xs shadow-sm">
                                <p className="font-medium">
                                  {formatDisplayDate(point.isoDate)}
                                </p>
                                <p className="text-muted-foreground">
                                  Ingresos:{" "}
                                  {formatCurrency(
                                    Math.round(point.ingresos * 100)
                                  )}
                                </p>
                                <p className="text-muted-foreground">
                                  Pedidos: {point.pedidos}
                                </p>
                                <p className="text-muted-foreground">
                                  Servidos: {point.servidos}
                                </p>
                                <p className="text-muted-foreground">
                                  Cancelados: {point.cancelados}
                                </p>
                                <p className="text-muted-foreground">
                                  Ticket medio:{" "}
                                  {formatCurrency(
                                    Math.round(point.ticket * 100)
                                  )}
                                </p>
                              </div>
                            );
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="ingresos"
                          stroke="#6366f1"
                          fillOpacity={1}
                          fill="url(#colorIngresos)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex h-full min-h-[18rem] w-full items-center justify-center text-sm text-muted-foreground sm:min-h-[20rem]">
                    Aun no hay actividad registrada en este periodo.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Estado de pedidos</CardTitle>
                <CardDescription>
                  Distribucion de todos los pedidos en el rango seleccionado.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {statusEntries.map((item) => (
                  <div
                    key={item.status}
                    className="flex items-center justify-between gap-3 rounded-md border p-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={ORDER_STATUS_BADGE[item.status]}>
                          {ORDER_STATUS_LABELS[item.status]}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {(item.percentage * 100).toFixed(1)}%
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {item.count} pedidos
                      </p>
                    </div>
                  </div>
                ))}
                {statusEntries.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No hay pedidos en el periodo elegido.
                  </p>
                ) : null}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle>Top productos</CardTitle>
                  <CardDescription>
                    Productos que generaron mayor ingreso en pedidos servidos.
                  </CardDescription>
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <PieChart className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent>
                {data.topItems.length === 0 ? (
                  <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                    Aun no hay ventas registradas para mostrar.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {data.topItems.map((item, index) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-3 rounded-lg border p-3"
                      >
                        <div>
                          <p className="text-sm font-medium leading-none">
                            {index + 1}. {item.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.quantity} unidades vendidas
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-primary">
                          {formatCurrency(item.revenueCents)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle>Metodos de pago</CardTitle>
                  <CardDescription>
                    Resumen de pagos confirmados con estado pagado.
                  </CardDescription>
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Wallet className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(data.paymentBreakdown).map(
                  ([method, breakdown]) => {
                    const percentage =
                      totalPaidCents > 0
                        ? (breakdown.amountCents / totalPaidCents) * 100
                        : 0;

                    return (
                      <div key={method} className="space-y-2">
                        <div className="flex items-center justify-between text-sm font-medium">
                          <span>
                            {PAYMENT_LABELS[method as PaymentMethodKey]}
                          </span>
                          <span>{formatCurrency(breakdown.amountCents)}</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-muted">
                          <div
                            className="h-2 rounded-full bg-primary/80"
                            style={{ width: `${Math.min(100, percentage)}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{breakdown.count} pagos</span>
                          <span>{percentage.toFixed(1)}%</span>
                        </div>
                      </div>
                    );
                  }
                )}
                {totalPaidCents === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Aun no se registran pagos confirmados en este periodo.
                  </p>
                ) : null}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle>Insights rapidos</CardTitle>
                <CardDescription>
                  Hallazgos automaticos basados en el periodo actual.
                </CardDescription>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                <BarChart3 className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-xs text-muted-foreground">Mejor dia</p>
                <p className="mt-1 text-sm font-semibold">
                  {data.highlights.bestDay
                    ? formatDisplayDate(data.highlights.bestDay.date)
                    : "Sin datos"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {data.highlights.bestDay
                    ? `${formatCurrency(
                        data.highlights.bestDay.revenueCents
                      )} en ${data.highlights.bestDay.servedCount} pedidos`
                    : "Aun no hay ventas registradas."}
                </p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-xs text-muted-foreground">
                  Producto estrella
                </p>
                <p className="mt-1 text-sm font-semibold">
                  {data.highlights.topItem
                    ? data.highlights.topItem.name
                    : "Sin datos"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {data.highlights.topItem
                    ? `${data.highlights.topItem.quantity} unidades, ${formatCurrency(
                        data.highlights.topItem.revenueCents
                      )}`
                    : "Aun no hay ventas registradas."}
                </p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-xs text-muted-foreground">Cancelaciones</p>
                <p className="mt-1 text-sm font-semibold">
                  {data.totals.cancelledOrders} pedidos
                </p>
                <p className="text-xs text-muted-foreground">
                  Tasa del {(data.totals.cancellationRate * 100).toFixed(1)}%
                  {data.totals.cancellationRate > 0.15
                    ? ". Revisa el flujo de pedidos para reducirla."
                    : ". En niveles saludables."}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
