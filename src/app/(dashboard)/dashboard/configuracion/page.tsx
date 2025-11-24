import { redirect } from "next/navigation";
import { requireRole, PERMISSIONS } from "@/lib/permissions";

export default async function SettingsPage() {
  // Solo OWNER puede acceder a configuración
  await requireRole(PERMISSIONS.SETTINGS);

  // Redirect to general settings by default
  redirect("/dashboard/configuracion/general");
}
