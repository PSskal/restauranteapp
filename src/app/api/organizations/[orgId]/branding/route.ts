import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { planAllows } from "@/lib/subscription";

const DEFAULT_BRANDING = {
  brandColor: "#146E37",
  accentColor: "#F9FAFB",
  logoUrl: null as string | null,
};

const HEX_REGEX = /^#[0-9A-Fa-f]{6}$/;

function isMissingBrandingTable(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2021" || error.code === "P2010")
  );
}

async function assertMembership(orgId: string, userId: string) {
  return prisma.organization.findFirst({
    where: {
      id: orgId,
      OR: [
        { ownerId: userId },
        {
          memberships: {
            some: {
              userId,
            },
          },
        },
      ],
    },
    select: { id: true },
  });
}

async function assertManagerAccess(orgId: string, userId: string) {
  return prisma.organization.findFirst({
    where: {
      id: orgId,
      OR: [
        { ownerId: userId },
        {
          memberships: {
            some: {
              userId,
              role: { in: ["OWNER", "MANAGER"] },
            },
          },
        },
      ],
    },
    select: { id: true, plan: true },
  });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  let orgId: string | null = null;
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const extracted = await params;
    orgId = extracted.orgId;

    const membership = await assertMembership(orgId, session.user.id);
    if (!membership) {
      return NextResponse.json(
        { error: "No tienes acceso a esta organizacion" },
        { status: 403 },
      );
    }

    const branding = await prisma.branding.findUnique({
      where: { orgId },
    });

    return NextResponse.json({
      branding: branding ?? { ...DEFAULT_BRANDING, orgId },
    });
  } catch (error) {
    console.error("Error fetching branding:", error);
    if (orgId && isMissingBrandingTable(error)) {
      return NextResponse.json({
        branding: { ...DEFAULT_BRANDING, orgId },
      });
    }
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { orgId } = await params;

    const organization = await assertManagerAccess(orgId, session.user.id);
    if (!organization) {
      return NextResponse.json(
        { error: "No tienes permisos para modificar el branding" },
        { status: 403 },
      );
    }

    if (!planAllows(organization.plan, "allowBranding")) {
      return NextResponse.json(
        {
          error:
            "El branding personalizado solo est� disponible en el plan Premium.",
        },
        { status: 402 },
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
    }

    const { brandColor, accentColor, logoUrl } = body as {
      brandColor?: unknown;
      accentColor?: unknown;
      logoUrl?: unknown;
    };

    if (
      typeof brandColor !== "string" ||
      typeof accentColor !== "string" ||
      !HEX_REGEX.test(brandColor) ||
      !HEX_REGEX.test(accentColor)
    ) {
      return NextResponse.json(
        { error: "Los colores deben ser valores hexadecimales validos" },
        { status: 400 },
      );
    }

    if (logoUrl != null && typeof logoUrl !== "string") {
      return NextResponse.json(
        { error: "El logo debe ser una URL valida o null" },
        { status: 400 },
      );
    }

    const branding = await prisma.branding.upsert({
      where: { orgId },
      create: {
        orgId,
        brandColor,
        accentColor,
        logoUrl: logoUrl ?? null,
      },
      update: {
        brandColor,
        accentColor,
        logoUrl: logoUrl ?? null,
      },
    });

    return NextResponse.json({ branding });
  } catch (error) {
    console.error("Error updating branding:", error);
    if (isMissingBrandingTable(error)) {
      return NextResponse.json(
        {
          error:
            "Branding no disponible aún. Asegúrate de aplicar las migraciones de base de datos.",
        },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { orgId } = await params;

    const organization = await assertManagerAccess(orgId, session.user.id);
    if (!organization) {
      return NextResponse.json(
        { error: "No tienes permisos para modificar el branding" },
        { status: 403 },
      );
    }

    if (!planAllows(organization.plan, "allowBranding")) {
      return NextResponse.json(
        {
          error:
            "El branding personalizado solo est� disponible en el plan Premium.",
        },
        { status: 402 },
      );
    }

    const existing = await prisma.branding.findUnique({ where: { orgId } });
    if (existing) {
      await prisma.branding.delete({ where: { orgId } });
    }

    return NextResponse.json({
      branding: { ...DEFAULT_BRANDING, orgId },
    });
  } catch (error) {
    console.error("Error deleting branding:", error);
    if (isMissingBrandingTable(error)) {
      return NextResponse.json(
        {
          error:
            "Branding no disponible aún. Asegúrate de aplicar las migraciones de base de datos.",
        },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
