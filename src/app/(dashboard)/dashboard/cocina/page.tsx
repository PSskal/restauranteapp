import { requireRole, PERMISSIONS } from "@/lib/permissions";
import { KitchenDashboard } from "@/components/orders/kitchen-dashboard";

export default async function CocinaPage() {
  // OWNER, MANAGER, CASHIER y KITCHEN pueden ver cocina
  await requireRole(PERMISSIONS.KITCHEN);

  return <KitchenDashboard />;
}
