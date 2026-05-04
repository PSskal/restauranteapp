import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Color inválido")
    .nullable()
    .optional(),
  position: z.number().int().min(0).max(99).optional(),
  active: z.boolean().optional(),
});

const WRITE_ROLES: Role[] = [Role.OWNER, Role.MANAGER];

async function assertWriter(orgId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "No autorizado", status: 401 as const };
  }

  const [membership, isOwner] = await Promise.all([
    prisma.membership.findFirst({
      where: {
        userId: session.user.id,
        orgId,
        role: { in: WRITE_ROLES },
      },
    }),
    prisma.organization.findFirst({
      where: { id: orgId, ownerId: session.user.id },
      select: { id: true },
    }),
  ]);

  if (!membership && !isOwner) {
    return {
      error: "No tienes permisos para editar estaciones",
      status: 403 as const,
    };
  }

  return { ok: true as const };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string; stationId: string }> }
) {
  try {
    const { orgId, stationId } = await params;
    const access = await assertWriter(orgId);
    if ("error" in access) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      );
    }

    const station = await prisma.kitchenStation.findFirst({
      where: { id: stationId, orgId },
      select: { id: true },
    });
    if (!station) {
      return NextResponse.json(
        { error: "Estación no encontrada" },
        { status: 404 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
    }

    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    if (parsed.data.name) {
      const duplicate = await prisma.kitchenStation.findFirst({
        where: {
          orgId,
          name: parsed.data.name.trim(),
          id: { not: stationId },
        },
        select: { id: true },
      });
      if (duplicate) {
        return NextResponse.json(
          { error: "Ya existe otra estación con ese nombre" },
          { status: 409 }
        );
      }
    }

    const updated = await prisma.kitchenStation.update({
      where: { id: stationId },
      data: {
        name: parsed.data.name?.trim(),
        color: parsed.data.color,
        position: parsed.data.position,
        active: parsed.data.active,
      },
    });

    return NextResponse.json({
      station: {
        id: updated.id,
        name: updated.name,
        color: updated.color,
        position: updated.position,
        active: updated.active,
      },
    });
  } catch (error) {
    console.error("Error actualizando estación:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ orgId: string; stationId: string }> }
) {
  try {
    const { orgId, stationId } = await params;
    const access = await assertWriter(orgId);
    if ("error" in access) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      );
    }

    const station = await prisma.kitchenStation.findFirst({
      where: { id: stationId, orgId },
      select: { id: true },
    });
    if (!station) {
      return NextResponse.json(
        { error: "Estación no encontrada" },
        { status: 404 }
      );
    }

    // Los MenuItems quedan con stationId en NULL por el onDelete SetNull
    await prisma.kitchenStation.delete({ where: { id: stationId } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error eliminando estación:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
