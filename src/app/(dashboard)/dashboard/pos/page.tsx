import { requireRole, PERMISSIONS } from "@/lib/permissions";
import { PosTerminal } from "@/components/pos/pos-terminal";

export default async function PosPage() {
  // Solo OWNER, MANAGER y CASHIER pueden usar el POS
  await requireRole(PERMISSIONS.POS);

  return <PosTerminal />;
}
