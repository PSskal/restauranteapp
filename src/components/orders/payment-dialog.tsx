"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Banknote, CreditCard, Loader2 } from "lucide-react";

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

type PaymentMethod = "CASH" | "CARD";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  orderId: string | null;
  netDueC: number;
  paidC: number;
  onPaid?: () => void;
};

const formatCurrency = (cents: number) => `S/ ${(cents / 100).toFixed(2)}`;

export function PaymentDialog({
  open,
  onOpenChange,
  orgId,
  orderId,
  netDueC,
  paidC,
  onPaid,
}: Props) {
  const remainingC = Math.max(0, netDueC - paidC);

  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [amountInput, setAmountInput] = useState("");
  const [tipInput, setTipInput] = useState("0.00");
  const [tipMode, setTipMode] = useState<"preset" | "custom">("preset");
  const [tipPreset, setTipPreset] = useState<0 | 10 | 15 | 20>(0);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setMethod("CASH");
      setAmountInput((remainingC / 100).toFixed(2));
      setTipInput("0.00");
      setTipMode("preset");
      setTipPreset(0);
    }
  }, [open, remainingC]);

  const amountC = useMemo(() => {
    const parsed = Math.round(parseFloat(amountInput || "0") * 100);
    return Number.isNaN(parsed) ? 0 : Math.max(0, parsed);
  }, [amountInput]);

  const tipC = useMemo(() => {
    if (tipMode === "preset") {
      if (tipPreset === 0) return 0;
      return Math.floor((amountC * tipPreset) / 100);
    }
    const parsed = Math.round(parseFloat(tipInput || "0") * 100);
    return Number.isNaN(parsed) ? 0 : Math.max(0, parsed);
  }, [tipMode, tipPreset, tipInput, amountC]);

  const canSubmit =
    Boolean(orderId) &&
    amountC > 0 &&
    amountC <= remainingC &&
    !isSaving;

  const submit = async () => {
    if (!orderId || !canSubmit) return;
    setIsSaving(true);
    try {
      const response = await fetch(
        `/api/organizations/${orgId}/orders/${orderId}/pay`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ method, amountC, tipC }),
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "No se pudo registrar el pago");
      }

      toast.success(
        amountC >= remainingC
          ? "Pedido pagado completamente"
          : `Pago parcial de ${formatCurrency(amountC)} registrado`
      );
      onPaid?.();
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error registrando pago"
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Registrar pago</DialogTitle>
          <DialogDescription>
            Saldo pendiente: {formatCurrency(remainingC)}
            {paidC > 0 ? ` · Ya pagado: ${formatCurrency(paidC)}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="mb-2 block text-xs">Método</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className={`flex items-center justify-center gap-2 rounded-md border p-3 text-sm transition ${
                  method === "CASH"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/40"
                }`}
                onClick={() => setMethod("CASH")}
              >
                <Banknote className="h-4 w-4" />
                Efectivo
              </button>
              <button
                type="button"
                className={`flex items-center justify-center gap-2 rounded-md border p-3 text-sm transition ${
                  method === "CARD"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/40"
                }`}
                onClick={() => setMethod("CARD")}
              >
                <CreditCard className="h-4 w-4" />
                Tarjeta
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount" className="text-xs">
              Monto a cobrar (S/)
            </Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              disabled={isSaving}
            />
            <div className="flex gap-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 flex-1 text-xs"
                onClick={() =>
                  setAmountInput(((remainingC / 2) / 100).toFixed(2))
                }
                disabled={isSaving}
              >
                Mitad
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 flex-1 text-xs"
                onClick={() => setAmountInput((remainingC / 100).toFixed(2))}
                disabled={isSaving}
              >
                Total
              </Button>
            </div>
          </div>

          <div>
            <Label className="mb-2 block text-xs">Propina</Label>
            <div className="grid grid-cols-5 gap-1">
              {[0, 10, 15, 20].map((pct) => (
                <Button
                  key={pct}
                  type="button"
                  variant={
                    tipMode === "preset" && tipPreset === pct
                      ? "default"
                      : "outline"
                  }
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => {
                    setTipMode("preset");
                    setTipPreset(pct as 0 | 10 | 15 | 20);
                  }}
                  disabled={isSaving}
                >
                  {pct === 0 ? "Sin" : `${pct}%`}
                </Button>
              ))}
              <Button
                type="button"
                variant={tipMode === "custom" ? "default" : "outline"}
                size="sm"
                className="h-8 text-xs"
                onClick={() => setTipMode("custom")}
                disabled={isSaving}
              >
                Otra
              </Button>
            </div>
            {tipMode === "custom" ? (
              <Input
                type="number"
                step="0.01"
                min="0"
                value={tipInput}
                onChange={(e) => setTipInput(e.target.value)}
                className="mt-2"
                placeholder="Propina en S/"
                disabled={isSaving}
              />
            ) : null}
          </div>

          <div className="rounded-md border bg-muted/30 p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cobro</span>
              <span className="font-semibold">{formatCurrency(amountC)}</span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Propina</span>
              <span>+{formatCurrency(tipC)}</span>
            </div>
            <div className="mt-1 flex justify-between border-t pt-1">
              <span className="text-sm font-semibold">Total a cobrar</span>
              <span className="text-base font-bold">
                {formatCurrency(amountC + tipC)}
              </span>
            </div>
            {amountC > remainingC ? (
              <p className="mt-1 text-xs text-destructive">
                Excede el saldo pendiente
              </p>
            ) : null}
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
            Confirmar pago
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
