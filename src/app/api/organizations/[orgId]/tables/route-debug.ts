import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;

    console.log("=== Tables API Debug ===");
    console.log("OrgId:", orgId);

    // Verificación básica sin autenticación compleja (temporal)
    const tables = await prisma.table.findMany({
      where: {
        orgId: orgId,
      },
      orderBy: {
        number: "asc",
      },
      include: {
        org: {
          select: {
            name: true,
          },
        },
      },
    });

    console.log("Found tables:", tables.length);

    return NextResponse.json({
      success: true,
      tables,
      count: tables.length,
    });
  } catch (error) {
    console.error("Error fetching tables:", error);
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

// Mantener otros métodos existentes...
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const body = await request.json();
    const { number } = body;

    if (!number || typeof number !== "number") {
      return NextResponse.json(
        { error: "Número de mesa es requerido" },
        { status: 400 }
      );
    }

    // Verificar si ya existe una mesa con ese número
    const existingTable = await prisma.table.findFirst({
      where: {
        orgId,
        number,
      },
    });

    if (existingTable) {
      return NextResponse.json(
        { error: "Ya existe una mesa con ese número" },
        { status: 400 }
      );
    }

    // Crear la nueva mesa
    const newTable = await prisma.table.create({
      data: {
        orgId,
        number,
        // qrToken se genera automáticamente por el default en el schema
      },
    });

    return NextResponse.json({
      success: true,
      table: newTable,
    });
  } catch (error) {
    console.error("Error creating table:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
