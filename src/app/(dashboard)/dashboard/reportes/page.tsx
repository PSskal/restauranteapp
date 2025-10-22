import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { ReportsDashboard } from "@/components/reports/reports-dashboard";

export default async function ReportesPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  return <ReportsDashboard />;
}
