"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Percent, Gift, CircleDollarSign } from "lucide-react";

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

type DiscountType = "PERCENT" | "FIXED" | "COMP";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  orderId: string | null;
  netDueC: number;
  onApplied?: () => void;
};

const formatCurrency = (cents: number) => `S/ ${(cents / 100).toFixed(2)}`;

export function DiscountDialog({
  open,
  onOpenChange,
  orgId,
  orderId,
  netDueC,
  onApplied,
}: Props) {
  const [type, setType] = useState<DiscountType>("PERCENT");
  const [percentValue, setPercentValue] = useState("10");
  const [fixedValue, setFixedValue] = useState("");
  const [reason, setReason] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setType("PERCENT");
      setPercentValue("10");
      setFixedValue("");
      setReason("");
    }
  }, [open]);

  const preview = (() => {
    if (type === "COMP") return netDueC;
    if (type === "PERCENT") {
      const pct = parseFloat(percentValue);
      if (Number.isNaN(pct) || pct <= 0) return 0;
      return Math.floor((netDueC * Math.round(pct * 100)) / 10000);
    }
    const fixed = Math.round(parseFloat(fixedValue || "0") * 100);
    if (Number.isNaN(fixed) || fixed <= 0) return 0;
    return Math.min(fixed, netDueC);
  })();

  const canSubmit = Boolean(
    orderId && reason.trim().length > 0 && preview > 0 && !isSaving
  );

  const submit = async () => {
    if (!orderId || !canSubmit) return;
    setIsSaving(true);
    try {
      const body: {
        type: DiscountType;
        reason: string;
        valueBp?: number;
        valueC?: number;
      } = {
        type,
        reason: reason.trim(),
      };
      if (type === "PERCENT") {
        body.valueBp = Math.round(parseFloat(percentValue) * 100);
      } else if (type === "FIXED") {
        body.valueC = Math.round(parseFloat(fixedValue) * 100);
      }

      const response = await fetch(
        `/api/organizations/${orgId}/orders/${orderId}/discounts`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "No se pudo aplicar el descuento");
      }

      toast.success("Descuento aplicado");
      onApplied?.();
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error aplicando descuento"
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Aplicar descuento</DialogTitle>
          <DialogDescription>
            Saldo actual del pedido: {formatCurrency(netDueC)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              className={`flex flex-col items-center gap-1 rounded-md border p-3 text-xs transition ${
                type === "PERCENT"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-muted/40"
              }`}
              onClick={() => setType("PERCENT")}
            >
              <Percent className="h-4 w-4" />
              Porcentaje
            </button>
            <button
              type="button"
              className={`flex flex-col items-center gap-1 rounded-md border p-3 text-xs transition ${
                type === "FIXED"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-muted/40"
              }`}
              onClick={() => setType("FIXED")}
            >
              <CircleDollarSign className="h-4 w-4" />
              Monto fijo
            </button>
            <button
              type="button"
              className={`flex flex-col items-center gap-1 rounded-md border p-3 text-xs transition ${
                type === "COMP"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-muted/40"
              }`}
              onClick={() => setType("COMP")}
            >
              <Gift className="h-4 w-4" />
              Cortesía
            </button>
          </div>

          {type === "PERCENT" ? (
            <div className="space-y-2">
              <Label htmlFor="pct" className="text-xs">
                Porcentaje (%)
              </Label>
              <Input
                id="pct"
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={percentValue}
                onChange={(e) => setPercentValue(e.target.value)}
                disabled={isSaving}
              />
              <div className="flex gap-1">
                {[5, 10, 15, 20].map((pct) => (
                  <Button
                    key={pct}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 flex-1 text-xs"
                    onClick={() => setPercentValue(String(pct))}
                    disabled={isSaving}
                  >
                    {pct}%
                  </Button>
                ))}
              </div>
            </div>
          ) : null}

          {type === "FIXED" ? (
            <div className="space-y-2">
              <Label htmlFor="fixed" className="text-xs">
                Monto (S/)
              </Label>
              <Input
                id="fixed"
                type="number"
                step="0.01"
                min="0"
                value={fixedValue}
                onChange={(e) => setFixedValue(e.target.value)}
                placeholder="0.00"
                disabled={isSaving}
              />
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="reason" className="text-xs">
              Motivo (requerido)
            </Label>
            <Input
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej. Cliente frecuente, problema con el plato..."
              maxLength={200}
              disabled={isSaving}
            />
          </div>

          <div className="rounded-md border bg-muted/30 p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Descuento a aplicar</span>
              <span className="font-semibold text-destructive">
                -{formatCurrency(preview)}
              </span>
            </div>
            <div className="flex justify-between pt-1 text-xs text-muted-foreground">
              <span>Saldo tras descuento</span>
              <span>{formatCurrency(Math.max(0, netDueC - preview))}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancelar
          </Button>
          <Button type="button" onClick={submit} disabled={!canSubmit}>
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Aplicar descuento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
