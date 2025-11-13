"use client";

import type { ReactNode } from "react";
import { Lock } from "lucide-react";

import { useOrganization } from "@/contexts/organization-context";
import type { PlanId } from "@/data/plans";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { UpgradeButton } from "@/components/plans/upgrade-button";

interface PlanGateProps {
  title: string;
  description: string;
  requiredPlan?: PlanId;
  ctaLabel?: string;
  children?: ReactNode;
}

export function PlanGate({
  title,
  description,
  requiredPlan = "PREMIUM",
  ctaLabel = "Mejorar a Premium",
  children,
}: PlanGateProps) {
  const { currentOrg, isLoading } = useOrganization();

  if (isLoading && !currentOrg) {
    return (
      <Card className="border-dashed border-muted-foreground/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lock className="h-4 w-4 animate-pulse text-muted-foreground" />
            Cargando plan del restaurante...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  const hasAccess =
    !currentOrg || requiredPlan === "FREE"
      ? true
      : currentOrg.plan === requiredPlan;

  if (hasAccess) {
    return <>{children}</>;
  }

  return (
    <Card className="border-dashed border-2 border-primary/40 bg-muted/50">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Badge variant="secondary" className="bg-primary/20 text-primary">
              {requiredPlan}
            </Badge>
            {title}
          </CardTitle>
          <CardDescription className="mt-2 text-base text-muted-foreground">
            {description}
          </CardDescription>
        </div>
        <div className="mt-3 w-full sm:mt-0 sm:w-auto">
          <UpgradeButton>{ctaLabel}</UpgradeButton>
        </div>
      </CardHeader>
      <CardContent className="flex items-center gap-3 text-sm text-muted-foreground">
        <Lock className="h-4 w-4" />
        Esta sección est� bloqueada para el plan Free. Actualiza para
        desbloquearla.
      </CardContent>
    </Card>
  );
}
