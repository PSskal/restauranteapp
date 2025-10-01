export { auth as middleware } from "@/auth";

// Temporalmente simplificado para debuggear el error de configuración
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
