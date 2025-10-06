"use client";

import { useOrganization } from "@/contexts/organization-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";

export function GeneralSettingsClient() {
  const { currentOrg } = useOrganization();
  const [restaurantName, setRestaurantName] = useState(currentOrg?.name || "");
  const [isLoading, setIsLoading] = useState(false);

  const handleSaveRestaurantName = async () => {
    if (!currentOrg) return;

    setIsLoading(true);
    try {
      // TODO: Implementar API call para actualizar el nombre
      console.log("Updating restaurant name:", restaurantName);
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulated API call
    } catch (error) {
      console.error("Error updating restaurant name:", error);
    } finally {
      setIsLoading(false);
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

  return (
    <div className="space-y-8">
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
          <CardTitle>Configuraciones de la Aplicación</CardTitle>
          <CardDescription>
            Configura cómo se comporta la aplicación.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Modo Oscuro</Label>
              <p className="text-sm text-gray-500">
                Alterna entre tema claro y oscuro
              </p>
            </div>
            <Switch />
          </div>

          <Separator />

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
