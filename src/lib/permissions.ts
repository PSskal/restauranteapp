import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

export type UserRole = Role;

/**
 * Verifica si el usuario tiene uno de los roles permitidos
 * OPTIMIZADO: Usa el rol cacheado en el JWT session
 */
export async function requireRole(
  allowedRoles: UserRole | UserRole[]
): Promise<{
  userId: string;
  orgId: string;
  role: UserRole;
  isOwner: boolean;
}> {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Si el rol está cacheado en la sesión, usarlo directamente (RÁPIDO)
  if (session.user.role && session.user.orgId) {
    const rolesArray = Array.isArray(allowedRoles)
      ? allowedRoles
      : [allowedRoles];

    if (!rolesArray.includes(session.user.role)) {
      redirect("/dashboard");
    }

    return {
      userId: session.user.id,
      orgId: session.user.orgId,
      role: session.user.role,
      isOwner: session.user.isOwner || false,
    };
  }

  // Fallback: Si no hay rol en sesión, consultar DB (solo la primera vez)
  const userOrgs = await prisma.organization.findMany({
    where: {
      OR: [
        { ownerId: session.user.id },
        {
          memberships: {
            some: {
              userId: session.user.id,
            },
          },
        },
      ],
    },
    include: {
      memberships: {
        where: {
          userId: session.user.id,
        },
        select: {
          role: true,
        },
      },
    },
  });

  const currentOrg = userOrgs[0];

  if (!currentOrg) {
    redirect("/dashboard");
  }

  const isOwner = currentOrg.ownerId === session.user.id;
  const userRole = isOwner ? Role.OWNER : currentOrg.memberships[0]?.role;

  if (!userRole) {
    redirect("/dashboard");
  }

  // Convertir allowedRoles a array si es un solo rol
  const rolesArray = Array.isArray(allowedRoles)
    ? allowedRoles
    : [allowedRoles];

  // Verificar si el usuario tiene uno de los roles permitidos
  if (!rolesArray.includes(userRole)) {
    redirect("/dashboard");
  }

  return {
    userId: session.user.id,
    orgId: currentOrg.id,
    role: userRole,
    isOwner,
  };
}

/**
 * Obtiene el rol del usuario sin redireccionar
 * OPTIMIZADO: Usa el rol cacheado en el JWT session
 */
export async function getUserRole(): Promise<{
  userId: string;
  orgId: string | null;
  role: UserRole | null;
  isOwner: boolean;
} | null> {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  // Si el rol está cacheado en la sesión, usarlo directamente (RÁPIDO)
  if (session.user.role && session.user.orgId) {
    return {
      userId: session.user.id,
      orgId: session.user.orgId,
      role: session.user.role,
      isOwner: session.user.isOwner || false,
    };
  }

  // Fallback: consultar DB si no hay cache
  const userOrgs = await prisma.organization.findMany({
    where: {
      OR: [
        { ownerId: session.user.id },
        {
          memberships: {
            some: {
              userId: session.user.id,
            },
          },
        },
      ],
    },
    include: {
      memberships: {
        where: {
          userId: session.user.id,
        },
        select: {
          role: true,
        },
      },
    },
  });

  const currentOrg = userOrgs[0];

  if (!currentOrg) {
    return {
      userId: session.user.id,
      orgId: null,
      role: null,
      isOwner: false,
    };
  }

  const isOwner = currentOrg.ownerId === session.user.id;
  const userRole = isOwner ? Role.OWNER : currentOrg.memberships[0]?.role;

  return {
    userId: session.user.id,
    orgId: currentOrg.id,
    role: userRole || null,
    isOwner,
  };
}

/**
 * Verifica si un rol tiene permiso para realizar una acción
 */
export function hasPermission(
  userRole: UserRole,
  allowedRoles: UserRole[]
): boolean {
  return allowedRoles.includes(userRole);
}

/**
 * Definición de permisos por vista/acción
 */
export const PERMISSIONS = {
  // Dashboard principal - todos pueden ver
  DASHBOARD: [
    Role.OWNER,
    Role.MANAGER,
    Role.CASHIER,
    Role.WAITER,
    Role.KITCHEN,
  ] as Role[],

  // POS - owner, manager, cashier y waiter
  POS: [Role.OWNER, Role.MANAGER, Role.CASHIER, Role.WAITER] as Role[],

  // Menú - solo owner y manager pueden editar
  MENU_VIEW: [
    Role.OWNER,
    Role.MANAGER,
    Role.CASHIER,
    Role.WAITER,
    Role.KITCHEN,
  ] as Role[],
  MENU_EDIT: [Role.OWNER, Role.MANAGER] as Role[],

  // Mesas - owner, manager, cashier y waiter pueden gestionar
  TABLES: [Role.OWNER, Role.MANAGER, Role.CASHIER, Role.WAITER] as Role[],

  // Cocina - todos excepto meseros pueden ver
  KITCHEN: [Role.OWNER, Role.MANAGER, Role.CASHIER, Role.KITCHEN] as Role[],

  // Pedidos - todos pueden ver (con filtros por rol)
  ORDERS_VIEW: [
    Role.OWNER,
    Role.MANAGER,
    Role.CASHIER,
    Role.WAITER,
    Role.KITCHEN,
  ] as Role[],
  ORDERS_CREATE: [
    Role.OWNER,
    Role.MANAGER,
    Role.CASHIER,
    Role.WAITER,
  ] as Role[],

  // Reportes - solo owner y manager
  REPORTS: [Role.OWNER, Role.MANAGER] as Role[],

  // Staff - solo owner
  STAFF: [Role.OWNER] as Role[],

  // Configuración - solo owner
  SETTINGS: [Role.OWNER] as Role[],

  // Branding - solo owner
  BRANDING: [Role.OWNER] as Role[],

  // Plan - solo owner
  PLAN: [Role.OWNER] as Role[],
};
