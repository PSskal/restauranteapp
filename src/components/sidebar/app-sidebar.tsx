"use client";

import * as React from "react";
import {
  BarChart3,
  ChefHat,
  ClipboardList,
  Home,
  QrCode,
  Settings,
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
      {
        title: "Mesas",
        url: "/dashboard/configuracion/mesas",
      },
      {
        title: "Categorías",
        url: "/dashboard/configuracion/categorias",
      },
      {
        title: "Personal",
        url: "/dashboard/configuracion/personal",
      },
    ],
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
  const { currentOrg, organizations, isLoading } = useOrganization();

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
  const restaurantTeams = organizations.map((org) => ({
    name: org.name,
    logo: Store,
    plan: org.ownerId === session?.user?.id ? "Owner" : "Member",
    id: org.id,
  }));

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={restaurantTeams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={restaurantNavigation} />
        <NavProjects projects={quickActions} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
