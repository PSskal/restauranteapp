import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, Clock, CheckCircle, DollarSign } from "lucide-react";

export default async function PedidosPage() {
  // Verificar autenticación
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Obtener la primera organización del usuario con pedidos recientes
  const userOrgs = await prisma.organization.findMany({
    where: {
      OR: [
        { ownerId: session.user.id },
        {
          memberships: {
            some: {
              userId: session.user.id,
            },
          },
        },
      ],
    },
    include: {
      orders: {
        include: {
          table: true,
          items: {
            include: {
              menuItem: true,
            },
          },
          createdBy: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 10, // Solo los 10 más recientes para el dashboard
      },
    },
  });

  const currentOrg = userOrgs[0];

  if (!currentOrg) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)] p-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">
            No tienes acceso a ningún restaurante
          </h2>
          <p className="mt-2 text-gray-600">
            Necesitas crear un restaurante para gestionar pedidos.
          </p>
          <Button className="mt-4" asChild>
            <a href="/dashboard">Volver al Dashboard</a>
          </Button>
        </div>
      </div>
    );
  }

  // Estadísticas de pedidos
  const totalOrders = currentOrg.orders.length;
  const activeOrders = currentOrg.orders.filter((order) =>
    ["PLACED", "PREPARING", "READY"].includes(order.status)
  ).length;
  const completedOrders = currentOrg.orders.filter(
    (order) => order.status === "SERVED"
  ).length;
  const totalRevenue = currentOrg.orders
    .filter((order) => order.status === "SERVED")
    .reduce((acc, order) => acc + order.totalC, 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "DRAFT":
        return "secondary";
      case "PLACED":
        return "default";
      case "PREPARING":
        return "default";
      case "READY":
        return "default";
      case "SERVED":
        return "default";
      case "CANCELLED":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "DRAFT":
        return "Borrador";
      case "PLACED":
        return "Pedido";
      case "PREPARING":
        return "Preparando";
      case "READY":
        return "Listo";
      case "SERVED":
        return "Servido";
      case "CANCELLED":
        return "Cancelado";
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Pedidos</h1>
          <p className="text-muted-foreground">
            Restaurante: <span className="font-medium">{currentOrg.name}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Clock className="h-4 w-4 mr-2" />
            Pedidos Activos ({activeOrders})
          </Button>
          <Button>
            <ClipboardList className="h-4 w-4 mr-2" />
            Ver Todos
          </Button>
        </div>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pedidos Hoy</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrders}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activos</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {activeOrders}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completados</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {completedOrders}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos Hoy</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${(totalRevenue / 100).toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      {currentOrg.orders.length === 0 ? (
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">
              No hay pedidos registrados
            </CardTitle>
            <CardDescription>
              Los pedidos aparecerán aquí cuando los clientes escaneen los
              códigos QR de las mesas
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button asChild>
              <a href="/dashboard/mesas">Configurar Mesas QR</a>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Pedidos Recientes</h2>
            <div className="flex gap-2">
              <Badge variant="outline">Total: {totalOrders}</Badge>
            </div>
          </div>

          <div className="grid gap-4">
            {currentOrg.orders.map((order) => (
              <Card
                key={order.id}
                className="hover:shadow-md transition-shadow"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div>
                        <CardTitle className="text-lg">
                          Pedido #{order.number}
                        </CardTitle>
                        <CardDescription>
                          {order.table
                            ? `Mesa ${order.table.number}`
                            : "Para llevar"}{" "}
                          •{new Date(order.createdAt).toLocaleTimeString()}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getStatusColor(order.status)}>
                        {getStatusText(order.status)}
                      </Badge>
                      <div className="text-lg font-bold">
                        ${(order.totalC / 100).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">
                      <strong>Items:</strong> {order.items.length} productos
                    </div>

                    {order.items.length > 0 && (
                      <div className="grid gap-1 text-sm">
                        {order.items.slice(0, 3).map((item) => (
                          <div key={item.id} className="flex justify-between">
                            <span>
                              {item.quantity}x {item.name}
                            </span>
                            <span>${(item.totalC / 100).toFixed(2)}</span>
                          </div>
                        ))}
                        {order.items.length > 3 && (
                          <div className="text-muted-foreground">
                            ... y {order.items.length - 3} más
                          </div>
                        )}
                      </div>
                    )}

                    {order.createdBy && (
                      <div className="text-xs text-muted-foreground mt-3 pt-2 border-t">
                        Creado por:{" "}
                        {order.createdBy.name || order.createdBy.email}
                      </div>
                    )}

                    {order.notes && (
                      <div className="text-sm mt-2 p-2 bg-yellow-50 rounded">
                        <strong>Notas:</strong> {order.notes}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
