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
import { Badge } from "@/components/ui/badge";
import CreateOrgForm from "@/components/dashboard/create-org-form";

export default async function DashboardPage() {
  // Verificar autenticación
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  // La creación del usuario se maneja en el callback de auth.ts

  // Buscar organizaciones del usuario de forma simplificada
  const userMemberships = await prisma.membership.findMany({
    where: {
      userId: session.user.id,
    },
    include: {
      org: true,
    },
  });

  // Buscar organizaciones propias (como owner)
  const ownedOrgs = await prisma.organization.findMany({
    where: {
      ownerId: session.user.id,
    },
  });

  // Combinar todas las organizaciones
  const allOrgs = [...ownedOrgs, ...userMemberships.map((m) => m.org)];

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
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Bienvenido de vuelta, {session.user.name || session.user.email}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {uniqueOrgs.map((org) => (
          <Card key={org.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{org.name}</CardTitle>
                <Badge variant="secondary">
                  {ownedOrgs.some((o) => o.id === org.id) ? "Owner" : "Member"}
                </Badge>
              </div>
              <CardDescription>Slug: {org.slug}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                Creado: {new Date(org.createdAt).toLocaleDateString()}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Restaurantes</CardTitle>
            <div className="h-4 w-4">🏪</div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueOrgs.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Como Owner</CardTitle>
            <div className="h-4 w-4">👑</div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ownedOrgs.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Como Member</CardTitle>
            <div className="h-4 w-4">👥</div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userMemberships.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Activo</CardTitle>
            <div className="h-4 w-4">📊</div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {uniqueOrgs.length}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

