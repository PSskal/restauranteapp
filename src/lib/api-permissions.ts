import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import type { UserRole } from "./permissions";

/**
 * Middleware para verificar permisos en API routes
 * Uso: const auth = await requireApiRole(["OWNER", "MANAGER"]);
 */
export async function requireApiRole(allowedRoles: UserRole[]): Promise<
  | { error: NextResponse; data: null }
  | {
      error: null;
      data: {
        userId: string;
        orgId: string;
        role: UserRole;
        isOwner: boolean;
      };
    }
> {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      error: NextResponse.json({ error: "No autorizado" }, { status: 401 }),
      data: null,
    };
  }

  // Obtener la organización del usuario
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
      error: NextResponse.json(
        { error: "No perteneces a ninguna organización" },
        { status: 404 }
      ),
      data: null,
    };
  }

  const isOwner = currentOrg.ownerId === session.user.id;
  const userRole = isOwner ? Role.OWNER : currentOrg.memberships[0]?.role;

  if (!userRole) {
    return {
      error: NextResponse.json(
        { error: "No tienes un rol asignado" },
        { status: 403 }
      ),
      data: null,
    };
  }

  // Verificar si el usuario tiene uno de los roles permitidos
  if (!allowedRoles.includes(userRole)) {
    return {
      error: NextResponse.json(
        { error: "No tienes permisos para realizar esta acción" },
        { status: 403 }
      ),
      data: null,
    };
  }

  return {
    error: null,
    data: {
      userId: session.user.id,
      orgId: currentOrg.id,
      role: userRole,
      isOwner,
    },
  };
}

/**
 * Verifica si un orgId pertenece al usuario actual
 */
export async function verifyOrgAccess(
  orgId: string,
  userId: string
): Promise<boolean> {
  const org = await prisma.organization.findFirst({
    where: {
      id: orgId,
      OR: [
        { ownerId: userId },
        {
          memberships: {
            some: {
              userId: userId,
            },
          },
        },
      ],
    },
  });

  return !!org;
}
