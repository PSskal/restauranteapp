"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Settings2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

type ModifierDraft = {
  id?: string;
  tempId: string;
  name: string;
  priceDelta: string;
  active: boolean;
};

type GroupDraft = {
  id?: string;
  tempId: string;
  name: string;
  required: boolean;
  minSelect: number;
  maxSelect: number;
  modifiers: ModifierDraft[];
};

type ServerModifier = {
  id: string;
  name: string;
  priceDeltaC: number;
  position: number;
  active: boolean;
};

type ServerGroup = {
  id: string;
  name: string;
  required: boolean;
  minSelect: number;
  maxSelect: number;
  position: number;
  modifiers: ServerModifier[];
};

type ModifiersModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  menuItem: { id: string; name: string } | null;
  onSaved?: () => void;
};

let tempCounter = 0;
const nextTempId = () => `temp-${++tempCounter}-${Date.now()}`;

function serverGroupToDraft(group: ServerGroup): GroupDraft {
  return {
    id: group.id,
    tempId: nextTempId(),
    name: group.name,
    required: group.required,
    minSelect: group.minSelect,
    maxSelect: group.maxSelect,
    modifiers: group.modifiers.map((modifier) => ({
      id: modifier.id,
      tempId: nextTempId(),
      name: modifier.name,
      priceDelta: (modifier.priceDeltaC / 100).toFixed(2),
      active: modifier.active,
    })),
  };
}

