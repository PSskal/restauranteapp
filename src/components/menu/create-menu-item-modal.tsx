"use client";

import { useState } from "react";
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
import { Loader2, ChefHat, Upload, X } from "lucide-react";

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
});

interface Category {
  id: string;
  name: string;
  itemCount: number;
}

interface CreateMenuItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  organizationId: string;
  categories: Category[];
}

export function CreateMenuItemModal({
  open,
  onOpenChange,
  onSuccess,
  organizationId,
  categories,
}: CreateMenuItemModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Función para manejar la selección de archivo
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validar que sea imagen
      if (!file.type.startsWith("image/")) {
        toast.error("Solo se permiten archivos de imagen");
        return;
      }

      // Validar tamaño (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("La imagen excede el tamaño máximo de 5MB");
        return;
      }

      setSelectedFile(file);

      // Crear preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Función para subir imagen a Vercel Blob
  const uploadImage = async (): Promise<string | null> => {
    if (!selectedFile) return null;

    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("orgId", organizationId);

      const response = await fetch("/api/upload/image", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        // Intentar obtener el mensaje de error del servidor
        let errorMessage = "Error al subir imagen";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // Si no se puede parsear el JSON, usar mensaje genérico
          errorMessage = `Error ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const { url } = await response.json();
      return url;
    } catch (error) {
      console.error("Error uploading image:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Error al subir la imagen";
      toast.error("Error al subir la imagen", {
        description: errorMessage,
      });
      return null;
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Función para remover imagen seleccionada
  const removeSelectedImage = () => {
    setSelectedFile(null);
    setImagePreview(null);
    form.setValue("imageUrl", "");

    // También resetear el input de archivo
    const fileInput = document.getElementById(
      "file-upload"
    ) as HTMLInputElement;
    if (fileInput) {
      fileInput.value = "";
    }

    toast.success("Imagen eliminada");
  };

  // Función para limpiar completamente el modal
  const resetModal = () => {
    form.reset();
    setSelectedFile(null);
    setImagePreview(null);

    // Resetear el input de archivo
    const fileInput = document.getElementById(
      "file-upload"
    ) as HTMLInputElement;
    if (fileInput) {
      fileInput.value = "";
    }
  };

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      price: "",
      categoryId: "",
      description: "",
      imageUrl: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      // Subir imagen si hay una seleccionada
      let imageUrl = values.imageUrl || "";
      if (selectedFile) {
        const uploadedUrl = await uploadImage();
        if (uploadedUrl) {
          imageUrl = uploadedUrl;
        }
      }

      const response = await fetch(
        `/api/organizations/${organizationId}/menu-items`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: values.name,
            price: parseFloat(values.price),
            categoryId: values.categoryId,
            description: values.description || undefined,
            imageUrl: imageUrl || undefined,
            active: true,
          }),
        }
      );

      if (response.ok) {
        resetModal();
        onOpenChange(false);
        onSuccess();
        toast.success("¡Producto creado exitosamente!", {
          description: `${values.name} ha sido agregado a tu menú por $${values.price}.`,
        });
      } else {
        const error = await response.json();
        const errorMessage = error.error || "Error al crear el producto";
        form.setError("name", {
          type: "manual",
          message: errorMessage,
        });
        toast.error("Error al crear producto", {
          description: errorMessage,
        });
      }
    } catch (error) {
      console.error("Error creating menu item:", error);
      const errorMessage = "Error de conexión";
      form.setError("name", {
        type: "manual",
        message: errorMessage,
      });
      toast.error("Error de conexión", {
        description: "No se pudo conectar con el servidor. Inténtalo de nuevo.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ChefHat className="h-5 w-5 text-primary" />
            Nuevo Producto
          </DialogTitle>
          <DialogDescription>
            Agrega un nuevo producto a tu menú. Asegúrate de seleccionar la
            categoría correcta.
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
                      defaultValue={field.value}
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
                  <FormLabel>Imagen del producto</FormLabel>
                  <FormControl>
                    <div className="space-y-4">
                      {/* Opción 1: Subir archivo */}
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Subir desde tu computadora
                        </label>
                        <div className="flex items-center gap-4">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() =>
                              document.getElementById("file-upload")?.click()
                            }
                            disabled={isLoading || isUploadingImage}
                            className="flex items-center gap-2"
                          >
                            <Upload className="h-4 w-4" />
                            {selectedFile
                              ? "Cambiar imagen"
                              : "Seleccionar imagen"}
                          </Button>
                          <input
                            id="file-upload"
                            type="file"
                            accept="image/*"
                            onChange={handleFileSelect}
                            className="hidden"
                          />
                          {selectedFile && (
                            <span className="text-sm text-green-600 flex items-center gap-1">
                              ✓ Imagen seleccionada
                            </span>
                          )}
                        </div>

                        {/* Preview de imagen seleccionada */}
                        {imagePreview && (
                          <div className="mt-4 relative inline-block">
                            <Image
                              src={imagePreview}
                              alt="Preview"
                              width={200}
                              height={150}
                              className="rounded-lg object-cover border"
                            />
                            {/* Botón de eliminar sobre la imagen */}
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={removeSelectedImage}
                              disabled={isLoading || isUploadingImage}
                              className="absolute top-2 right-2 h-8 w-8 p-0"
                              title="Eliminar imagen"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                            <p className="text-xs text-gray-500 mt-2">
                              Haz clic en la X para eliminar esta imagen
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  resetModal();
                  onOpenChange(false);
                }}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creando...
                  </>
                ) : (
                  "Crear Producto"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
