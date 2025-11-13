"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

type AcceptInvitationButtonProps = {
  token: string;
  redirectPath?: string;
};

export function AcceptInvitationButton({
  token,
  redirectPath = "/dashboard",
}: AcceptInvitationButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleAccept = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/invitations/${token}/accept`, {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        const message = data?.error || "No se pudo aceptar la invitacion";
        throw new Error(message);
      }

      toast.success("Invitacion aceptada", {
        description: "Ya formas parte del restaurante",
      });
      router.push(redirectPath);
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Error inesperado";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button onClick={handleAccept} disabled={isLoading}>
      {isLoading ? "Aceptando..." : "Aceptar invitacion"}
    </Button>
  );
}
