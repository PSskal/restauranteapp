"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, ChefHat } from "lucide-react";

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

type Station = {
  id: string;
  name: string;
  color: string | null;
  position: number;
  active: boolean;
};

const PRESET_COLORS = [
  "#F97316",
  "#22C55E",
  "#3B82F6",
  "#EC4899",
  "#8B5CF6",
  "#EAB308",
];

export function KitchenSettingsClient() {
  const { currentOrg, isLoading: orgLoading } = useOrganization();
  const orgId = currentOrg?.id ?? null;

  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const response = await fetch(
        `/api/organizations/${orgId}/kitchen-stations`
      );
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "No se pudieron cargar las estaciones");
      }
      const data = (await response.json()) as { stations: Station[] };
      setStations(data.stations);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error cargando estaciones"
      );
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    load();
  }, [load]);

  const create = async () => {
    if (!orgId || !newName.trim()) return;
    setCreating(true);
    try {
      const response = await fetch(
        `/api/organizations/${orgId}/kitchen-stations`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newName.trim(), color: newColor }),
        }
      );
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "No se pudo crear la estación");
      }
      setNewName("");
      await load();
      toast.success("Estación creada");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error creando estación"
      );
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (station: Station, active: boolean) => {
    if (!orgId) return;
    try {
      const response = await fetch(
        `/api/organizations/${orgId}/kitchen-stations/${station.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ active }),
        }
      );
      if (!response.ok) throw new Error("No se pudo actualizar");
      setStations((prev) =>
        prev.map((s) => (s.id === station.id ? { ...s, active } : s))
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error actualizando estación"
      );
    }
  };

  const remove = async (station: Station) => {
    if (!orgId) return;
    if (!confirm(`¿Eliminar la estación "${station.name}"?`)) return;
    try {
      const response = await fetch(
        `/api/organizations/${orgId}/kitchen-stations/${station.id}`,
        { method: "DELETE" }
      );
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "No se pudo eliminar");
      }
      setStations((prev) => prev.filter((s) => s.id !== station.id));
      toast.success("Estación eliminada");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error eliminando estación"
      );
    }
  };

  if (orgLoading || !orgId) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Cargando...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ChefHat className="h-5 w-5 text-primary" />
            Estaciones de cocina
          </CardTitle>
          <CardDescription>
            Dirige cada plato a la estación correcta (bar, parrilla, postre,
            caliente, fría…). En el KDS cada cocinero verá sólo lo suyo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2 rounded-lg border bg-muted/30 p-4">
            <Label htmlFor="station-name" className="text-xs">
              Nombre de la estación
            </Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="station-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ej. Parrilla"
                disabled={creating}
                maxLength={60}
              />
              <div className="flex items-center gap-1">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`h-7 w-7 rounded-full border-2 transition ${
                      newColor === color
                        ? "border-primary scale-110"
                        : "border-transparent hover:border-border"
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setNewColor(color)}
                    aria-label={`Color ${color}`}
                  />
                ))}
              </div>
              <Button
                type="button"
                onClick={create}
                disabled={creating || !newName.trim()}
                className="gap-2"
              >
                {creating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Crear estación
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            {loading ? (
              <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Cargando...
              </div>
            ) : stations.length === 0 ? (
              <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                Aún no hay estaciones. Crea la primera arriba.
              </p>
            ) : (
              stations.map((station) => (
                <div
                  key={station.id}
                  className="flex items-center justify-between rounded-lg border bg-card p-3"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="inline-block h-4 w-4 rounded-full"
                      style={{
                        backgroundColor: station.color ?? "#94A3B8",
                      }}
                    />
                    <span className="font-medium">{station.name}</span>
                    {!station.active ? (
                      <span className="text-xs text-muted-foreground">
                        (inactiva)
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground">Activa</span>
                      <Switch
                        checked={station.active}
                        onCheckedChange={(checked) =>
                          toggleActive(station, checked)
                        }
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => remove(station)}
                      aria-label="Eliminar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
