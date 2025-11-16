"use client";

import * as React from "react";
import {
  BarChart3,
  Brush,
  ChefHat,
  ClipboardList,
  Home,
  QrCode,
  Settings,
  ShieldCheck,
  Store,
  Users,
  Utensils,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useOrganization } from "@/contexts/organization-context";

import { NavMain } from "@/components/sidebar/nav-main";
import { NavProjects } from "@/components/sidebar/nav-projects";
import { NavUser } from "@/components/sidebar/nav-user";
import { TeamSwitcher } from "@/components/sidebar/team-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";

// Navegación principal del restaurante
const restaurantNavigation = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: Home,
    isActive: true,
  },
  {
    title: "Mesas",
    url: "/dashboard/mesas",
    icon: QrCode,
  },
  {
    title: "Menú",
    url: "/dashboard/menu",
    icon: ChefHat,
  },
  {
    title: "Pedidos",
    url: "/dashboard/pedidos",
    icon: ClipboardList,
  },
  {
    title: "Staff",
    url: "/dashboard/staff",
    icon: Users,
  },
  {
    title: "Configuración",
    url: "/dashboard/configuracion",
    icon: Settings,
    items: [
      {
        title: "General",
        url: "/dashboard/configuracion/general",
      },
      {
        title: "Restaurante",
        url: "/dashboard/configuracion/restaurante",
      },
    ],
  },
  {
    title: "Branding",
    url: "/dashboard/branding",
    icon: Brush,
  },
];

// Secciones rápidas/accesos directos
const quickActions = [
  {
    name: "Reportes",
    url: "/dashboard/reportes",
    icon: BarChart3,
  },
  {
    name: "Punto de Venta",
    url: "/dashboard/pos",
    icon: Store,
  },
  {
    name: "Vista Cocina",
    url: "/dashboard/cocina",
    icon: Utensils,
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: session } = useSession();
  const { organizations } = useOrganization();
  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL?.toLowerCase();
  const isAdmin =
    !!adminEmail && session?.user?.email?.toLowerCase() === adminEmail;

  const mainNavigation = React.useMemo(() => {
    const items = [...restaurantNavigation];
    if (isAdmin) {
      items.push({
        title: "Admin",
        url: "/dashboard/admin",
        icon: ShieldCheck,
      });
    }
    return items;
  }, [isAdmin]);

  // Datos del usuario desde la sesión
  const userData = session?.user
    ? {
        name: session.user.name || "Usuario",
        email: session.user.email || "",
        avatar: session.user.image || "/default-avatar.jpg",
      }
    : {
        name: "Cargando...",
        email: "",
        avatar: "/default-avatar.jpg",
      };

  // Convertir organizaciones a formato del TeamSwitcher
  const restaurantTeams = organizations.map((org) => {
    const planLabel = org.plan === "PREMIUM" ? "Premium" : "Free";
    const roleLabel = org.ownerId === session?.user?.id ? "Owner" : "Miembro";

    return {
      name: org.name,
      logo: Store,
      plan: `${planLabel} · ${roleLabel}`,
      id: org.id,
    };
  });

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={restaurantTeams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={mainNavigation} />
        <NavProjects projects={quickActions} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
