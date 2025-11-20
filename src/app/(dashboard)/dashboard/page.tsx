import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ensureActivePlan, ensureActivePlans } from "@/lib/plan-expiration";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import CreateOrgForm from "@/components/dashboard/create-org-form";
import {
  DollarSign,
  ShoppingBag,
  Users,
  TrendingUp,
  Clock,
  ChefHat,
  CreditCard,
  Utensils,
} from "lucide-react";

export default async function DashboardPage() {
  // Verificar autenticación
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  // La creación del usuario se maneja en el callback de auth.ts

  // Buscar organizaciones del usuario de forma simplificada
  const rawMemberships = await prisma.membership.findMany({
    where: {
      userId: session.user.id,
    },
    include: {
      org: true,
    },
  });

  const userMemberships = await Promise.all(
    rawMemberships.map(async (membership) => ({
      ...membership,
      org: await ensureActivePlan(membership.org),
    }))
  );

  // Buscar organizaciones propias (como owner)
  const rawOwnedOrgs = await prisma.organization.findMany({
    where: {
      ownerId: session.user.id,
    },
  });

  const normalizedOwnedOrgs = await ensureActivePlans(rawOwnedOrgs);

  // Combinar todas las organizaciones
  const allOrgs = [
    ...normalizedOwnedOrgs,
    ...userMemberships.map((m) => m.org),
  ];

  // Remover duplicados
  const uniqueOrgs = allOrgs.filter(
    (org, index, self) => index === self.findIndex((o) => o.id === org.id)
  );

  // Si no tiene organizaciones, mostrar formulario de creación
  if (uniqueOrgs.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)] p-4">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">
              ¡Bienvenido! 🍽️
            </h2>
            <p className="mt-2 text-gray-600">
              Crea tu primer restaurante para empezar
            </p>
          </div>

          {session.user.id ? (
            <CreateOrgForm userId={session.user.id} />
          ) : (
            <div className="text-center p-4 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-yellow-800">
                Error: No se pudo obtener tu ID de usuario. Intenta cerrar
                sesión y volver a loguearte.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Si tiene organizaciones, mostrar dashboard principal
  const selectedOrg = uniqueOrgs[0]; // Por ahora mostramos stats de la primera org

  // Obtener estadísticas del día actual
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [todayOrders, activeTablesCount, totalMenuItems, recentOrders] =
    await Promise.all([
      // Pedidos de hoy
      prisma.order.findMany({
        where: {
          orgId: selectedOrg.id,
          createdAt: { gte: today },
        },
        include: {
          items: true,
          payments: true,
        },
      }),
      // Mesas activas
      prisma.table.count({
        where: {
          orgId: selectedOrg.id,
          isEnabled: true,
        },
      }),
      // Total de items en menú
      prisma.menuItem.count({
        where: {
          orgId: selectedOrg.id,
          active: true,
        },
      }),
      // Últimos pedidos
      prisma.order.findMany({
        where: {
          orgId: selectedOrg.id,
        },
        include: {
          table: true,
          items: true,
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

  // Calcular métricas
  const todaySales =
    todayOrders.reduce((sum, order) => sum + order.totalC, 0) / 100; // Convertir centavos a soles
  const completedOrders = todayOrders.filter(
    (o) => o.status === "SERVED"
  ).length;
  const pendingOrders = todayOrders.filter((o) =>
    ["PLACED", "ACCEPTED", "PREPARING", "READY"].includes(o.status)
  ).length;

  // Platos más vendidos hoy
  const dishCounts = todayOrders.flatMap((order) =>
    order.items.map((item) => ({ name: item.name, quantity: item.quantity }))
  );
  const dishMap = dishCounts.reduce(
    (acc, dish) => {
      acc[dish.name] = (acc[dish.name] || 0) + dish.quantity;
      return acc;
    },
    {} as Record<string, number>
  );
  const topDishes = Object.entries(dishMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            {selectedOrg.name} · Hoy,{" "}
            {today.toLocaleDateString("es-PE", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
        </div>
        <Button asChild>
          <Link href={`/${selectedOrg.slug}/dashboard/pos`}>
            <ShoppingBag className="mr-2 h-4 w-4" />
            Nuevo Pedido
          </Link>
        </Button>
      </div>

      {/* Métricas principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ventas de Hoy</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">S/ {todaySales.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {todayOrders.length} pedidos totales
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pedidos Activos
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingOrders}</div>
            <p className="text-xs text-muted-foreground">
              {completedOrders} completados hoy
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mesas Activas</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeTablesCount}</div>
            <p className="text-xs text-muted-foreground">
              Disponibles para pedidos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Menú Activo</CardTitle>
            <Utensils className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMenuItems}</div>
            <p className="text-xs text-muted-foreground">Platos disponibles</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Platos más vendidos */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Platos Más Vendidos Hoy</CardTitle>
            <CardDescription>Top 3 platos más solicitados</CardDescription>
          </CardHeader>
          <CardContent>
            {topDishes.length > 0 ? (
              <div className="space-y-4">
                {topDishes.map(([name, quantity], index) => (
                  <div key={name} className="flex items-center">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                      <span className="text-sm font-medium">{index + 1}</span>
                    </div>
                    <div className="ml-4 space-y-1">
                      <p className="text-sm font-medium leading-none">{name}</p>
                      <p className="text-sm text-muted-foreground">
                        {quantity} unidades vendidas
                      </p>
                    </div>
                    <div className="ml-auto font-medium">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No hay ventas registradas hoy
              </p>
            )}
          </CardContent>
        </Card>

        {/* Actividad reciente */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Actividad Reciente</CardTitle>
            <CardDescription>Últimos 5 pedidos realizados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <div key={order.id} className="flex items-center">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                    <ChefHat className="h-4 w-4" />
                  </div>
                  <div className="ml-4 space-y-1">
                    <p className="text-sm font-medium leading-none">
                      Pedido #{order.number}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {order.table?.number
                        ? `Mesa ${order.table.number}`
                        : "Para llevar"}
                    </p>
                  </div>
                  <div className="ml-auto">
                    <Badge
                      variant={
                        order.status === "SERVED"
                          ? "default"
                          : order.status === "CANCELLED"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {order.status}
                    </Badge>
                  </div>
                </div>
              ))}
              {recentOrders.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No hay pedidos registrados
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Accesos rápidos */}
      <Card>
        <CardHeader>
          <CardTitle>Accesos Rápidos</CardTitle>
          <CardDescription>
            Navega a las secciones más importantes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Button variant="outline" className="h-20" asChild>
              <Link href={`/dashboard/pos`}>
                <div className="flex flex-col items-center gap-2">
                  <CreditCard className="h-6 w-6" />
                  <span>Punto de Venta</span>
                </div>
              </Link>
            </Button>
            <Button variant="outline" className="h-20" asChild>
              <Link href={`/dashboard/cocina`}>
                <div className="flex flex-col items-center gap-2">
                  <ChefHat className="h-6 w-6" />
                  <span>Vista Cocina</span>
                </div>
              </Link>
            </Button>
            <Button variant="outline" className="h-20" asChild>
              <Link href={`/dashboard/mesas`}>
                <div className="flex flex-col items-center gap-2">
                  <Users className="h-6 w-6" />
                  <span>Gestionar Mesas</span>
                </div>
              </Link>
            </Button>
            <Button variant="outline" className="h-20" asChild>
              <Link href={`/dashboard/reportes`}>
                <div className="flex flex-col items-center gap-2">
                  <TrendingUp className="h-6 w-6" />
                  <span>Reportes</span>
                </div>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Estado del plan */}
      <Card>
        <CardHeader>
          <CardTitle>Estado del Plan</CardTitle>
          <CardDescription>Plan actual y límites de uso</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium flex items-center gap-2">
                <span>Plan:</span>
                <Badge variant="secondary">{selectedOrg.plan}</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {activeTablesCount} mesas activas · {todayOrders.length} pedidos
                este mes
              </p>
            </div>
            {selectedOrg.plan === "FREE" && (
              <Button asChild>
                <Link href="/pricing">Upgrade a Premium</Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
