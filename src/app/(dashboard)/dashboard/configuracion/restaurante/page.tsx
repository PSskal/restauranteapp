import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { SettingsHeader } from "@/components/settings/settings-header";
import { RestaurantSettingsClient } from "@/components/settings/restaurant-settings-client";

export default async function RestaurantSettingsPage() {
  const session = await auth();

  if (!session) {
    redirect("/auth/signin");
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <SettingsHeader />
      <RestaurantSettingsClient />
    </div>
  );
}
