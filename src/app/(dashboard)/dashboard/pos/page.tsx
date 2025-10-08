import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { PosTerminal } from "@/components/pos/pos-terminal";

export default async function PosPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  return <PosTerminal />;
}
