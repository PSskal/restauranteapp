import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { planAllows } from "@/lib/subscription";
import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary from environment variables. Prefer CLOUDINARY_URL but allow individual vars.
const cloudinaryUrl = process.env.CLOUDINARY_URL;
if (cloudinaryUrl) {
  cloudinary.config({ url: cloudinaryUrl });
} else {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const orgId = formData.get("orgId");

    if (!orgId || typeof orgId !== "string") {
      return NextResponse.json(
        { error: "Debes indicar un restaurante" },
        { status: 400 }
      );
    }

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
      select: {
        id: true,
        plan: true,
      },
    });

    if (!organization) {
      return NextResponse.json(
        { error: "No tienes permisos para subir imágenes en este restaurante" },
        { status: 403 }
      );
    }

    if (!planAllows(organization.plan, "allowImageUpload")) {
      return NextResponse.json(
        {
          error:
            "Actualiza a Premium para subir imágenes y personalizar tu carta.",
        },
        { status: 402 }
      );
    }

    if (!file) {
      return NextResponse.json(
        { error: "No se encontro archivo" },
        { status: 400 }
      );
    }

    // Validar que sea una imagen
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Solo se permiten archivos de imagen" },
        { status: 400 }
      );
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "La imagen excede el tamano maximo de 5MB" },
        { status: 400 }
      );
    }

    // Upload to Cloudinary
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // If Cloudinary not configured, return an error
    try {
      if (!process.env.CLOUDINARY_URL && !process.env.CLOUDINARY_API_KEY) {
        return NextResponse.json(
          {
            error: "Cloudinary no está configurado en las variables de entorno",
          },
          { status: 500 }
        );
      }

      // Upload using data URI to avoid streaming dependencies
      const dataUri = `data:${file.type};base64,${buffer.toString("base64")}`;

      const uploadOptions: Record<string, unknown> = {
        folder: `org_${orgId}`,
        resource_type: "image",
        use_filename: true,
        unique_filename: true,
        overwrite: false,
      };

      const result = await cloudinary.uploader.upload(dataUri, uploadOptions);

      // Optionally save record in DB (e.g., branding or menu item) - omitted here
      return NextResponse.json({ url: result.secure_url, raw: result });
    } catch (err) {
      console.error("Cloudinary upload error:", err);
      return NextResponse.json(
        { error: "Error subiendo a Cloudinary" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error uploading image:", error);
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
