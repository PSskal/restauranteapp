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
import { MapPin, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const DAY_LABELS = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
] as const;

interface OpeningHourForm {
  dayOfWeek: number;
  label: string;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

const buildDefaultOpeningHours = (): OpeningHourForm[] =>
  DAY_LABELS.map((label, index) => ({
    dayOfWeek: index,
    label,
    isOpen: true,
    openTime: "09:00",
    closeTime: "22:00",
  }));

interface ApiOpeningHour {
  dayOfWeek: number;
  isOpen: boolean;
  openTime: string | null;
  closeTime: string | null;
}

export function RestaurantSettingsClient() {
  const { currentOrg, refreshOrganizations } = useOrganization();
  const [isLoading, setIsLoading] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isFetchingProfile, setIsFetchingProfile] = useState(true);
  const [openingHours, setOpeningHours] = useState<OpeningHourForm[]>(
    buildDefaultOpeningHours()
  );
  const [formData, setFormData] = useState({
    name: currentOrg?.name || "Mi Primer Restaurante",
    address: currentOrg?.address || "",
    phone: currentOrg?.phone || "",
    email: currentOrg?.email || "",
    description: currentOrg?.description || "",
    latitude: currentOrg?.latitude ?? null,
    longitude: currentOrg?.longitude ?? null,
    whatsappNumber: currentOrg?.whatsappNumber || "",
    whatsappOrderingEnabled: currentOrg?.whatsappOrderingEnabled || false,
  });
  const mapOpeningHoursFromApi = (data?: ApiOpeningHour[]) => {
    if (!data?.length) {
      return buildDefaultOpeningHours();
    }

    return buildDefaultOpeningHours().map((slot) => {
      const match = data.find((hour) => hour.dayOfWeek === slot.dayOfWeek);
      if (!match) {
        return slot;
      }

      return {
        ...slot,
        isOpen: match.isOpen,
        openTime: match.openTime ?? slot.openTime,
        closeTime: match.closeTime ?? slot.closeTime,
      };
    });
  };

