import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

interface LayoutUpdate {
  id: string;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  shape: string;
  rotation: number;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { orgId } = await params;

    // Verificar que el usuario pertenece a esta organización
    const membership = await prisma.membership.findUnique({
      where: {
        userId_orgId: {
          userId: session.user.id,
          orgId,
        },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "No tienes acceso a esta organización" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { positions } = body as { positions: LayoutUpdate[] };

    if (!positions || !Array.isArray(positions)) {
      return NextResponse.json(
        { error: "Formato de datos inválido" },
        { status: 400 }
      );
    }

    // Actualizar cada mesa con su nueva posición
    await Promise.all(
      positions.map((position) =>
        prisma.table.update({
          where: {
            id: position.id,
            orgId, // Asegurar que la mesa pertenece a esta org
          },
          data: {
            positionX: position.positionX,
            positionY: position.positionY,
            width: position.width,
            height: position.height,
            shape: position.shape,
            rotation: position.rotation,
          },
        })
      )
    );

    return NextResponse.json({
      success: true,
      message: "Layout guardado exitosamente",
    });
  } catch (error) {
    console.error("Error guardando layout:", error);
    return NextResponse.json(
      { error: "Error al guardar el layout" },
      { status: 500 }
    );
  }
}
