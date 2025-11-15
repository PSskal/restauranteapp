"use client";

import { Phone, Share2 } from "lucide-react";
import { useEffect, useState } from "react";

import { useOrganization } from "@/contexts/organization-context";
import { PLAN_CARDS, PLAN_LIMITS } from "@/data/plans";
import { UpgradeButton } from "@/components/plans/upgrade-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

const getAppOrigin = () =>
  typeof window !== "undefined"
    ? window.location.origin
    : process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";

const buildPublicLink = (slug?: string | null) => {
  const origin = getAppOrigin();
  return slug ? `${origin}/${slug}` : origin;
};

export function GeneralSettingsClient() {
  const { currentOrg, refreshOrganizations } = useOrganization();
  const [restaurantName, setRestaurantName] = useState(currentOrg?.name || "");
  const [isLoading, setIsLoading] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState(
    currentOrg?.whatsappNumber ?? ""
  );
  const [whatsappEnabled, setWhatsappEnabled] = useState(
    currentOrg?.whatsappOrderingEnabled ?? false
  );
  const [isSavingWhatsapp, setIsSavingWhatsapp] = useState(false);
  const [publicLink, setPublicLink] = useState(() =>
    buildPublicLink(currentOrg?.slug)
  );

  useEffect(() => {
    if (!currentOrg) {
      setRestaurantName("");
      setWhatsappNumber("");
      setWhatsappEnabled(false);
      setPublicLink(buildPublicLink());
      return;
    }

    setRestaurantName(currentOrg.name);
    setWhatsappNumber(currentOrg.whatsappNumber ?? "");
    setWhatsappEnabled(currentOrg.whatsappOrderingEnabled ?? false);
    setPublicLink(buildPublicLink(currentOrg.slug));
  }, [currentOrg]);

  const handleSaveRestaurantName = async () => {
    if (!currentOrg) return;

    if (!restaurantName.trim()) {
      toast.error("El nombre del restaurante no puede estar vacío");
      return;
    }

    if (restaurantName.length > 32) {
      toast.error("El nombre no puede tener más de 32 caracteres");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/organizations/${currentOrg.id}/name`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: restaurantName }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error al actualizar el nombre");
      }

      await refreshOrganizations();
      toast.success("Nombre del restaurante actualizado exitosamente");
    } catch (error) {
      console.error("Error updating restaurant name:", error);
      toast.error(
        error instanceof Error ? error.message : "Error al actualizar el nombre"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyPublicLink = async () => {
    if (!publicLink) return;

    try {
      await navigator.clipboard.writeText(publicLink);
      toast.success("Enlace copiado al portapapeles");
    } catch (error) {
      console.error("Error copying public link:", error);
      toast.error("No se pudo copiar el enlace");
    }
  };

  const handleSaveWhatsappSettings = async () => {
    if (!currentOrg) return;

    if (whatsappEnabled && whatsappNumber.trim().length < 6) {
      toast.error("Ingresa un número con código de país para WhatsApp");
      return;
    }

    setIsSavingWhatsapp(true);
    try {
      const response = await fetch(
        `/api/organizations/${currentOrg.id}/profile`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            whatsappNumber: whatsappNumber.trim(),
            whatsappOrderingEnabled: whatsappEnabled,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          error.error || "No se pudo guardar la configuración de WhatsApp"
        );
      }

      const data = await response.json();
      setWhatsappEnabled(data.organization.whatsappOrderingEnabled);
      setWhatsappNumber(data.organization.whatsappNumber ?? "");
      toast.success("Configuración de WhatsApp guardada");
      await refreshOrganizations();
    } catch (error) {
      console.error("Error updating WhatsApp settings:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo guardar la configuración"
      );
    } finally {
      setIsSavingWhatsapp(false);
    }
  };

  if (!currentOrg) {
    return (
      <div className="space-y-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-gray-500">
              Cargando datos de la organización...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isPremium = currentOrg.plan === "PREMIUM";

  return (
    <div className="space-y-8">
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>
              Plan actual: {PLAN_CARDS[currentOrg.plan].name}
            </CardTitle>
            <CardDescription>
              {PLAN_CARDS[currentOrg.plan].description}
            </CardDescription>
          </div>
          {currentOrg.plan === "PREMIUM" ? (
            <Badge className="w-fit">Premium activo</Badge>
          ) : null}
        </CardHeader>
        <CardContent className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-3xl font-semibold text-primary">
              {PLAN_CARDS[currentOrg.plan].priceLabel}
              <span className="text-lg font-normal text-muted-foreground">
                /mes
              </span>
            </p>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li>
                Hasta{" "}
                <strong>
                  {PLAN_LIMITS[currentOrg.plan].tables ?? "mesas ilimitadas"}
                </strong>{" "}
                activas
              </li>
              <li>
                {PLAN_LIMITS[currentOrg.plan].menuItems
                  ? `${PLAN_LIMITS[currentOrg.plan].menuItems} productos en el menú`
                  : "Productos ilimitados en el menú"}
              </li>
              <li>
                {PLAN_LIMITS[currentOrg.plan].staffSeats === 1
                  ? "1 usuario por restaurante"
                  : `${PLAN_LIMITS[currentOrg.plan].staffSeats} usuarios por restaurante`}
              </li>
            </ul>
          </div>
          {currentOrg.plan === "FREE" ? (
            <UpgradeButton className="w-full md:w-auto">
              Mejorar a Premium
            </UpgradeButton>
          ) : (
            <p className="text-sm text-muted-foreground">
              Disfruta de todas las funciones avanzadas con tu plan Premium.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Nombre del Restaurante</CardTitle>
          <CardDescription>
            Este es el nombre de tu restaurante que se muestra en la plataforma.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="restaurant-name">Nombre del Restaurante</Label>
            <Input
              id="restaurant-name"
              placeholder="Mi Restaurante"
              value={restaurantName}
              onChange={(e) => setRestaurantName(e.target.value)}
              className="max-w-md"
            />
            <p className="text-sm text-gray-500">Máximo 32 caracteres.</p>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleSaveRestaurantName}
              disabled={isLoading || restaurantName === currentOrg.name}
            >
              {isLoading ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Link público y pedidos por WhatsApp</CardTitle>
          <CardDescription>
            Comparte tu carta y permite que los clientes envíen pedidos directos
            a tu número.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="public-link">Enlace público</Label>
            <div className="flex flex-col gap-2 md:flex-row">
              <Input
                id="public-link"
                readOnly
                value={publicLink}
                className="font-mono text-sm"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleCopyPublicLink}
                disabled={!publicLink}
              >
                <Share2 className="mr-2 h-4 w-4" />
                Copiar enlace
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              {isPremium
                ? "Comparte este link para que tus clientes vean tu menú en vivo."
                : "Actualiza a Premium para habilitar la carta pública y el pedido por WhatsApp."}
            </p>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label className="flex items-center gap-2 text-base font-medium">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  Pedidos por WhatsApp
                </Label>
                <p className="text-sm text-muted-foreground">
                  Activa el botón “Enviar pedido por WhatsApp” en tu carta
                  pública.
                </p>
              </div>
              <Switch
                checked={whatsappEnabled}
                onCheckedChange={setWhatsappEnabled}
                disabled={!isPremium || isSavingWhatsapp}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="whatsapp-number">Número de WhatsApp</Label>
                <Input
                  id="whatsapp-number"
                  placeholder="+51 900 000 000"
                  value={whatsappNumber}
                  onChange={(event) => setWhatsappNumber(event.target.value)}
                  disabled={!isPremium || isSavingWhatsapp}
                />
                <p className="text-xs text-muted-foreground">
                  Usa el formato internacional (sin espacios ni guiones al
                  guardar).
                </p>
              </div>
              <div className="space-y-2">
                <Label>Estado actual</Label>
                <Badge
                  variant={whatsappEnabled ? "default" : "secondary"}
                  className="w-fit"
                >
                  {whatsappEnabled ? "Pedidos activos" : "Pedidos desactivados"}
                </Badge>
              </div>
            </div>

            <div className="flex justify-end">
              {isPremium ? (
                <Button
                  onClick={handleSaveWhatsappSettings}
                  disabled={isSavingWhatsapp}
                >
                  {isSavingWhatsapp ? "Guardando..." : "Guardar configuración"}
                </Button>
              ) : (
                <UpgradeButton>Mejorar a Premium</UpgradeButton>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configuraciones de la Aplicación</CardTitle>
          <CardDescription>
            Configura cómo se comporta la aplicación.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">
                Notificaciones de Pedidos
              </Label>
              <p className="text-sm text-gray-500">
                Recibe notificaciones para nuevos pedidos
              </p>
            </div>
            <Switch defaultChecked />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">
                Actualización Automática
              </Label>
              <p className="text-sm text-gray-500">
                Actualiza automáticamente los pedidos cada 10 segundos
              </p>
            </div>
            <Switch defaultChecked />
          </div>

          <div className="flex justify-end">
            <Button>Guardar Cambios</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
