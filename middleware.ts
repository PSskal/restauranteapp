export { auth as middleware } from "@/auth";

// Optimizado: Solo proteger rutas específicas que necesitan autenticación
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/organizations/:path*",
    "/api/invitations/:path*",
    "/api/upload/:path*",
  ],
};
