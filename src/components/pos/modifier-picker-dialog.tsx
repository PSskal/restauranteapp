"use client";

import { useEffect, useMemo, useState } from "react";
import { Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const formatCurrency = (cents: number) => `S/ ${(cents / 100).toFixed(2)}`;

export type ModifierPickerModifier = {
  id: string;
  name: string;
  priceDeltaC: number;
};

export type ModifierPickerGroup = {
  id: string;
  name: string;
  required: boolean;
  minSelect: number;
  maxSelect: number;
  position: number;
  modifiers: ModifierPickerModifier[];
};

export type ModifierPickerItem = {
  id: string;
  name: string;
  priceCents: number;
  modifierGroups: ModifierPickerGroup[];
};

export type ModifierSelection = {
  modifierId: string;
  groupName: string;
  name: string;
  priceDeltaC: number;
};

type Props = {
  item: ModifierPickerItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (args: {
    modifiers: ModifierSelection[];
    quantity: number;
    notes?: string;
  }) => void;
};

export function ModifierPickerDialog({
  item,
  open,
  onOpenChange,
  onConfirm,
}: Props) {
  const [selectedByGroup, setSelectedByGroup] = useState<
    Record<string, string[]>
  >({});
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open && item) {
      setSelectedByGroup({});
      setQuantity(1);
      setNotes("");
    }
  }, [item, open]);

  const toggleModifier = (group: ModifierPickerGroup, modifierId: string) => {
    setSelectedByGroup((prev) => {
      const current = prev[group.id] ?? [];
      const alreadySelected = current.includes(modifierId);

      if (alreadySelected) {
        return { ...prev, [group.id]: current.filter((id) => id !== modifierId) };
      }

      if (group.maxSelect === 1) {
        return { ...prev, [group.id]: [modifierId] };
      }

      if (current.length >= group.maxSelect) {
        return prev;
      }

      return { ...prev, [group.id]: [...current, modifierId] };
    });
  };

  const { totalDeltaC, errors } = useMemo(() => {
    if (!item) return { totalDeltaC: 0, errors: [] as string[] };
    let totalDeltaC = 0;
    const errors: string[] = [];
    for (const group of item.modifierGroups) {
      const chosen = selectedByGroup[group.id] ?? [];
      if (chosen.length < group.minSelect) {
        errors.push(
          `En "${group.name}" debes elegir al menos ${group.minSelect}`,
        );
      }
      for (const modifierId of chosen) {
        const modifier = group.modifiers.find((m) => m.id === modifierId);
        if (modifier) totalDeltaC += modifier.priceDeltaC;
      }
    }
    return { totalDeltaC, errors };
  }, [item, selectedByGroup]);

  if (!item) return null;

  const unitPrice = item.priceCents + totalDeltaC;

  const handleConfirm = () => {
    if (errors.length > 0) return;
    const modifiers: ModifierSelection[] = [];
    for (const group of item.modifierGroups) {
      const chosen = selectedByGroup[group.id] ?? [];
      for (const modifierId of chosen) {
        const modifier = group.modifiers.find((m) => m.id === modifierId);
        if (modifier) {
          modifiers.push({
            modifierId: modifier.id,
            groupName: group.name,
            name: modifier.name,
            priceDeltaC: modifier.priceDeltaC,
          });
        }
      }
    }
    onConfirm({
      modifiers,
      quantity,
      notes: notes.trim() || undefined,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{item.name}</DialogTitle>
          <DialogDescription>
            Personaliza el producto antes de enviarlo a cocina.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {item.modifierGroups.map((group) => {
            const chosen = selectedByGroup[group.id] ?? [];
            const inputType = group.maxSelect === 1 ? "radio" : "checkbox";
            return (
              <div key={group.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">
                    {group.name}
                    {group.required ? (
                      <span className="ml-1 text-xs text-destructive">*</span>
                    ) : null}
                  </Label>
                  <span className="text-xs text-muted-foreground">
                    {group.minSelect === group.maxSelect
                      ? `Elige ${group.minSelect}`
                      : `${group.minSelect}-${group.maxSelect}`}
                  </span>
                </div>
                <div className="space-y-1">
                  {group.modifiers.map((modifier) => {
                    const isChecked = chosen.includes(modifier.id);
                    return (
                      <label
                        key={modifier.id}
                        className={`flex cursor-pointer items-center justify-between rounded-md border p-2 text-sm transition ${
                          isChecked
                            ? "border-primary bg-primary/5"
                            : "border-border hover:bg-muted/40"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {inputType === "checkbox" ? (
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={() =>
                                toggleModifier(group, modifier.id)
                              }
                            />
                          ) : (
                            <input
                              type="radio"
                              name={group.id}
                              checked={isChecked}
                              onChange={() => toggleModifier(group, modifier.id)}
                              className="h-4 w-4 accent-primary"
                            />
                          )}
                          <span>{modifier.name}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {modifier.priceDeltaC === 0
                            ? "Sin costo"
                            : `${modifier.priceDeltaC > 0 ? "+" : ""}${formatCurrency(
                                modifier.priceDeltaC,
                              )}`}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <div className="space-y-2">
            <Label htmlFor="modifier-notes" className="text-sm font-semibold">
              Notas especiales
            </Label>
            <Textarea
              id="modifier-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={2}
              placeholder="Ej. sin cebolla, alérgico al maní..."
              maxLength={200}
            />
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <span className="text-sm font-semibold">Cantidad</span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className="w-8 text-center font-semibold">{quantity}</span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setQuantity((q) => Math.min(20, q + 1))}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {errors.length > 0 ? (
            <ul className="space-y-1 rounded-md bg-destructive/10 p-2 text-xs text-destructive">
              {errors.map((message) => (
                <li key={message}>• {message}</li>
              ))}
            </ul>
          ) : null}
        </div>

        <DialogFooter className="mt-2">
          <div className="flex w-full items-center justify-between gap-3">
            <div className="text-sm">
              <p className="text-muted-foreground">Subtotal</p>
              <p className="text-lg font-bold">
                {formatCurrency(unitPrice * quantity)}
              </p>
            </div>
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={errors.length > 0}
            >
              Agregar al pedido
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
