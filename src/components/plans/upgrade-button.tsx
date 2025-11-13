"use client";

import { useState, type ReactNode } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

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
  const { currentOrg, refreshOrganizations } = useOrganization();
  const [isLoading, setIsLoading] = useState(false);

  const handleUpgrade = async () => {
    if (!currentOrg?.id) {
      toast.error("Selecciona un restaurante primero");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/organizations/${currentOrg.id}/plan`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plan: targetPlan }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.error || "No pudimos actualizar el plan en este momento"
        );
      }

      toast.success(
        targetPlan === "PREMIUM"
          ? "¡Listo! Activaste el plan Premium."
          : "Plan actualizado."
      );

      await refreshOrganizations();
    } catch (error) {
      console.error("Error upgrading plan:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "No pudimos actualizar tu plan. Intenta de nuevo."
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
