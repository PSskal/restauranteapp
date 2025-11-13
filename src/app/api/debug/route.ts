import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    console.log("=== DEBUG API TEST ===");

    // Test 1: Conexión básica de Prisma
    const userCount = await prisma.user.count();
    console.log("User count:", userCount);

    // Test 2: Consulta de organizaciones
    const organizations = await prisma.organization.findMany({
      select: {
        id: true,
        name: true,
        ownerId: true,
      },
      take: 5,
    });
    console.log("Organizations:", organizations);

    // Test 3: Consulta de mesas
    const tables = await prisma.table.findMany({
      select: {
        id: true,
        number: true,
        orgId: true,
      },
      take: 10,
    });
    console.log("Tables:", tables);

    return NextResponse.json({
      success: true,
      userCount,
      organizations,
      tables,
    });
  } catch (error) {
    console.error("Error in debug API:", error);
    return NextResponse.json(
      {
        error: "Error interno",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
