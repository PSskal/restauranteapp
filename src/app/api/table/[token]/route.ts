import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

function isMissingBrandingTable(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2021" || error.code === "P2010")
  );
}

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
    let table = null;
    try {
      table = await prisma.table.findFirst({
        where: {
          qrToken: token,
        },
        include: {
          org: {
            select: {
              id: true,
              name: true,
              branding: {
                select: {
                  brandColor: true,
                  accentColor: true,
                  logoUrl: true,
                },
              },
            },
          },
        },
      });
    } catch (queryError) {
      if (isMissingBrandingTable(queryError)) {
        table = await prisma.table.findFirst({
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
      } else {
        throw queryError;
      }
    }

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

    const branding =
      "branding" in table.org && table.org.branding
        ? table.org.branding
        : {
            brandColor: "#146E37",
            accentColor: "#F9FAFB",
            logoUrl: null,
          };

    return NextResponse.json({
      table: {
        id: table.id,
        number: table.number,
        qrToken: table.qrToken,
        organization: {
          id: table.org.id,
          name: table.org.name,
          branding,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching table:", error);
    if (isMissingBrandingTable(error)) {
      return NextResponse.json(
        { error: "Branding no disponible aún. Contacta al administrador." },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
