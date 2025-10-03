import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Listar todas las mesas con sus organizaciones
    const tables = await prisma.table.findMany({
      include: {
        org: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    console.log("All tables with orgs:", JSON.stringify(tables, null, 2));

    return NextResponse.json({
      tables: tables.map((table) => ({
        id: table.id,
        number: table.number,
        qrToken: table.qrToken,
        orgId: table.orgId,
        organization: table.org,
      })),
      totalTables: tables.length,
    });
  } catch (error) {
    console.error("Error in debug tables:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