export function ModifiersModal({
  open,
  onOpenChange,
  organizationId,
  menuItem,
  onSaved,
}: ModifiersModalProps) {
  const [groups, setGroups] = useState<GroupDraft[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const loadGroups = useCallback(async () => {
    if (!menuItem) return;
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/organizations/${organizationId}/menu-items/${menuItem.id}/modifiers`
      );
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "No pudimos cargar los modificadores");
      }
      const data = (await response.json()) as { groups: ServerGroup[] };
      setGroups(data.groups.map(serverGroupToDraft));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Error cargando modificadores";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [menuItem, organizationId]);

  useEffect(() => {
    if (open && menuItem) {
      loadGroups();
    } else if (!open) {
      setGroups([]);
    }
  }, [loadGroups, menuItem, open]);

  const addGroup = () => {
    setGroups((prev) => [
      ...prev,
      {
        tempId: nextTempId(),
        name: "",
        required: false,
        minSelect: 0,
        maxSelect: 1,
        modifiers: [],
      },
    ]);
  };

  const removeGroup = (tempId: string) => {
    setGroups((prev) => prev.filter((group) => group.tempId !== tempId));
  };

  const updateGroup = (tempId: string, patch: Partial<GroupDraft>) => {
    setGroups((prev) =>
      prev.map((group) =>
        group.tempId === tempId ? { ...group, ...patch } : group
      )
    );
  };

  const addModifier = (groupTempId: string) => {
    setGroups((prev) =>
      prev.map((group) =>
        group.tempId === groupTempId
          ? {
              ...group,
              modifiers: [
                ...group.modifiers,
                {
                  tempId: nextTempId(),
                  name: "",
                  priceDelta: "0.00",
                  active: true,
                },
              ],
            }
          : group
      )
    );
  };

  const updateModifier = (
    groupTempId: string,
    modTempId: string,
    patch: Partial<ModifierDraft>
  ) => {
    setGroups((prev) =>
      prev.map((group) =>
        group.tempId === groupTempId
          ? {
              ...group,
              modifiers: group.modifiers.map((modifier) =>
                modifier.tempId === modTempId
                  ? { ...modifier, ...patch }
                  : modifier
              ),
            }
          : group
      )
    );
  };

  const removeModifier = (groupTempId: string, modTempId: string) => {
    setGroups((prev) =>
      prev.map((group) =>
        group.tempId === groupTempId
          ? {
              ...group,
              modifiers: group.modifiers.filter(
                (modifier) => modifier.tempId !== modTempId
              ),
            }
          : group
      )
    );
  };

  const handleSave = async () => {
    if (!menuItem) return;

    for (const group of groups) {
      if (!group.name.trim()) {
        toast.error("Todos los grupos deben tener nombre");
        return;
      }
      if (group.minSelect > group.maxSelect) {
        toast.error(
          `En "${group.name}": el mínimo no puede ser mayor que el máximo`
        );
        return;
      }
      if (group.required && group.minSelect < 1) {
        toast.error(
          `El grupo "${group.name}" es obligatorio pero el mínimo es 0`
        );
        return;
      }
      for (const modifier of group.modifiers) {
        if (!modifier.name.trim()) {
          toast.error(`En "${group.name}": todas las opciones necesitan nombre`);
          return;
        }
        if (Number.isNaN(parseFloat(modifier.priceDelta))) {
          toast.error(
            `En "${group.name} > ${modifier.name}": precio adicional inválido`
          );
          return;
        }
      }
    }

    setIsSaving(true);
    try {
      const payload = {
        groups: groups.map((group, gIndex) => ({
          id: group.id,
          name: group.name.trim(),
          required: group.required,
          minSelect: group.minSelect,
          maxSelect: group.maxSelect,
          position: gIndex,
          modifiers: group.modifiers.map((modifier, mIndex) => ({
            id: modifier.id,
            name: modifier.name.trim(),
            priceDeltaC: Math.round(parseFloat(modifier.priceDelta) * 100),
            position: mIndex,
            active: modifier.active,
          })),
        })),
      };

      const response = await fetch(
        `/api/organizations/${organizationId}/menu-items/${menuItem.id}/modifiers`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "No pudimos guardar los modificadores");
      }

      toast.success("Modificadores actualizados");
      onSaved?.();
      onOpenChange(false);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Error guardando modificadores";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            Modificadores — {menuItem?.name}
          </DialogTitle>
          <DialogDescription>
            Crea grupos (ej. &quot;Término&quot;, &quot;Extras&quot;) y opciones
            dentro de cada grupo. Puedes cobrar un adicional por opción.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Cargando...
          </div>
        ) : (
          <div className="space-y-4">
            {groups.length === 0 ? (
              <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                Aún no hay grupos. Agrega uno para permitir personalizar el
                plato (ej. tamaño, término, extras).
              </div>
            ) : null}

            {groups.map((group) => (
              <div
                key={group.tempId}
                className="space-y-3 rounded-lg border bg-card p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-2">
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                      Nombre del grupo
                    </Label>
                    <Input
                      value={group.name}
                      onChange={(event) =>
                        updateGroup(group.tempId, { name: event.target.value })
                      }
                      placeholder="Ej. Término de la carne"
                      disabled={isSaving}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => removeGroup(group.tempId)}
                    disabled={isSaving}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="flex items-center justify-between rounded-md border p-2 text-xs">
                    <span>Obligatorio</span>
                    <Switch
                      checked={group.required}
                      onCheckedChange={(checked) =>
                        updateGroup(group.tempId, {
                          required: checked,
                          minSelect:
                            checked && group.minSelect < 1
                              ? 1
                              : group.minSelect,
                        })
                      }
                      disabled={isSaving}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Mínimo</Label>
                    <Input
                      type="number"
                      min={0}
                      max={20}
                      value={group.minSelect}
                      onChange={(event) =>
                        updateGroup(group.tempId, {
                          minSelect: Math.max(
                            0,
                            parseInt(event.target.value || "0", 10)
                          ),
                        })
                      }
                      disabled={isSaving}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Máximo</Label>
                    <Input
                      type="number"
                      min={1}
                      max={20}
                      value={group.maxSelect}
                      onChange={(event) =>
                        updateGroup(group.tempId, {
                          maxSelect: Math.max(
                            1,
                            parseInt(event.target.value || "1", 10)
                          ),
                        })
                      }
                      disabled={isSaving}
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                      Opciones
                    </Label>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => addModifier(group.tempId)}
                      disabled={isSaving}
                      className="gap-1"
                    >
                      <Plus className="h-3 w-3" />
                      Agregar opción
                    </Button>
                  </div>
                  {group.modifiers.length === 0 ? (
                    <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                      Sin opciones aún.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {group.modifiers.map((modifier) => (
                        <div
                          key={modifier.tempId}
                          className="grid grid-cols-[1fr_110px_40px_40px] items-center gap-2"
                        >
                          <Input
                            value={modifier.name}
                            onChange={(event) =>
                              updateModifier(group.tempId, modifier.tempId, {
                                name: event.target.value,
                              })
                            }
                            placeholder="Ej. Extra queso"
                            disabled={isSaving}
                          />
                          <Input
                            type="number"
                            step="0.01"
                            value={modifier.priceDelta}
                            onChange={(event) =>
                              updateModifier(group.tempId, modifier.tempId, {
                                priceDelta: event.target.value,
                              })
                            }
                            placeholder="0.00"
                            disabled={isSaving}
                          />
                          <Switch
                            checked={modifier.active}
                            onCheckedChange={(checked) =>
                              updateModifier(group.tempId, modifier.tempId, {
                                active: checked,
                              })
                            }
                            disabled={isSaving}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() =>
                              removeModifier(group.tempId, modifier.tempId)
                            }
                            disabled={isSaving}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              onClick={addGroup}
              disabled={isSaving}
            >
              <Plus className="h-4 w-4" />
              Agregar grupo de modificadores
            </Button>
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancelar
          </Button>
          <Button type="button" onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              "Guardar modificadores"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
