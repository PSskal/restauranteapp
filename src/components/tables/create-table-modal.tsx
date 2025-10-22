"use client";

import { useState } from "react";
import { useOrganization } from "@/contexts/organization-context";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle } from "lucide-react";

interface CreateTableModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTableCreated: () => void;
}

export function CreateTableModal({
  open,
  onOpenChange,
  onTableCreated,
}: CreateTableModalProps) {
  const { currentOrg } = useOrganization();
  const [number, setNumber] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentOrg) {
      setError("No hay organización seleccionada");
      return;
    }

    if (!number || parseInt(number) < 1) {
      setError("El número de mesa debe ser un entero positivo");
      return;
    }

    setIsCreating(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `/api/organizations/${currentOrg.id}/tables`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            number: parseInt(number),
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        setSuccess(
          `Mesa ${number} creada. Recuerda habilitarla cuando haya comensales.`
        );
        setNumber("");
        onTableCreated(); // Recargar la lista de mesas

        // Cerrar modal después de 1 segundo
        setTimeout(() => {
          onOpenChange(false);
          setSuccess("");
        }, 1000);
      } else {
        setError(data.error || "Error al crear la mesa");
      }
    } catch (error) {
      console.error("Error creating table:", error);
      setError("Error de conexión. Intenta nuevamente.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    if (!isCreating) {
      onOpenChange(false);
      setNumber("");
      setError("");
      setSuccess("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Crear Nueva Mesa</DialogTitle>
          <DialogDescription>
            Agrega una nueva mesa al restaurante {currentOrg?.name}. Las mesas nuevas se crean deshabilitadas hasta que las habilites desde la lista.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="number">Número de Mesa</Label>
            <Input
              id="number"
              type="number"
              min="1"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder="Ej: 1, 2, 3..."
              disabled={isCreating}
              required
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isCreating}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isCreating || !number}>
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creando...
                </>
              ) : (
                "Crear Mesa"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
