import { requireRole, PERMISSIONS } from "@/lib/permissions";
import { ReportsDashboard } from "@/components/reports/reports-dashboard";

export default async function ReportesPage() {
  // Solo OWNER y MANAGER pueden ver reportes
  await requireRole(PERMISSIONS.REPORTS);

  return <ReportsDashboard />;
}
