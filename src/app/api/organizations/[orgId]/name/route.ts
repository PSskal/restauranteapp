import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { log } from "@/lib/logger";

const patchSchema = z.object({
  name: z.string().trim().min(1, "Nombre requerido").max(32, "Máximo 32 caracteres"),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { orgId } = await params;

    let jsonBody: unknown;
    try {
      jsonBody = await request.json();
    } catch {
      return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
    }

    const parsed = patchSchema.safeParse(jsonBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name } = parsed.data;

    // Sólo OWNER o MANAGER pueden cambiar el nombre del restaurante
    const hasAccess = await prisma.organization.findFirst({
      where: {
        id: orgId,
        OR: [
          { ownerId: session.user.id },
          {
            memberships: {
              some: {
                userId: session.user.id,
                role: { in: ["OWNER", "MANAGER"] },
              },
            },
          },
        ],
      },
    });

    if (!hasAccess) {
      return NextResponse.json(
        { error: "No tienes permisos para renombrar el restaurante" },
        { status: 403 }
      );
    }

    // Genera slug seguro a partir del nombre
    const slug = name
      .toLowerCase()
      .normalize("NFD")
      // Elimina marcas combinatorias (acentos)
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    if (!slug) {
      return NextResponse.json(
        { error: "El nombre no genera un slug válido" },
        { status: 400 }
      );
    }

    // Si el slug nuevo ya está tomado por otra org, abortamos
    const collision = await prisma.organization.findFirst({
      where: { slug, id: { not: orgId } },
      select: { id: true },
    });
    if (collision) {
      return NextResponse.json(
        { error: "Ya existe otro restaurante con un nombre similar" },
        { status: 409 }
      );
    }

    const updatedOrg = await prisma.organization.update({
      where: { id: orgId },
      data: { name, slug },
    });

    return NextResponse.json({
      message: "Nombre actualizado",
      organization: updatedOrg,
    });
  } catch (error) {
    log.error("organizations.rename.exception", error);
    return NextResponse.json(
      { error: "Error al actualizar el nombre" },
      { status: 500 }
    );
  }
}
