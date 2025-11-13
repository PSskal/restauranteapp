import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

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
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Nombre inválido" }, { status: 400 });
    }

    if (name.length > 32) {
      return NextResponse.json(
        { error: "El nombre no puede tener más de 32 caracteres" },
        { status: 400 }
      );
    }

    // Verificar que el usuario tenga acceso a esta organización
    const hasAccess = await prisma.organization.findFirst({
      where: {
        id: orgId,
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
    });

    if (!hasAccess) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    // Generar slug a partir del nombre
    const slug = name
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Eliminar acentos
      .replace(/[^a-z0-9\s-]/g, "") // Eliminar caracteres especiales
      .replace(/\s+/g, "-") // Reemplazar espacios con guiones
      .replace(/-+/g, "-") // Reemplazar múltiples guiones con uno solo
      .replace(/^-|-$/g, ""); // Eliminar guiones al inicio y final

    // Actualizar el nombre y slug de la organización
    const updatedOrg = await prisma.organization.update({
      where: { id: orgId },
      data: {
        name,
        slug,
      },
    });

    return NextResponse.json({
      message: "Nombre actualizado exitosamente",
      organization: updatedOrg,
    });
  } catch (error) {
    console.error("Error updating organization name:", error);
    return NextResponse.json(
      { error: "Error al actualizar el nombre" },
      { status: 500 }
    );
  }
}
