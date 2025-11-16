"use client";

import { useState, type ReactNode } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";

import { useOrganization } from "@/contexts/organization-context";
import type { PlanId } from "@/data/plans";
import { Button } from "@/components/ui/button";

interface UpgradeButtonProps extends React.ComponentProps<typeof Button> {
  targetPlan?: PlanId;
  children?: ReactNode;
}

export function UpgradeButton({
  targetPlan = "PREMIUM",
  children = "Mejorar a Premium",
  ...props
}: UpgradeButtonProps) {
  const { data: session } = useSession();
  const { currentOrg } = useOrganization();
  const [isLoading, setIsLoading] = useState(false);

  const handleUpgrade = async () => {
    if (!currentOrg?.id) {
      toast.error("Selecciona un restaurante primero");
      return;
    }

    if (targetPlan !== "PREMIUM") {
      toast.error("Actualización no soportada desde este botón.");
      return;
    }

    setIsLoading(true);
    try {
      const adminPhone = "51900878539";
      const userName = session?.user?.name || "";
      const userEmail = session?.user?.email || "";
      const orgName = currentOrg.name;
      const orgSlug = currentOrg.slug;

      const message = [
        "Hola!!!, quiero activar el plan Premium.",
        `Restaurante: ${orgName} (${orgSlug})`,
        userName ? `Nombre: ${userName}` : null,
        userEmail
          ? `Correo: ${userEmail}`
          : "Correo: (no se detectó, lo adjunto en el mensaje)",
      ]
        .filter(Boolean)
        .join(" | ");

      const url = `https://wa.me/${adminPhone}?text=${encodeURIComponent(
        message
      )}`;

      if (typeof window !== "undefined") {
        window.open(url, "_blank", "noopener,noreferrer");
        toast.info("Se abrió WhatsApp para solicitar el upgrade.");
      } else {
        toast.info("Abre este enlace para solicitar Premium: " + url);
      }
    } catch (error) {
      console.error("Error redirecting to WhatsApp:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "No pudimos abrir WhatsApp. Intenta de nuevo."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleUpgrade}
      disabled={isLoading || !currentOrg}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Procesando...
        </>
      ) : (
        <>
          <Sparkles className="mr-2 h-4 w-4" />
          {children}
        </>
      )}
    </Button>
  );
}
