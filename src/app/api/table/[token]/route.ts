import { NextRequest, NextResponse } from "next/server";
import { directPrisma as prisma } from "@/lib/prisma-direct";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json(
        { error: "Token de mesa requerido" },
        { status: 400 }
      );
    }

    // Buscar la mesa por su qrToken
    const table = await prisma.table.findFirst({
      where: {
        qrToken: token,
      },
      include: {
        org: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!table) {
      return NextResponse.json(
        { error: "Mesa no encontrada" },
        { status: 404 }
      );
    }

    // Verificar que la mesa esté activa (podríamos agregar un campo isActive en el futuro)
    // Por ahora, todas las mesas están activas

    // Verificar que la organización esté activa
    if (!table.org) {
      return NextResponse.json(
        { error: "Restaurante no disponible" },
        { status: 410 } // Gone
      );
    }

    return NextResponse.json({
      table: {
        id: table.id,
        number: table.number,
        qrToken: table.qrToken,
        organization: table.org,
      },
    });
  } catch (error) {
    console.error("Error fetching table:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
