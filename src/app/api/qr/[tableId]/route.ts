import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import QRCode from "qrcode";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tableId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (!session.user.id) {
      console.error("Session user ID missing:", session);
      return NextResponse.json(
        { error: "ID de usuario no encontrado" },
        { status: 401 }
      );
    }

    const { tableId } = await params;

    // Verificar que la mesa existe y pertenece a la organización del usuario
    const table = await prisma.table.findUnique({
      where: { id: tableId },
      include: {
        org: true,
      },
    });

    if (!table) {
      return NextResponse.json(
        { error: "Mesa no encontrada" },
        { status: 404 }
      );
    }

    // Verificar que el usuario pertenece a esta organización
    const membership = await prisma.membership.findFirst({
      where: {
        userId: session.user.id,
        orgId: table.orgId,
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "No autorizado para esta mesa" },
        { status: 403 }
      );
    }

    // Generar la URL completa para el QR
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const qrUrl = `${baseUrl}/table/${table.qrToken}`;

    // Opciones para el QR Code
    const qrOptions = {
      errorCorrectionLevel: "M" as const,
      type: "png" as const,
      quality: 0.92,
      margin: 1,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
      width: 256,
    };

    // Generar el QR Code como buffer
    const qrCodeBuffer = await QRCode.toBuffer(qrUrl, qrOptions);

    // Retornar la imagen PNG
    return new NextResponse(new Uint8Array(qrCodeBuffer), {
      headers: {
        "Content-Type": "image/png",
        "Content-Length": qrCodeBuffer.length.toString(),
        "Cache-Control": "public, max-age=3600", // Cache por 1 hora
      },
    });
  } catch (error) {
    console.error("Error generando QR:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
