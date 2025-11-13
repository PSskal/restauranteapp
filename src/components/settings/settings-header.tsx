"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

import { cn } from "@/lib/utils";

interface NavigationItem {
  label: string;
  href: string;
  segment: string;
  disabled?: boolean;
}

const settingsNavigation: NavigationItem[] = [
  {
    label: "General",
    href: `/dashboard/configuracion/general`,
    segment: `general`,
  },
  {
    label: "Restaurante",
    href: `/dashboard/configuracion/restaurante`,
    segment: "restaurante",
  },
  {
    label: "Mesas",
    href: `/dashboard/configuracion/mesas`,
    segment: "mesas",
  },
  {
    label: "Categorías",
    href: `/dashboard/configuracion/categorias`,
    segment: "categorias",
  },
  {
    label: "Personal",
    href: `/dashboard/configuracion/personal`,
    segment: "personal",
  },
];

export function SettingsHeader() {
  const pathname = usePathname();

  // Determinar el segmento activo basado en la URL
  const activeSegment = pathname.split("/").pop() || "general";

  return (
    <header>
      <section className="mb-4 flex items-center justify-between md:mb-8 lg:mb-12">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            Configuraciones
          </h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Gestiona la configuración de tu restaurante
          </p>
        </div>
      </section>

      <NavMenu navigation={settingsNavigation} activeSegment={activeSegment} />
    </header>
  );
}

function NavMenu({
  navigation,
  activeSegment,
}: {
  navigation: NavigationItem[];
  activeSegment: string;
}) {
  return (
    <nav className="border-b border-gray-200">
      <div className="flex space-x-8" aria-label="Tabs">
        {navigation.map((item) => {
          const isActive = activeSegment === item.segment;

          return (
            <Link
              key={item.segment}
              href={item.href}
              className={cn(
                "whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors",
                isActive
                  ? "border-neutral-300 text-neutral-800"
                  : "border-transparent text-neutral-700 hover:border-neutral-200 hover:text-neutral-600",
                item.disabled && "pointer-events-none opacity-50"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
