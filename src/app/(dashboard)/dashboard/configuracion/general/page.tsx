import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { SettingsHeader } from "@/components/settings/settings-header";
import { GeneralSettingsClient } from "@/components/settings/general-settings-client";

export default async function GeneralSettingsPage() {
  const session = await auth();

  if (!session) {
    redirect("/auth/signin");
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <SettingsHeader />
      <GeneralSettingsClient />
    </div>
  );
}
