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
import { AcceptInvitationButton } from "@/components/staff/accept-invitation-button";

function getRoleLabel(role: string) {
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
}

export default async function InviteTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const session = await auth();
  const { token } = await params;

  if (!session?.user?.id) {
    const callbackUrl = encodeURIComponent(`/invite/${token}`);
    redirect(`/login?callbackUrl=${callbackUrl}`);
  }

  const userEmail = session.user.email?.toLowerCase();

  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: {
      org: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!invitation) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Invitacion no encontrada</CardTitle>
            <CardDescription>
              Verifica que el enlace sea correcto o solicita una nueva
              invitacion.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const now = new Date();
  const isExpired = invitation.expiresAt < now;
  const alreadyAccepted = Boolean(invitation.acceptedAt);
  const emailMatches = userEmail === invitation.email;

  return (
    <div className="flex min-h-[70vh] items-center justify-center p-4">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>Invitacion a {invitation.org.name}</CardTitle>
          <CardDescription>
            Revisa la informacion y acepta para unirte al restaurante.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm text-muted-foreground">Correo invitado</p>
                <p className="text-base font-medium">{invitation.email}</p>
              </div>
              <Badge variant={emailMatches ? "default" : "destructive"}>
                {emailMatches ? "Coincide con tu sesion" : "Correo diferente"}
              </Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm text-muted-foreground">Rol asignado</p>
                <p className="text-base font-medium">
                  {getRoleLabel(invitation.role)}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm text-muted-foreground">Valida hasta</p>
                <p className="text-base font-medium">
                  {invitation.expiresAt.toLocaleString()}
                </p>
              </div>
              {isExpired ? <Badge variant="destructive">Expirada</Badge> : null}
              {alreadyAccepted ? (
                <Badge variant="secondary">Aceptada</Badge>
              ) : null}
            </div>
          </div>

          {!emailMatches && (
            <p className="text-sm text-red-600">
              Debes iniciar sesion con el correo {invitation.email} para aceptar
              esta invitacion.
            </p>
          )}

          {alreadyAccepted && (
            <p className="text-sm text-muted-foreground">
              Esta invitacion ya fue aceptada anteriormente. Puedes acceder
              desde el dashboard.
            </p>
          )}

          {isExpired && (
            <p className="text-sm text-muted-foreground">
              El enlace expiro. Pide a un administrador que envie una nueva
              invitacion.
            </p>
          )}

          {emailMatches && !isExpired && !alreadyAccepted ? (
            <div className="flex justify-end">
              <AcceptInvitationButton token={invitation.token} />
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
