"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, RefreshCcw, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

type PendingInvitationActionsProps = {
  orgId: string;
  invitation: {
    id: string;
    email: string;
    role: string;
    expiresAt: Date;
  };
};

export function PendingInvitationActions({
  orgId,
  invitation,
}: PendingInvitationActionsProps) {
  const router = useRouter();
  const [isCancelling, setIsCancelling] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const handleCancel = async () => {
    if (isResending) return;
    setIsCancelling(true);
    try {
      const response = await fetch(
        `/api/organizations/${orgId}/invitations/${invitation.id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "No se pudo cancelar la invitacion");
      }

      toast.success("Invitacion cancelada", {
        description: invitation.email,
      });
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error inesperado"
      );
    } finally {
      setIsCancelling(false);
    }
  };

  const handleResend = async () => {
    if (isCancelling) return;
    setIsResending(true);
    try {
      const response = await fetch(
        `/api/organizations/${orgId}/invitations/${invitation.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action: "resend" }),
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "No se pudo reenviar la invitacion");
      }

      toast.success("Invitacion reenviada", {
        description: invitation.email,
      });
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error inesperado"
      );
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleResend}
        disabled={isResending || isCancelling}
        className="flex items-center gap-2"
      >
        {isResending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <RefreshCcw className="h-4 w-4" />
        )}
        Reenviar
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleCancel}
        disabled={isCancelling || isResending}
        className="flex items-center gap-2 text-red-600 hover:text-red-700"
      >
        {isCancelling ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <XCircle className="h-4 w-4" />
        )}
        Cancelar
      </Button>
    </div>
  );
}


