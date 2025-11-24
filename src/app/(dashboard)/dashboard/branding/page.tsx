import { requireRole, PERMISSIONS } from "@/lib/permissions";
import { BrandingSettingsClient } from "@/components/settings/branding-settings-client";

export default async function DashboardBrandingPage() {
  // Solo OWNER puede gestionar branding
  await requireRole(PERMISSIONS.BRANDING);

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Branding del Restaurante
        </h1>
        <p className="text-sm text-muted-foreground">
          Personaliza los colores y el logotipo que verán tus clientes en la
          carta con QR.
        </p>
      </div>
      <BrandingSettingsClient />
    </div>
  );
}
