import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { OrdersDashboard } from "@/components/orders/orders-dashboard";

export default async function PedidosPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  return <OrdersDashboard />;
}
