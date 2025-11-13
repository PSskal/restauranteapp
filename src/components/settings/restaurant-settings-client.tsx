"use client";

import { useOrganization } from "@/contexts/organization-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Save } from "lucide-react";
import { useState } from "react";

export function RestaurantSettingsClient() {
  const { currentOrg } = useOrganization();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: currentOrg?.name || "Mi Primer Restaurante",
    address: "",
    phone: "",
    email: "",
    description: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // TODO: Implementar API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      console.log("Restaurant updated:", formData);
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentOrg) {
    return (
      <div className="space-y-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-gray-500">
              Cargando datos de la organización...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Información del Restaurante</CardTitle>
          <CardDescription>
            Actualiza la información básica y datos de contacto de tu
            restaurante.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre del Restaurante</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Nombre del Restaurante"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Número de Teléfono</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {/* <div className="space-y-2">
                <Label htmlFor="email">Correo Electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, email: e.target.value }))
                  }
                  placeholder="contact@restaurant.com"
                />
              </div> */}

              <div className="space-y-2">
                <Label htmlFor="address">Dirección</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      address: e.target.value,
                    }))
                  }
                  placeholder="123 Main Street, City"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Brief description of your restaurant..."
                className="min-h-[100px]"
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isLoading}>
                <Save className="mr-2 h-4 w-4" />
                {isLoading ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Horarios de Atención</CardTitle>
          <CardDescription>
            Establece los horarios de funcionamiento de tu restaurante.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            "Lunes",
            "Martes",
            "Miércoles",
            "Jueves",
            "Viernes",
            "Sábado",
            "Domingo",
          ].map((day) => (
            <div key={day} className="flex items-center gap-4">
              <div className="w-20 text-sm font-medium">{day}</div>
              <Input type="time" className="w-32" defaultValue="09:00" />
              <span className="text-gray-500">a</span>
              <Input type="time" className="w-32" defaultValue="22:00" />
              <div className="flex items-center gap-2">
                <Switch defaultChecked />
                <Label className="text-sm">Abierto</Label>
              </div>
            </div>
          ))}

          <div className="flex justify-end pt-4">
            <Button>Guardar Horarios</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
