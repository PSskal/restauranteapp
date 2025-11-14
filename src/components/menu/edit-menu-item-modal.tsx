"use client";

import { useState, useEffect, useRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { toast } from "sonner";
import Image from "next/image";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2, Edit, Upload, X, Image as ImageIcon } from "lucide-react";

const formSchema = z.object({
  name: z
    .string()
    .min(1, "El nombre es requerido")
    .max(100, "Máximo 100 caracteres"),
  price: z.string().refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  }, "El precio debe ser un número válido mayor a 0"),
  categoryId: z.string().min(1, "Debes seleccionar una categoría"),
  description: z.string().optional(),
  imageUrl: z
    .string()
    .url("Debe ser una URL válida")
    .optional()
    .or(z.literal("")),
  active: z.boolean(),
});

interface Category {
  id: string;
  name: string;
  itemCount: number;
}

interface MenuItem {
  id: string;
  name: string;
  price: number;
  active: boolean;
  description?: string;
  imageUrl?: string;
  category: {
    id: string;
    name: string;
  };
}

interface EditMenuItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  organizationId: string;
  categories: Category[];
  menuItem: MenuItem | null;
}

export function EditMenuItemModal({
  open,
  onOpenChange,
  onSuccess,
  organizationId,
  categories,
  menuItem,
}: EditMenuItemModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      price: "",
      categoryId: "",
      description: "",
      imageUrl: "",
      active: true,
    },
  });

  // Reset form when menuItem changes or modal opens
  useEffect(() => {
    if (menuItem && open) {
      form.reset({
        name: menuItem.name,
        price: menuItem.price.toString(),
        categoryId: menuItem.category.id,
        description: menuItem.description || "",
        imageUrl: menuItem.imageUrl || "",
        active: menuItem.active,
      });
      setImagePreview(menuItem.imageUrl || null);
    }
  }, [menuItem, open, form]);

  const handleImageUpload = async (file: File) => {
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith("image/")) {
      toast.error("El archivo debe ser una imagen");
      return;
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("La imagen no debe superar los 5MB");
      return;
    }

    setIsUploadingImage(true);
    toast.info("📊 Subiendo imagen...");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("orgId", organizationId);

      const response = await fetch("/api/upload/image", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error al subir la imagen");
      }

      const data = await response.json();
      form.setValue("imageUrl", data.url);
      setImagePreview(data.url);
      toast.success("Imagen subida correctamente");
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Error al subir la imagen", {
        description:
          error instanceof Error ? error.message : "Inténtalo de nuevo",
      });
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleRemoveImage = () => {
    form.setValue("imageUrl", "");
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!menuItem) return;

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/organizations/${organizationId}/menu-items/${menuItem.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: values.name,
            price: parseFloat(values.price),
            categoryId: values.categoryId,
            description: values.description || undefined,
            imageUrl: values.imageUrl || undefined,
            active: values.active,
          }),
        }
      );

      if (response.ok) {
        onOpenChange(false);
        onSuccess();
        toast.success("¡Producto actualizado!", {
          description: `${values.name} ha sido actualizado exitosamente.`,
        });
      } else {
        const error = await response.json();
        const errorMessage = error.error || "Error al actualizar el producto";
        form.setError("name", {
          type: "manual",
          message: errorMessage,
        });
        toast.error("Error al actualizar producto", {
          description: errorMessage,
        });
      }
    } catch (error) {
      console.error("Error updating menu item:", error);
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
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5 text-primary" />
            Editar Producto
          </DialogTitle>
          <DialogDescription>
            Modifica la información del producto &ldquo;{menuItem?.name}&rdquo;.
            Todos los cambios se aplicarán inmediatamente.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del producto</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="ej. Hamburguesa clásica"
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Precio ($)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
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
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoría</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isLoading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar categoría" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name} ({category.itemCount} productos)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe los ingredientes o características del producto..."
                      className="resize-none"
                      rows={3}
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
              render={() => (
                <FormItem>
                  <FormLabel>Imagen del producto (opcional)</FormLabel>
                  <FormControl>
                    <div className="space-y-4">
                      {imagePreview ? (
                        <div className="relative aspect-video w-full overflow-hidden rounded-lg border">
                          <Image
                            src={imagePreview}
                            alt="Preview del producto"
                            fill
                            className="object-cover"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute right-2 top-2"
                            onClick={handleRemoveImage}
                            disabled={isLoading || isUploadingImage}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 p-8">
                          <div className="text-center">
                            <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground/50" />
                            <p className="mt-2 text-sm text-muted-foreground">
                              Sin imagen
                            </p>
                          </div>
                        </div>
                      )}
                      <div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageUpload(file);
                          }}
                          disabled={isLoading || isUploadingImage}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isLoading || isUploadingImage}
                        >
                          {isUploadingImage ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Subiendo...
                            </>
                          ) : (
                            <>
                              <Upload className="mr-2 h-4 w-4" />
                              {imagePreview ? "Cambiar imagen" : "Subir imagen"}
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      Estado del producto
                    </FormLabel>
                    <div className="text-sm text-muted-foreground">
                      {field.value
                        ? "El producto está visible para los clientes"
                        : "El producto está oculto del menú público"}
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isLoading}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

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
