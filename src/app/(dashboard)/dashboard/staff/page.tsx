import { redirect } from "next/navigation";
import Image from "next/image";
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
import { Users, Mail, Crown, Shield, User } from "lucide-react";
import { InviteStaffDialog } from "@/components/staff/invite-staff-dialog";
import { PendingInvitationActions } from "@/components/staff/pending-invitation-actions";

export default async function StaffPage() {
  // Verificar autenticación
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Obtener la primera organización del usuario con memberships
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
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      memberships: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
        orderBy: {
          role: "asc",
        },
      },
      invitations: {
        where: {
          acceptedAt: null,
          expiresAt: {
            gt: new Date(),
          },
        },
        orderBy: {
          createdAt: "desc",
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
            Necesitas crear un restaurante para gestionar el personal.
          </p>
          <Button className="mt-4" asChild>
            <a href="/dashboard">Volver al Dashboard</a>
          </Button>
        </div>
      </div>
    );
  }

  // Verificar si es owner o manager para mostrar funciones de gestión
  const isOwner = currentOrg.ownerId === session.user?.id;
  const userMembership = currentOrg.memberships.find(
    (m) => m.userId === session.user?.id
  );
  const canManageStaff = isOwner || userMembership?.role === "MANAGER";

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getRoleColor = (role: string) => {
    switch (role) {
      case "OWNER":
        return "default";
      case "MANAGER":
        return "default";
      case "CASHIER":
        return "secondary";
      case "WAITER":
        return "outline";
      case "KITCHEN":
        return "outline";
      default:
        return "secondary";
    }
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case "OWNER":
        return "Propietario";
      case "MANAGER":
        return "Gerente";
      case "CASHIER":
        return "Cajero";
      case "WAITER":
        return "Mesero";
      case "KITCHEN":
        return "Cocina";
      default:
        return role;
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "OWNER":
        return Crown;
      case "MANAGER":
        return Shield;
      default:
        return User;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Personal</h1>
          <p className="text-muted-foreground">
            Restaurante: <span className="font-medium">{currentOrg.name}</span>
          </p>
        </div>
        {canManageStaff && (
          <InviteStaffDialog orgId={currentOrg.id} orgName={currentOrg.name} />
        )}
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Miembros
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentOrg.memberships.length + 1}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Invitaciones Pendientes
            </CardTitle>
            <Mail className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {currentOrg.invitations.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gerentes</CardTitle>
            <Shield className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {currentOrg.memberships.filter((m) => m.role === "MANAGER")
                .length + (isOwner ? 1 : 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Meseros</CardTitle>
            <User className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {currentOrg.memberships.filter((m) => m.role === "WAITER").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de miembros */}
      <Card>
        <CardHeader>
          <CardTitle>Miembros del Equipo</CardTitle>
          <CardDescription>
            Gestiona los roles y permisos del personal de tu restaurante
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Owner siempre aparece primero */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                  {currentOrg.owner.image ? (
                    <Image
                      src={currentOrg.owner.image}
                      alt={currentOrg.owner.name || "Owner"}
                      className="w-10 h-10 rounded-full"
                      width={40}
                      height={40}
                    />
                  ) : (
                    <Crown className="h-5 w-5 text-gray-600" />
                  )}
                </div>
                <div>
                  <div className="font-medium">
                    {currentOrg.owner.name || "Sin nombre"}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {currentOrg.owner.email}
                  </div>
                </div>
              </div>
            </div>

            {/* Otros miembros */}
            {currentOrg.memberships.map((membership) => {
              const RoleIcon = getRoleIcon(membership.role);
              return (
                <div
                  key={membership.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      {membership.user.image ? (
                        <Image
                          src={membership.user.image}
                          alt={membership.user.name || "User"}
                          className="w-10 h-10 rounded-full"
                          width={40}
                          height={40}
                        />
                      ) : (
                        <RoleIcon className="h-5 w-5 text-gray-600" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium">
                        {membership.user.name || "Sin nombre"}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {membership.user.email}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Invitaciones pendientes */}
      {currentOrg.invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Invitaciones Pendientes</CardTitle>
            <CardDescription>
              Invitaciones enviadas que aún no han sido aceptadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {currentOrg.invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between p-3 border rounded-lg bg-orange-50"
                >
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-orange-500" />
                    <div>
                      <div className="font-medium">{invitation.email}</div>
                      <div className="text-sm text-muted-foreground">
                        Invitado como {getRoleText(invitation.role)} • Expira:{" "}
                        {new Date(invitation.expiresAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant="outline"
                      className="text-orange-600 border-orange-300"
                    >
                      Pendiente
                    </Badge>
                    {canManageStaff ? (
                      <PendingInvitationActions
                        orgId={currentOrg.id}
                        invitation={{
                          id: invitation.id,
                          email: invitation.email,
                          role: invitation.role,
                          expiresAt: invitation.expiresAt,
                        }}
                      />
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