  useEffect(() => {
    if (!currentOrg?.id) {
      setIsFetchingProfile(false);
      return;
    }

    const fetchProfile = async () => {
      setIsFetchingProfile(true);
      try {
        const response = await fetch(
          `/api/organizations/${currentOrg.id}/profile`
        );

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new Error(
            error.error || "No se pudo cargar la información del restaurante"
          );
        }

        const data = await response.json();
        setFormData({
          name: data.organization.name ?? currentOrg.name,
          address: data.organization.address ?? "",
          phone: data.organization.phone ?? "",
          email: data.organization.email ?? "",
          description: data.organization.description ?? "",
          latitude: data.organization.latitude,
          longitude: data.organization.longitude,
          whatsappNumber: data.organization.whatsappNumber ?? "",
          whatsappOrderingEnabled:
            data.organization.whatsappOrderingEnabled ?? false,
        });
        setOpeningHours(mapOpeningHoursFromApi(data.organization.openingHours));
      } catch (error) {
        console.error("Error fetching restaurant profile:", error);
        toast.error(
          error instanceof Error
            ? error.message
            : "No se pudo cargar la información del restaurante"
        );
      } finally {
        setIsFetchingProfile(false);
      }
    };

    fetchProfile();
  }, [currentOrg?.id, currentOrg?.name]);

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Tu navegador no soporta geolocalización");
      return;
    }

    setIsGettingLocation(true);
    toast.info("Obteniendo coordenadas...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;

        setFormData((prev) => ({
          ...prev,
          latitude,
          longitude,
        }));

        setIsGettingLocation(false);
        toast.success("Coordenadas obtenidas correctamente");
      },
      (error) => {
        setIsGettingLocation(false);
        console.error("Error getting location:", error);

        switch (error.code) {
          case error.PERMISSION_DENIED:
            toast.error("Permiso de ubicación denegado");
            break;
          case error.POSITION_UNAVAILABLE:
            toast.error("Ubicación no disponible");
            break;
          case error.TIMEOUT:
            toast.error("Tiempo de espera agotado");
            break;
          default:
            toast.error("Error al obtener ubicación");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handleOpeningHourToggle = (dayOfWeek: number, isOpen: boolean) => {
    setOpeningHours((prev) =>
      prev.map((hour) =>
        hour.dayOfWeek === dayOfWeek ? { ...hour, isOpen } : hour
      )
    );
  };

  const handleOpeningHourTimeChange = (
    dayOfWeek: number,
    field: "openTime" | "closeTime",
    value: string
  ) => {
    setOpeningHours((prev) =>
      prev.map((hour) =>
        hour.dayOfWeek === dayOfWeek ? { ...hour, [field]: value } : hour
      )
    );
  };

  const saveProfile = async () => {
    console.log("🔍 saveProfile called");
    console.log("Current Org:", currentOrg);
    console.log("Form Data:", formData);

    if (!currentOrg) {
      toast.error("No hay un restaurante activo");
      return;
    }

    const trimmedName = formData.name.trim();
    if (!trimmedName) {
      toast.error("El nombre del restaurante no puede estar vacío");
      return;
    }

    if (trimmedName.length > 64) {
      toast.error("El nombre del restaurante es demasiado largo");
      return;
    }

    const invalidDay = openingHours.find(
      (hour) => hour.isOpen && (!hour.openTime || !hour.closeTime)
    );

    if (invalidDay) {
      toast.error(
        `Completa el horario para ${invalidDay.label} antes de guardar`
      );
      return;
    }

    setIsLoading(true);
    console.log(
      "🚀 Sending PATCH request to:",
      `/api/organizations/${currentOrg.id}/profile`
    );

    try {
      const payload = {
        name: trimmedName,
        address: formData.address,
        phone: formData.phone,
        email: formData.email,
        description: formData.description,
        latitude: formData.latitude,
        longitude: formData.longitude,
        whatsappNumber: formData.whatsappNumber,
        whatsappOrderingEnabled: formData.whatsappOrderingEnabled,
        openingHours: openingHours.map((hour) => ({
          dayOfWeek: hour.dayOfWeek,
          isOpen: hour.isOpen,
          openTime: hour.isOpen ? hour.openTime : null,
          closeTime: hour.isOpen ? hour.closeTime : null,
        })),
      };

      console.log("📦 Payload:", payload);

      const response = await fetch(
        `/api/organizations/${currentOrg.id}/profile`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      console.log("📥 Response status:", response.status);

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        console.error("❌ Error response:", error);
        throw new Error(
          error.error || "No se pudo guardar la información del restaurante"
        );
      }

      const data = await response.json();
      console.log("✅ Success response:", data);

      setFormData({
        name: data.organization.name ?? trimmedName,
        address: data.organization.address ?? "",
        phone: data.organization.phone ?? "",
        email: data.organization.email ?? "",
        description: data.organization.description ?? "",
        latitude: data.organization.latitude,
        longitude: data.organization.longitude,
        whatsappNumber: data.organization.whatsappNumber ?? "",
        whatsappOrderingEnabled:
          data.organization.whatsappOrderingEnabled ?? false,
      });
      setOpeningHours(mapOpeningHoursFromApi(data.organization.openingHours));
      toast.success("Información del restaurante actualizada");
      await refreshOrganizations();
    } catch (error) {
      console.error("❌ Error updating restaurant profile:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo guardar la información del restaurante"
      );
    } finally {
      setIsLoading(false);
    }
  };
  const handleSubmit = async (event: React.FormEvent) => {
    console.log("🎯 handleSubmit called");
    event.preventDefault();
    await saveProfile();
  };

  if (!currentOrg || isFetchingProfile) {
    return (
      <div className="space-y-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-gray-500">
              {isFetchingProfile
                ? "Cargando información del restaurante..."
                : "Cargando datos de la organización..."}
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
                  placeholder="+51 987 654 321"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, email: e.target.value }))
                  }
                  placeholder="contacto@restaurante.com"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp (opcional)</Label>
                <Input
                  id="whatsapp"
                  type="tel"
                  value={formData.whatsappNumber}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      whatsappNumber: e.target.value,
                    }))
                  }
                  placeholder="+51 987 654 321"
                />
                <p className="text-xs text-muted-foreground">
                  Para recibir pedidos por WhatsApp (requiere plan Premium)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="whatsapp-enabled">Pedidos por WhatsApp</Label>
                <div className="flex items-center space-x-2 pt-2">
                  <Switch
                    id="whatsapp-enabled"
                    checked={formData.whatsappOrderingEnabled}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({
                        ...prev,
                        whatsappOrderingEnabled: checked,
                      }))
                    }
                    disabled={
                      !formData.whatsappNumber || currentOrg?.plan !== "PREMIUM"
                    }
                  />
                  <Label
                    htmlFor="whatsapp-enabled"
                    className="text-sm font-normal"
                  >
                    {formData.whatsappOrderingEnabled
                      ? "Activado"
                      : "Desactivado"}
                  </Label>
                </div>
                {currentOrg?.plan !== "PREMIUM" && (
                  <p className="text-xs text-amber-600">
                    Requiere plan Premium
                  </p>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="address">Dirección</Label>
                <div className="flex gap-2">
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        address: e.target.value,
                      }))
                    }
                    placeholder="Av. Ejemplo 123, Lima"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Coordenadas GPS</Label>
                <div className="flex gap-2">
                  {formData.latitude && formData.longitude ? (
                    <div className="flex flex-1 items-center rounded-md border border-input bg-muted px-3 py-2">
                      <p className="text-sm">
                        {formData.latitude.toFixed(6)},{" "}
                        {formData.longitude.toFixed(6)}
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-1 items-center rounded-md border border-input bg-muted px-3 py-2">
                      <p className="text-sm text-muted-foreground">
                        Sin coordenadas
                      </p>
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleGetCurrentLocation}
                    disabled={isGettingLocation}
                    title="Obtener coordenadas GPS"
                  >
                    <MapPin
                      className={
                        isGettingLocation ? "h-4 w-4 animate-pulse" : "h-4 w-4"
                      }
                    />
                  </Button>
                </div>
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
          {openingHours.map((slot) => (
            <div key={slot.dayOfWeek} className="flex items-center gap-4">
              <div className="w-20 text-sm font-medium">{slot.label}</div>
              <Input
                type="time"
                className="w-32"
                value={slot.openTime}
                onChange={(event) =>
                  handleOpeningHourTimeChange(
                    slot.dayOfWeek,
                    "openTime",
                    event.target.value
                  )
                }
                disabled={!slot.isOpen}
              />
              <span className="text-gray-500">a</span>
              <Input
                type="time"
                className="w-32"
                value={slot.closeTime}
                onChange={(event) =>
                  handleOpeningHourTimeChange(
                    slot.dayOfWeek,
                    "closeTime",
                    event.target.value
                  )
                }
                disabled={!slot.isOpen}
              />
              <div className="flex items-center gap-2">
                <Switch
                  checked={slot.isOpen}
                  onCheckedChange={(checked) =>
                    handleOpeningHourToggle(slot.dayOfWeek, checked)
                  }
                />
                <Label className="text-sm">
                  {slot.isOpen ? "Abierto" : "Cerrado"}
                </Label>
              </div>
            </div>
          ))}

          <div className="flex justify-end pt-4">
            <Button type="button" onClick={saveProfile} disabled={isLoading}>
              {isLoading ? "Guardando..." : "Guardar horarios"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
