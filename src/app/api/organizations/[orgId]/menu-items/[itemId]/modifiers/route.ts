import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const modifierSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Nombre requerido").max(80),
  priceDeltaC: z
    .number()
    .int("El delta debe ser un entero en centavos")
    .min(-1_000_000)
    .max(1_000_000),
  position: z.number().int().min(0).max(999).optional(),
  active: z.boolean().optional(),
});

const groupSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Nombre requerido").max(80),
  required: z.boolean().optional(),
  minSelect: z.number().int().min(0).max(20).optional(),
  maxSelect: z.number().int().min(1).max(20).optional(),
  position: z.number().int().min(0).max(999).optional(),
  modifiers: z.array(modifierSchema).max(50),
});

const putSchema = z.object({
  groups: z.array(groupSchema).max(20),
});

async function ensureAccess(orgId: string, itemId: string, writer: boolean) {
  const session = await auth();

  if (!session?.user?.id) {
    return { error: "No autorizado", status: 401 as const };
  }

  const [membership, isOwner, menuItem] = await Promise.all([
    prisma.membership.findFirst({
      where: {
        userId: session.user.id,
        orgId,
        ...(writer ? { role: { in: ["OWNER", "MANAGER"] as const } } : {}),
      },
    }),
    prisma.organization.findFirst({
      where: { id: orgId, ownerId: session.user.id },
      select: { id: true },
    }),
    prisma.menuItem.findFirst({
      where: { id: itemId, orgId },
      select: { id: true },
    }),
  ]);

  if (!menuItem) {
    return { error: "Producto no encontrado", status: 404 as const };
  }

  if (!membership && !isOwner) {
    return {
      error: writer
        ? "No tienes permisos para editar modificadores"
        : "No tienes acceso a esta organización",
      status: 403 as const,
    };
  }

  return { ok: true as const };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orgId: string; itemId: string }> }
) {
  try {
    const { orgId, itemId } = await params;
    const access = await ensureAccess(orgId, itemId, false);
    if ("error" in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const groups = await prisma.modifierGroup.findMany({
      where: { menuItemId: itemId },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      include: {
        modifiers: {
          orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        },
      },
    });

    return NextResponse.json({
      groups: groups.map((group) => ({
        id: group.id,
        name: group.name,
        required: group.required,
        minSelect: group.minSelect,
        maxSelect: group.maxSelect,
        position: group.position,
        modifiers: group.modifiers.map((modifier) => ({
          id: modifier.id,
          name: modifier.name,
          priceDeltaC: modifier.priceDeltaC,
          position: modifier.position,
          active: modifier.active,
        })),
      })),
    });
  } catch (error) {
    console.error("Error fetching modifiers:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string; itemId: string }> }
) {
  try {
    const { orgId, itemId } = await params;
    const access = await ensureAccess(orgId, itemId, true);
    if ("error" in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    let jsonBody: unknown;
    try {
      jsonBody = await request.json();
    } catch {
      return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
    }

    const parsed = putSchema.safeParse(jsonBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    for (const group of parsed.data.groups) {
      const minSelect = group.minSelect ?? 0;
      const maxSelect = group.maxSelect ?? 1;
      if (minSelect > maxSelect) {
        return NextResponse.json(
          {
            error: `El grupo "${group.name}" tiene minSelect mayor que maxSelect`,
          },
          { status: 400 }
        );
      }
      if (group.required && minSelect < 1) {
        return NextResponse.json(
          {
            error: `El grupo "${group.name}" es requerido pero minSelect es 0`,
          },
          { status: 400 }
        );
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const existingGroups = await tx.modifierGroup.findMany({
        where: { menuItemId: itemId },
        include: { modifiers: { select: { id: true } } },
      });

      const incomingGroupIds = new Set(
        parsed.data.groups.map((g) => g.id).filter((id): id is string => !!id)
      );
      const groupsToDelete = existingGroups
        .filter((g) => !incomingGroupIds.has(g.id))
        .map((g) => g.id);

      if (groupsToDelete.length > 0) {
        await tx.modifierGroup.deleteMany({
          where: { id: { in: groupsToDelete } },
        });
      }

      for (let gIndex = 0; gIndex < parsed.data.groups.length; gIndex++) {
        const group = parsed.data.groups[gIndex];
        const groupData = {
          name: group.name,
          required: group.required ?? false,
          minSelect: group.minSelect ?? 0,
          maxSelect: group.maxSelect ?? 1,
          position: group.position ?? gIndex,
        };

        let groupId: string;
        if (group.id) {
          const updated = await tx.modifierGroup.update({
            where: { id: group.id },
            data: groupData,
            select: { id: true },
          });
          groupId = updated.id;
        } else {
          const created = await tx.modifierGroup.create({
            data: { ...groupData, menuItemId: itemId },
            select: { id: true },
          });
          groupId = created.id;
        }

        const existingMods = await tx.modifier.findMany({
          where: { groupId },
          select: { id: true },
        });
        const incomingModIds = new Set(
          group.modifiers.map((m) => m.id).filter((id): id is string => !!id)
        );
        const modsToDelete = existingMods
          .filter((m) => !incomingModIds.has(m.id))
          .map((m) => m.id);

        if (modsToDelete.length > 0) {
          await tx.modifier.deleteMany({
            where: { id: { in: modsToDelete } },
          });
        }

        for (let mIndex = 0; mIndex < group.modifiers.length; mIndex++) {
          const modifier = group.modifiers[mIndex];
          const modData = {
            name: modifier.name,
            priceDeltaC: modifier.priceDeltaC,
            position: modifier.position ?? mIndex,
            active: modifier.active ?? true,
          };
          if (modifier.id) {
            await tx.modifier.update({
              where: { id: modifier.id },
              data: modData,
            });
          } else {
            await tx.modifier.create({
              data: { ...modData, groupId },
            });
          }
        }
      }

      return tx.modifierGroup.findMany({
        where: { menuItemId: itemId },
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        include: {
          modifiers: {
            orderBy: [{ position: "asc" }, { createdAt: "asc" }],
          },
        },
      });
    });

    return NextResponse.json({
      groups: result.map((group) => ({
        id: group.id,
        name: group.name,
        required: group.required,
        minSelect: group.minSelect,
        maxSelect: group.maxSelect,
        position: group.position,
        modifiers: group.modifiers.map((modifier) => ({
          id: modifier.id,
          name: modifier.name,
          priceDeltaC: modifier.priceDeltaC,
          position: modifier.position,
          active: modifier.active,
        })),
      })),
    });
  } catch (error) {
    console.error("Error updating modifiers:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
