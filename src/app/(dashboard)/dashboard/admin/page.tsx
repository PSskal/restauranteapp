import { notFound } from "next/navigation";
import { ShieldCheck } from "lucide-react";

import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/plan-expiration";
import { GrantPremiumForm } from "@/components/admin/grant-premium-form";

export default async function AdminPremiumTrialsPage() {
  const session = await auth();

  if (!session?.user?.email || !isAdminEmail(session.user.email)) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-primary">
          <ShieldCheck className="h-5 w-5" />
          <span className="text-sm font-semibold uppercase tracking-wide">
            Panel interno
          </span>
        </div>
        <div>
          <h1 className="text-3xl font-bold">
            Otorgar Premium sin pasar por pagos
          </h1>
          <p className="text-muted-foreground">
            Usa este formulario para activar una prueba de un mes (o más) a las
            organizaciones de un dueño. Sólo funciona para correos que ya
            iniciaron sesión en la plataforma.
          </p>
        </div>
      </div>

      <GrantPremiumForm />
    </div>
  );
}
