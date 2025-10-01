"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

export function useAuthRedirect() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (status === "loading") return; // Aún cargando

    if (status === "authenticated" && session) {
      // Usuario autenticado, redirigir
      const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
      router.push(callbackUrl);
    }
  }, [status, session, router, searchParams]);

  return { session, status };
}
