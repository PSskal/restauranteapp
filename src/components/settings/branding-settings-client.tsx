"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Upload, Image as ImageIcon, Loader2, Trash2 } from "lucide-react";

import { useOrganization } from "@/contexts/organization-context";
import { PlanGate } from "@/components/plans/plan-gate";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

interface BrandingState {
  brandColor: string;
  accentColor: string;
  logoUrl: string | null;
}

const DEFAULT_BRANDING: BrandingState = {
  brandColor: "#146E37",
  accentColor: "#F9FAFB",
  logoUrl: null,
};

const HEX_FULL_REGEX = /^#[0-9A-Fa-f]{6}$/;
const HEX_PARTIAL_REGEX = /^[0-9A-Fa-f]{0,6}$/;

function sanitizeHex(value: string, fallback: string) {
  if (HEX_FULL_REGEX.test(value)) {
    return value.startsWith("#") ? value.toUpperCase() : `#${value}`.toUpperCase();
  }

  return fallback;
}

function hexToRgba(hex: string, alpha: number) {
  if (!HEX_FULL_REGEX.test(hex)) {
    return `rgba(0,0,0,${alpha})`;
  }

  const normalized = hex.replace("#", "");
  const bigint = parseInt(normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function BrandingSettingsClient() {
  const { currentOrg } = useOrganization();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [brandColor, setBrandColor] = useState(DEFAULT_BRANDING.brandColor);
  const [accentColor, setAccentColor] = useState(DEFAULT_BRANDING.accentColor);
  const [logoUrl, setLogoUrl] = useState<string | null>(DEFAULT_BRANDING.logoUrl);
  const [initialBrand, setInitialBrand] = useState<BrandingState | null>(null);

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!logoFile) {
      setLogoPreview(null);
      return;
    }

    const objectUrl = URL.createObjectURL(logoFile);
    setLogoPreview(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [logoFile]);

  useEffect(() => {
    const loadBranding = async () => {
      if (!currentOrg?.id) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setFetchError(null);

        const response = await fetch(
          `/api/organizations/${currentOrg.id}/branding`,
          { cache: "no-store" },
        );

        if (!response.ok) {
          throw new Error("No se pudo cargar la configuracion de branding");
        }

        const data: { branding: BrandingState } = await response.json();
        const branding = {
          ...DEFAULT_BRANDING,
          ...(data.branding ?? {}),
        };

        setBrandColor(sanitizeHex(branding.brandColor, DEFAULT_BRANDING.brandColor));
        setAccentColor(sanitizeHex(branding.accentColor, DEFAULT_BRANDING.accentColor));
        setLogoUrl(branding.logoUrl ?? null);
        setInitialBrand(branding);
      } catch (error) {
        console.error("Error loading branding:", error);
        setFetchError("No se pudo cargar el branding del restaurante.");
        setInitialBrand(DEFAULT_BRANDING);
      } finally {
        setIsLoading(false);
      }
    };

    loadBranding();
  }, [currentOrg?.id]);

  const hasChanges = useMemo(() => {
    if (!initialBrand) {
      return false;
    }

    if (logoFile) {
      return true;
    }

    const currentLogo = logoUrl ?? null;
    return (
      brandColor.toUpperCase() !== initialBrand.brandColor.toUpperCase() ||
      accentColor.toUpperCase() !== initialBrand.accentColor.toUpperCase() ||
      currentLogo !== initialBrand.logoUrl
    );
  }, [accentColor, brandColor, initialBrand, logoFile, logoUrl]);

  const previewLogo = logoPreview || logoUrl;

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Solo se permiten archivos de imagen.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("El archivo debe pesar menos de 5MB.");
      return;
    }

    setLogoFile(file);
    setLogoUrl(null);
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoUrl(null);
  };

  const uploadLogoIfNeeded = async () => {
    if (!logoFile) {
      return logoUrl;
    }

    if (!currentOrg?.id) {
      throw new Error("Selecciona un restaurante antes de subir un logo.");
    }

    const formData = new FormData();
    formData.append("file", logoFile);
    formData.append("orgId", currentOrg.id);

    const uploadResponse = await fetch("/api/upload/image", {
      method: "POST",
      body: formData,
    });

    if (!uploadResponse.ok) {
      const errorBody = await uploadResponse.json().catch(() => null);
      throw new Error(
        errorBody?.error ?? "No fue posible subir el logo. Intenta nuevamente.",
      );
    }

    const uploadData = await uploadResponse.json();
    return uploadData.url as string;
  };

  const handleSave = async () => {
    if (!currentOrg?.id || isSaving) {
      return;
    }

    try {
      setIsSaving(true);
      const finalLogo = await uploadLogoIfNeeded();

      const response = await fetch(
        `/api/organizations/${currentOrg.id}/branding`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            brandColor: sanitizeHex(brandColor, DEFAULT_BRANDING.brandColor),
            accentColor: sanitizeHex(accentColor, DEFAULT_BRANDING.accentColor),
            logoUrl: finalLogo ?? null,
          }),
        },
      );

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(
          errorBody?.error ?? "No se pudo guardar la configuracion de branding.",
        );
      }

      const data: { branding: BrandingState } = await response.json();
      const branding = {
        ...DEFAULT_BRANDING,
        ...(data.branding ?? {}),
      };

      setBrandColor(branding.brandColor);
      setAccentColor(branding.accentColor);
      setLogoUrl(branding.logoUrl ?? null);
      setLogoFile(null);
      setInitialBrand(branding);

      toast.success("Branding actualizado correctamente.");
    } catch (error) {
      console.error("Error saving branding:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo guardar la configuracion de branding.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (!currentOrg?.id || isSaving) {
      return;
    }

    try {
      setIsSaving(true);

      const response = await fetch(
        `/api/organizations/${currentOrg.id}/branding`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(
          errorBody?.error ?? "No se pudo restablecer el branding.",
        );
      }

      setBrandColor(DEFAULT_BRANDING.brandColor);
      setAccentColor(DEFAULT_BRANDING.accentColor);
      setLogoUrl(DEFAULT_BRANDING.logoUrl);
      setLogoFile(null);
      setInitialBrand(DEFAULT_BRANDING);

      toast.success("Branding restablecido a los valores predeterminados.");
    } catch (error) {
      console.error("Error resetting branding:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo restablecer el branding.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Cargando branding del restaurante...
        </CardContent>
      </Card>
    );
  }

  if (!currentOrg) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Selecciona un restaurante para personalizar su branding.
        </CardContent>
      </Card>
    );
  }

  if (currentOrg.plan !== "PREMIUM") {
    return (
      <PlanGate
        title="Branding Premium"
        description="Personaliza logos, colores y la experiencia visual de tu carta con el plan Premium."
      />
    );
  }

  return (
    <div className="space-y-6">
      {fetchError ? (
        <Card>
          <CardContent className="py-6">
            <p className="text-sm text-red-600">{fetchError}</p>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Branding de la carta QR</CardTitle>
            <CardDescription>
              Personaliza los colores y el logo que veran tus clientes al
              escanear una mesa con QR.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <Label>Logo del restaurante</Label>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="flex h-24 w-24 items-center justify-center rounded-lg border bg-muted">
                  {previewLogo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewLogo}
                      alt="Logo del restaurante"
                      className="h-full w-full rounded-lg object-contain"
                    />
                  ) : (
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-3 sm:flex-row">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex items-center gap-2"
                    onClick={() =>
                      document.getElementById("branding-logo-upload")?.click()
                    }
                    disabled={isSaving}
                  >
                    <Upload className="h-4 w-4" />
                    {previewLogo ? "Cambiar logo" : "Subir logo"}
                  </Button>
                  <input
                    id="branding-logo-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  {previewLogo || logoFile ? (
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-red-600 hover:text-red-700"
                      onClick={handleRemoveLogo}
                      disabled={isSaving}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Quitar logo
                    </Button>
                  ) : null}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Se recomienda un logo en formato PNG transparente de al menos
                200x200px.
              </p>
            </div>

            <Separator />

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-3">
                <Label>Color principal</Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="color"
                    value={brandColor}
                    onChange={(event) => setBrandColor(event.target.value)}
                    className="h-10 w-16 cursor-pointer rounded-md border p-1"
                    disabled={isSaving}
                  />
                  <Input
                    value={brandColor}
                    onChange={(event) => {
                      const value = event.target.value.toUpperCase();
                      const withoutSymbol = value.replace(/#/g, "");
                      if (!HEX_PARTIAL_REGEX.test(withoutSymbol)) {
                        return;
                      }
                      setBrandColor(
                        value.startsWith("#") ? value : `#${value}`,
                      );
                    }}
                    onBlur={() =>
                      setBrandColor(
                        sanitizeHex(brandColor, DEFAULT_BRANDING.brandColor),
                      )
                    }
                    maxLength={7}
                    disabled={isSaving}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Este color se usa en botones y llamadas a la accion.
                </p>
              </div>

              <div className="space-y-3">
                <Label>Color de fondo</Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="color"
                    value={accentColor}
                    onChange={(event) => setAccentColor(event.target.value)}
                    className="h-10 w-16 cursor-pointer rounded-md border p-1"
                    disabled={isSaving}
                  />
                  <Input
                    value={accentColor}
                    onChange={(event) => {
                      const value = event.target.value.toUpperCase();
                      const withoutSymbol = value.replace(/#/g, "");
                      if (!HEX_PARTIAL_REGEX.test(withoutSymbol)) {
                        return;
                      }
                      setAccentColor(
                        value.startsWith("#") ? value : `#${value}`,
                      );
                    }}
                    onBlur={() =>
                      setAccentColor(
                        sanitizeHex(accentColor, DEFAULT_BRANDING.accentColor),
                      )
                    }
                    maxLength={7}
                    disabled={isSaving}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Este color define el fondo general de la experiencia.
                </p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3 border-t pt-6 sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={handleReset}
              disabled={isSaving}
              className="justify-center text-muted-foreground hover:text-foreground sm:justify-start"
            >
              Restablecer a valores predeterminados
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className="sm:min-w-[180px]"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Guardar cambios"
              )}
            </Button>
          </CardFooter>
        </Card>

        <Card className="sticky top-6 h-fit">
          <CardHeader>
            <CardTitle>Previsualizacion</CardTitle>
            <CardDescription>
              Vista preliminar de la tarjeta publica para tus clientes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className="rounded-xl border p-6 shadow-sm"
              style={{ backgroundColor: accentColor }}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-lg bg-white shadow-sm">
                    {previewLogo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={previewLogo}
                        alt="Logo preview"
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <ImageIcon className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Mesa 12 - Restaurante Ejemplo
                    </p>
                    <p className="text-lg font-semibold">
                      Tu pedido esta listo
                    </p>
                  </div>
                </div>
              </div>

              <Separator className="my-5" />

              <div
                className="rounded-lg border px-4 py-3 text-sm"
                style={{
                  borderColor: hexToRgba(brandColor, 0.35),
                  backgroundColor: hexToRgba(brandColor, 0.1),
                  color: brandColor,
                }}
              >
                <p className="font-medium">Pedido directo a cocina</p>
                <p className="text-xs opacity-80">
                  Tus clientes veran tus colores y logo en la pantalla publica.
                </p>
              </div>

              <Button
                type="button"
                className="mt-6 w-full"
                style={{
                  backgroundColor: brandColor,
                  borderColor: brandColor,
                }}
              >
                Ver menu con QR
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
