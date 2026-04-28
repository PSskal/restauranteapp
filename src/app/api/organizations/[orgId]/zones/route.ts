import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { log } from "@/lib/logger";

const createSchema = z.object({
  name: z.string().trim().min(1, "Nombre requerido").max(60),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Color inválido")
    .optional(),
  position: z.number().int().min(0).max(99).optional(),
});

const WRITE_ROLES: Role[] = [Role.OWNER, Role.MANAGER];

async function checkAccess(orgId: string, writer: boolean) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "No autorizado", status: 401 as const };
  }

  const [membership, isOwner] = await Promise.all([
    prisma.membership.findFirst({
      where: {
        userId: session.user.id,
        orgId,
        ...(writer ? { role: { in: WRITE_ROLES } } : {}),
      },
    }),
    prisma.organization.findFirst({
      where: { id: orgId, ownerId: session.user.id },
      select: { id: true },
    }),
  ]);

  if (!membership && !isOwner) {
    return {
      error: writer
        ? "No tienes permisos para editar zonas"
        : "No tienes acceso a esta organización",
      status: 403 as const,
    };
  }

  return { ok: true as const };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const access = await checkAccess(orgId, false);
    if ("error" in access) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      );
    }

    const zones = await prisma.zone.findMany({
      where: { orgId },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    });

    return NextResponse.json({
      zones: zones.map((z) => ({
        id: z.id,
        name: z.name,
        color: z.color,
        position: z.position,
      })),
    });
  } catch (error) {
    log.error("zones.list.exception", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const access = await checkAccess(orgId, true);
    if ("error" in access) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
    }

    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, color, position } = parsed.data;

    const existing = await prisma.zone.findFirst({
      where: { orgId, name: name.trim() },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Ya existe una zona con ese nombre" },
        { status: 409 }
      );
    }

    const lastPosition =
      position ?? (await prisma.zone.count({ where: { orgId } }));

    const zone = await prisma.zone.create({
      data: {
        orgId,
        name: name.trim(),
        color: color ?? null,
        position: lastPosition,
      },
    });

    return NextResponse.json(
      {
        zone: {
          id: zone.id,
          name: zone.name,
          color: zone.color,
          position: zone.position,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    log.error("zones.create.exception", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
