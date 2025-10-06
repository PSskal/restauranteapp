"use client";

import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

// Mapeo de rutas a títulos legibles
const routeTitles: Record<string, string> = {
  "/dashboard": "Inicio",
  "/dashboard/menu": "Menú",
  "/dashboard/pedidos": "Pedidos",
  "/dashboard/cocina": "Cocina",
  "/dashboard/mesas": "Mesas",
  "/dashboard/configuracion": "Configuración",
  "/dashboard/analytics": "Analíticas",
};

// Función para obtener el título de una ruta
function getRouteTitle(path: string): string {
  return routeTitles[path] || path.split("/").pop() || "";
}

export function DynamicBreadcrumb() {
  const pathname = usePathname();

  // Dividir la ruta en segmentos
  const pathSegments = pathname.split("/").filter(Boolean);

  // Construir breadcrumbs
  const breadcrumbs = pathSegments.map((segment, index) => {
    const path = "/" + pathSegments.slice(0, index + 1).join("/");
    const title = getRouteTitle(path);
    const isLast = index === pathSegments.length - 1;

    return {
      path,
      title,
      isLast,
    };
  });

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem className="hidden md:block">
          <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
        </BreadcrumbItem>
        {breadcrumbs.length > 1 && (
          <>
            <BreadcrumbSeparator className="hidden md:block" />
            {breadcrumbs.slice(1).map((breadcrumb) => (
              <div key={breadcrumb.path} className="flex items-center">
                <BreadcrumbItem>
                  {breadcrumb.isLast ? (
                    <BreadcrumbPage>{breadcrumb.title}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink href={breadcrumb.path}>
                      {breadcrumb.title}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
                {!breadcrumb.isLast && (
                  <BreadcrumbSeparator className="hidden md:block" />
                )}
              </div>
            ))}
          </>
        )}
        {breadcrumbs.length === 1 && (
          <>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem>
              <BreadcrumbPage>Inicio</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

