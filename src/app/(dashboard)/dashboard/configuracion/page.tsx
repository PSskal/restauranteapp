import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function SettingsPage() {
  const session = await auth();

  if (!session) {
    redirect("/auth/signin");
  }

  // Redirect to general settings by default
  redirect("/dashboard/configuracion/general");
}
