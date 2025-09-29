"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useSession } from "next-auth/react";

interface Organization {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  createdAt: Date;
}

interface Membership {
  id: string;
  userId: string;
  orgId: string;
  role: string;
  org: Organization;
}

interface OrganizationContextType {
  currentOrg: Organization | null;
  organizations: Organization[];
  setCurrentOrg: (org: Organization) => void;
  isLoading: boolean;
  isOwner: boolean;
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
  const [isLoading, setIsLoading] = useState(true);

  // Cargar organizaciones del usuario
  useEffect(() => {
    async function fetchOrganizations() {
      if (!session?.user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch("/api/organizations");
        if (response.ok) {
          const data = await response.json();

          // Combinar owned orgs y membership orgs
          const allOrgs = [
            ...data.ownedOrgs,
            ...data.memberships.map((m: Membership) => m.org),
          ];

          // Eliminar duplicados
          const uniqueOrgs = allOrgs.filter(
            (org: Organization, index: number, self: Organization[]) =>
              index === self.findIndex((o: Organization) => o.id === org.id)
          );

          setOrganizations(uniqueOrgs);

          // Si no hay org actual seleccionada, seleccionar la primera
          if (!currentOrg && uniqueOrgs.length > 0) {
            const savedOrgId = localStorage.getItem("currentOrgId");
            const orgToSelect = savedOrgId
              ? uniqueOrgs.find((org: Organization) => org.id === savedOrgId) ||
                uniqueOrgs[0]
              : uniqueOrgs[0];

            setCurrentOrgState(orgToSelect);
            localStorage.setItem("currentOrgId", orgToSelect.id);
          }
        }
      } catch (error) {
        console.error("Error fetching organizations:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchOrganizations();
  }, [session?.user?.id, currentOrg]);

  // Función para cambiar organización activa
  const setCurrentOrg = (org: Organization) => {
    setCurrentOrgState(org);
    localStorage.setItem("currentOrgId", org.id);
  };

  // Verificar si el usuario es owner de la org actual
  const isOwner = currentOrg ? currentOrg.ownerId === session?.user?.id : false;

  const value: OrganizationContextType = {
    currentOrg,
    organizations,
    setCurrentOrg,
    isLoading,
    isOwner,
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
