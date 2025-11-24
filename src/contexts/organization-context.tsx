"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { useSession } from "next-auth/react";
import { Role } from "@prisma/client";

import type { PlanId } from "@/data/plans";

interface Organization {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  plan: PlanId;
  planExpiresAt: string | Date | null;
  planUpdatedAt: string | Date | null;
  createdAt: Date;
  whatsappNumber: string | null;
  whatsappOrderingEnabled: boolean;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  description?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

interface Membership {
  id: string;
  userId: string;
  orgId: string;
  role: Role;
  org: Organization;
}

interface OrganizationContextType {
  currentOrg: Organization | null;
  organizations: Organization[];
  setCurrentOrg: (org: Organization) => void;
  isLoading: boolean;
  isOwner: boolean;
  userRole: Role | null;
  refreshOrganizations: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(
  undefined
);

interface OrganizationProviderProps {
  children: ReactNode;
}

export function OrganizationProvider({ children }: OrganizationProviderProps) {
  const { data: session } = useSession();
  const [currentOrg, setCurrentOrgState] = useState<Organization | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOrganizations = useCallback(async () => {
    if (!session?.user?.id) {
      setOrganizations([]);
      setCurrentOrgState(null);
      setIsLoading(false);
      if (typeof window !== "undefined") {
        localStorage.removeItem("currentOrgId");
      }
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/organizations");
      if (!response.ok) {
        throw new Error("No se pudieron cargar las organizaciones");
      }

      const data = await response.json();
      const allOrgs = [
        ...data.ownedOrgs,
        ...data.memberships.map((m: Membership) => m.org),
      ];

      // Guardar memberships para obtener el rol
      setMemberships(data.memberships);

      const uniqueOrgs = allOrgs.filter(
        (org: Organization, index: number, self: Organization[]) =>
          index === self.findIndex((o: Organization) => o.id === org.id)
      );

      setOrganizations(uniqueOrgs);

      setCurrentOrgState((prevOrg) => {
        if (uniqueOrgs.length === 0) {
          if (typeof window !== "undefined") {
            localStorage.removeItem("currentOrgId");
          }
          return null;
        }

        if (prevOrg) {
          const matched = uniqueOrgs.find((org) => org.id === prevOrg.id);
          if (matched) {
            if (typeof window !== "undefined") {
              localStorage.setItem("currentOrgId", matched.id);
            }
            return matched;
          }
        }

        const savedOrgId =
          typeof window !== "undefined"
            ? localStorage.getItem("currentOrgId")
            : null;
        const fallbackOrg = savedOrgId
          ? uniqueOrgs.find((org) => org.id === savedOrgId) || uniqueOrgs[0]
          : uniqueOrgs[0];

        if (fallbackOrg && typeof window !== "undefined") {
          localStorage.setItem("currentOrgId", fallbackOrg.id);
        }

        return fallbackOrg ?? null;
      });
    } catch (error) {
      console.error("Error fetching organizations:", error);
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  // Función para cambiar organización activa
  const setCurrentOrg = (org: Organization) => {
    setCurrentOrgState(org);
    if (typeof window !== "undefined") {
      localStorage.setItem("currentOrgId", org.id);
    }
  };

  // Verificar si el usuario es owner de la org actual
  const isOwner =
    session?.user?.isOwner ??
    (currentOrg ? currentOrg.ownerId === session?.user?.id : false);

  // Obtener el rol del usuario - OPTIMIZADO: usar session cache primero
  const userRole =
    session?.user?.role ??
    (isOwner
      ? Role.OWNER
      : memberships.find((m) => m.orgId === currentOrg?.id)?.role || null);

  const value: OrganizationContextType = {
    currentOrg,
    organizations,
    setCurrentOrg,
    isLoading,
    isOwner,
    userRole,
    refreshOrganizations: fetchOrganizations,
  };

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error(
      "useOrganization must be used within an OrganizationProvider"
    );
  }
  return context;
}
