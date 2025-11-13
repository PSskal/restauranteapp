import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { KitchenDashboard } from "@/components/orders/kitchen-dashboard";

export default async function CocinaPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  return <KitchenDashboard />;
}
