"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Mail, Timer } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

interface TrialResponse {
  user: {
    id: string;
    email: string;
    name: string | null;
  };
  trialEndsAt: string;
  organizations: {
    id: string;
    name: string;
    slug: string;
    plan: string;
    planExpiresAt: string | null;
    planUpdatedAt: string | null;
  }[];
}

export function GrantPremiumForm() {
  const [email, setEmail] = useState("");
  const [months, setMonths] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TrialResponse | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/admin/premium-trials", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          months,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const errorMessage =
          typeof data?.error === "string"
            ? data.error
            : Array.isArray(data?.error?.email)
            ? data.error.email.join(", ")
            : "No pudimos otorgar la prueba con esos datos.";
        throw new Error(errorMessage);
      }

      setResult(data);

      toast.success("Plan Premium activado temporalmente.");
      setEmail("");
    } catch (error) {
      console.error("Error granting premium trial:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "No pudimos activar la prueba. Intenta nuevamente."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const parsedExpiration = result?.trialEndsAt
    ? new Date(result.trialEndsAt)
    : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,480px)_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Activar prueba para un restaurante</CardTitle>
          <CardDescription>
            Ingresa el correo del owner. Todas sus organizaciones pasarán a
            Premium durante el período seleccionado.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Correo del owner</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="dueño@restaurante.com"
                  value={email}
                  required
                  disabled={isLoading}
                  onChange={(event) => setEmail(event.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="months">Duración (meses)</Label>
              <div className="relative">
                <Timer className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="months"
                  type="number"
                  min={1}
                  max={12}
                  value={months}
                  disabled={isLoading}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    if (Number.isNaN(value)) {
                      return;
                    }
                    const clamped = Math.min(12, Math.max(1, value));
                    setMonths(clamped);
                  }}
                  className="pl-9"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Valor por defecto: 1 mes de Premium sin pago.
              </p>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !email.trim()}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Activando acceso...
                </>
              ) : (
                "Otorgar Premium temporal"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Alert>
          <CheckCircle2 className="text-primary" />
          <AlertTitle>Sin pasar por Stripe</AlertTitle>
          <AlertDescription>
            Usa este panel sólo para pruebas manuales. Cuando se integre el pago
            real, esta ruta se apagará y toda la lógica pasará a webhooks.
          </AlertDescription>
        </Alert>

        {result && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Prueba activada
              </CardTitle>
              <CardDescription>
                {result.user.name
                  ? `${result.user.name} (${result.user.email})`
                  : result.user.email}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {parsedExpiration && (
                <div className="rounded-md bg-muted px-4 py-3 text-sm">
                  El plan volverá a Free el{" "}
                  <span className="font-semibold">
                    {parsedExpiration.toLocaleDateString()}
                  </span>
                  .
                </div>
              )}

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Restaurantes actualizados:
                </p>
                <div className="space-y-2">
                  {result.organizations.map((org) => (
                    <div
                      key={org.id}
                      className="flex flex-wrap items-center justify-between rounded-md border px-3 py-2 text-sm"
                    >
                      <div>
                        <p className="font-medium">{org.name}</p>
                        <p className="text-muted-foreground">/{org.slug}</p>
                      </div>
                      <Badge variant="secondary" className="mt-2 sm:mt-0">
                        Premium activo
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
