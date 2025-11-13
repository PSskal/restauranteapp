"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";

interface CreateOrgFormProps {
  userId: string;
}

export default function CreateOrgForm({ userId }: CreateOrgFormProps) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  console.log("CreateOrgForm - userId:", userId);

  // Auto-generar slug basado en el nombre
  const handleNameChange = (value: string) => {
    setName(value);
    const generatedSlug = value
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 30);
    setSlug(generatedSlug);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !slug.trim()) {
      toast.error("Por favor completa todos los campos");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/organizations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim(),
          ownerId: userId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Error al crear el restaurante");
      }

      const organization = await response.json();
      toast.success(`¡Restaurante "${organization.name}" creado exitosamente!`);

      // Recargar la página para mostrar el dashboard
      router.refresh();
    } catch (error) {
      console.error("Error creating organization:", error);
      toast.error(
        error instanceof Error ? error.message : "Error al crear el restaurante"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>Crear tu Restaurante</CardTitle>
        <CardDescription>
          Configura tu primer restaurante para empezar a gestionar pedidos
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre del Restaurante</Label>
            <Input
              id="name"
              type="text"
              placeholder="Mi Restaurante Favorito"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">
              URL del Restaurante
              <span className="text-sm text-gray-500 ml-1">
                (se genera automáticamente)
              </span>
            </Label>
            <div className="flex">
              <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                restaurante.app/
              </span>
              <Input
                id="slug"
                type="text"
                className="rounded-l-none"
                placeholder="mi-restaurante"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <p className="text-xs text-gray-500">
              Esta será la URL única de tu restaurante para los códigos QR
            </p>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading || !name.trim() || !slug.trim()}
          >
            {isLoading ? "Creando..." : "Crear Restaurante"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
