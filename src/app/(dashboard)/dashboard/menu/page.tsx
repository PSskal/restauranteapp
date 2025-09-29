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
import { ChefHat, Plus, Edit, Trash2, DollarSign, Eye } from "lucide-react";

export default async function MenuPage() {
  // Verificar autenticación
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Obtener la primera organización del usuario con categorías y productos
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
      categories: {
        orderBy: {
          position: "asc",
        },
        include: {
          items: {
            orderBy: {
              name: "asc",
            },
          },
        },
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
            Necesitas crear un restaurante para gestionar el menú.
          </p>
          <Button className="mt-4" asChild>
            <a href="/dashboard">Volver al Dashboard</a>
          </Button>
        </div>
      </div>
    );
  }

  const totalItems = currentOrg.categories.reduce(
    (acc, category) => acc + category.items.length,
    0
  );
  const activeItems = currentOrg.categories.reduce(
    (acc, category) =>
      acc + category.items.filter((item) => item.active).length,
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Menú</h1>
          <p className="text-muted-foreground">
            Restaurante: <span className="font-medium">{currentOrg.name}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Nueva Categoría
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Producto
          </Button>
        </div>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Productos
            </CardTitle>
            <ChefHat className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItems}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Productos Activos
            </CardTitle>
            <div className="h-4 w-4 bg-green-500 rounded-full"></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {activeItems}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categorías</CardTitle>
            <Badge variant="outline">{currentOrg.categories.length}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentOrg.categories.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Precio Promedio
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              $
              {totalItems > 0
                ? Math.round(
                    currentOrg.categories.reduce(
                      (acc, cat) =>
                        acc +
                        cat.items.reduce(
                          (sum, item) => sum + item.priceCents,
                          0
                        ),
                      0
                    ) /
                      totalItems /
                      100
                  )
                : 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {currentOrg.categories.length === 0 ? (
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">
              No hay categorías configuradas
            </CardTitle>
            <CardDescription>
              Crea tu primera categoría para organizar el menú de tu restaurante
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Crear Primera Categoría
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {currentOrg.categories.map((category) => (
            <Card key={category.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">{category.name}</CardTitle>
                    <CardDescription>
                      {category.items.length} productos en esta categoría
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar Producto
                    </Button>
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {category.items.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No hay productos en esta categoría
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {category.items.map((item) => (
                      <div
                        key={item.id}
                        className="border rounded-lg p-4 hover:shadow-sm transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium">{item.name}</h4>
                          <Badge
                            variant={item.active ? "default" : "secondary"}
                          >
                            {item.active ? "Activo" : "Inactivo"}
                          </Badge>
                        </div>
                        <div className="text-lg font-bold text-green-600 mb-3">
                          ${(item.priceCents / 100).toFixed(2)}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            Ver
                          </Button>
                          <Button variant="outline" size="sm">
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
