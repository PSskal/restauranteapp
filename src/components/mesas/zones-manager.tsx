"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Zone = {
  id: string;
  name: string;
  color: string | null;
  position: number;
};

const PRESETS = [
  "#22C55E",
  "#3B82F6",
  "#F97316",
  "#EC4899",
  "#8B5CF6",
  "#0EA5E9",
];

type Props = {
  orgId: string;
  onZonesChanged?: () => void;
};

export function ZonesManager({ orgId, onZonesChanged }: Props) {
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(PRESETS[0]);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/organizations/${orgId}/zones`);
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "No se pudieron cargar las zonas");
      }
      const data = (await response.json()) as { zones: Zone[] };
      setZones(data.zones);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Error cargando zonas"
      );
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    load();
  }, [load]);

  const create = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const response = await fetch(`/api/organizations/${orgId}/zones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), color }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "No se pudo crear la zona");
      }
      setName("");
      await load();
      onZonesChanged?.();
      toast.success("Zona creada");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Error creando zona"
      );
    } finally {
      setCreating(false);
    }
  };

  const remove = async (zone: Zone) => {
    if (!confirm(`¿Eliminar la zona "${zone.name}"? Las mesas quedarán sin zona.`)) return;
    try {
      const response = await fetch(
        `/api/organizations/${orgId}/zones/${zone.id}`,
        { method: "DELETE" }
      );
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "No se pudo eliminar");
      }
      setZones((prev) => prev.filter((z) => z.id !== zone.id));
      onZonesChanged?.();
      toast.success("Zona eliminada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error eliminando");
    }
  };

  return (
    <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
      <div>
        <h3 className="text-sm font-semibold">Zonas del local</h3>
        <p className="text-xs text-muted-foreground">
          Agrupa tus mesas por zona (Terraza, Salón, Barra, VIP…). Mejora la
          vista de Sala y los reportes.
        </p>
      </div>

      <div className="space-y-2 rounded-md border bg-white p-3">
        <Label htmlFor="zone-name" className="text-xs">
          Nueva zona
        </Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id="zone-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Terraza"
            disabled={creating}
            maxLength={60}
          />
          <div className="flex items-center gap-1">
            {PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                aria-label={`Color ${preset}`}
                className={`h-7 w-7 rounded-full border-2 transition ${
                  color === preset
                    ? "border-primary scale-110"
                    : "border-transparent hover:border-border"
                }`}
                style={{ backgroundColor: preset }}
                onClick={() => setColor(preset)}
              />
            ))}
          </div>
          <Button
            type="button"
            onClick={create}
            disabled={creating || !name.trim()}
            className="gap-2"
          >
            {creating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Crear
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Cargando...
          </div>
        ) : zones.length === 0 ? (
          <p className="rounded-md border border-dashed bg-white p-4 text-center text-sm text-muted-foreground">
            Aún no hay zonas. Crea la primera arriba.
          </p>
        ) : (
          zones.map((zone) => (
            <div
              key={zone.id}
              className="flex items-center justify-between rounded-md border bg-white p-2"
            >
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-3 w-3 rounded-full"
                  style={{ backgroundColor: zone.color ?? "#94A3B8" }}
                />
                <span className="text-sm font-medium">{zone.name}</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-destructive"
                onClick={() => remove(zone)}
                aria-label="Eliminar zona"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
