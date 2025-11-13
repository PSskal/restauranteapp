"use client";

import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Edit } from "lucide-react";

const formSchema = z.object({
  name: z
    .string()
    .min(1, "El nombre es requerido")
    .max(50, "Máximo 50 caracteres"),
  imageUrl: z
    .string()
    .url("Debe ser una URL válida")
    .optional()
    .or(z.literal("")),
});

interface Category {
  id: string;
  name: string;
  position: number;
  itemCount: number;
  imageUrl?: string;
}

interface EditCategoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  organizationId: string;
  category: Category | null;
}

export function EditCategoryModal({
  open,
  onOpenChange,
  onSuccess,
  organizationId,
  category,
}: EditCategoryModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      imageUrl: "",
    },
  });

  // Reset form when category changes or modal opens
  useEffect(() => {
    if (category && open) {
      form.reset({
        name: category.name,
        imageUrl: category.imageUrl || "",
      });
    }
  }, [category, open, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!category) return;

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/organizations/${organizationId}/categories/${category.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(values),
        }
      );

      if (response.ok) {
        onOpenChange(false);
        onSuccess();
        toast.success("¡Categoría actualizada!", {
          description: `La categoría se ha actualizado a "${values.name}".`,
        });
      } else {
        const error = await response.json();
        const errorMessage = error.error || "Error al actualizar la categoría";
        form.setError("name", {
          type: "manual",
          message: errorMessage,
        });
        toast.error("Error al actualizar categoría", {
          description: errorMessage,
        });
      }
    } catch (error) {
      console.error("Error updating category:", error);
      const errorMessage = "Error de conexión";
      form.setError("name", {
        type: "manual",
        message: errorMessage,
      });
      toast.error("Error de conexión", {
        description: "No se pudo conectar con el servidor.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5 text-primary" />
            Editar Categoría
          </DialogTitle>
          <DialogDescription>
            Modifica el nombre de la categoría &ldquo;{category?.name}&rdquo;.
            Los cambios se aplicarán inmediatamente.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre de la categoría</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="ej. Bebidas, Platos principales, Postres..."
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL de imagen (opcional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://ejemplo.com/imagen.jpg"
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <strong>Información:</strong> Esta categoría contiene{" "}
                {category?.itemCount || 0} productos. Al cambiar el nombre,
                todos los productos mantendrán su asociación.
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  "Guardar Cambios"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
