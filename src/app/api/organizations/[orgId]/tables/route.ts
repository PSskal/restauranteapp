import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { checkNumericLimit } from "@/lib/subscription";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;

    // Verificar autenticación
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // Verificar que el usuario tiene acceso a esta organización
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
      return NextResponse.json(
        { error: "No tienes acceso a esta organización" },
        { status: 403 }
      );
    }

    // Obtener las mesas de la organización
    const tables = await prisma.table.findMany({
      where: {
        orgId: orgId,
      },
      orderBy: {
        number: "asc",
      },
    });

    return NextResponse.json({
      tables,
      success: true,
    });
  } catch (error) {
    console.error("Error fetching tables:", error);
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

    // Verificar autenticación
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // Verificar que el usuario tiene acceso y permisos para crear mesas
    const organization = await prisma.organization.findFirst({
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

    if (!organization) {
      return NextResponse.json(
        { error: "No tienes permisos para crear mesas en esta organización" },
        { status: 403 }
      );
    }

    // Obtener datos del body
    const { number } = await request.json();

    // Validaciones
    if (!number || number < 1) {
      return NextResponse.json(
        { error: "El número de mesa debe ser un entero positivo" },
        { status: 400 }
      );
    }

    // Verificar que el número de mesa no exista ya
    const existingTable = await prisma.table.findFirst({
      where: {
        orgId: orgId,
        number: number,
      },
    });

    if (existingTable) {
      return NextResponse.json(
        { error: `La mesa número ${number} ya existe` },
        { status: 409 }
      );
    }

    const currentTables = await prisma.table.count({
      where: { orgId },
    });

    const limitCheck = checkNumericLimit(
      organization.plan,
      "tables",
      currentTables
    );

    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          error:
            "Alcanzaste el l�mite de mesas del plan Free. Actualiza a Premium para crear m�s mesas.",
        },
        { status: 402 }
      );
    }

    // Crear la nueva mesa con QR token único
    const newTable = await prisma.table.create({
      data: {
        orgId: orgId,
        number: number,
        // qrToken se genera automáticamente con el default en el schema
        isEnabled: false,
      },
    });

    return NextResponse.json({
      table: newTable,
      success: true,
      message: `Mesa ${number} creada exitosamente`,
    });
  } catch (error) {
    console.error("Error creating table:", error);

    // Manejar errores específicos de Prisma
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "El número de mesa ya existe" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
    }

    const { tableId, isEnabled } = body as {
      tableId?: string;
      isEnabled?: unknown;
    };

    if (!tableId || typeof isEnabled !== "boolean") {
      return NextResponse.json(
        { error: "Datos inválidos para actualizar la mesa" },
        { status: 400 }
      );
    }

    const membership = await prisma.organization.findFirst({
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

    if (!membership) {
      return NextResponse.json(
        { error: "No tienes permisos para modificar mesas" },
        { status: 403 }
      );
    }

    const table = await prisma.table.findFirst({
      where: { id: tableId, orgId },
    });

    if (!table) {
      return NextResponse.json(
        { error: "La mesa indicada no existe" },
        { status: 404 }
      );
    }

    const updated = await prisma.table.update({
      where: { id: tableId },
      data: { isEnabled },
    });

    return NextResponse.json({
      table: updated,
      success: true,
    });
  } catch (error) {
    console.error("Error updating table:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

