import { NextRequest, NextResponse } from "next/server";
import { PlanTier } from "@prisma/client";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const TIME_REGEX = /^([0-1]\d|2[0-3]):[0-5]\d$/;

const openingHourSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  isOpen: z.boolean(),
  openTime: z
    .string()
    .regex(TIME_REGEX, "Formato de hora inválido")
    .nullable()
    .optional(),
  closeTime: z
    .string()
    .regex(TIME_REGEX, "Formato de hora inválido")
    .nullable()
    .optional(),
});

const payloadSchema = z.object({
  name: z
    .string()
    .min(3, "El nombre debe tener al menos 3 caracteres")
    .max(64, "El nombre es demasiado largo")
    .optional(),
  phone: z
    .string()
    .max(32, "El teléfono debe tener menos de 32 caracteres")
    .optional()
    .nullable(),
  email: z.string().email("Email inválido").max(96).optional().nullable(),
  address: z
    .string()
    .max(160, "La dirección es demasiado larga")
    .optional()
    .nullable(),
  description: z
    .string()
    .max(800, "La descripción es demasiado larga")
    .optional()
    .nullable(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  whatsappNumber: z
    .string()
    .max(32, "El número debe tener menos de 32 dígitos")
    .optional()
    .nullable(),
  whatsappOrderingEnabled: z.boolean().optional(),
  openingHours: z.array(openingHourSchema).optional(),
});

const profileSelect = {
  id: true,
  name: true,
  slug: true,
  plan: true,
  phone: true,
  email: true,
  address: true,
  description: true,
  latitude: true,
  longitude: true,
  whatsappNumber: true,
  whatsappOrderingEnabled: true,
  openingHours: {
    orderBy: { dayOfWeek: "asc" as const },
    select: {
      id: true,
      dayOfWeek: true,
      isOpen: true,
      openTime: true,
      closeTime: true,
    },
  },
} as const;

async function ensureOwner(orgId: string) {
  return prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      ...profileSelect,
      ownerId: true,
    },
  });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const organization = await ensureOwner(orgId);

    if (!organization) {
      return NextResponse.json(
        { error: "Restaurante no encontrado" },
        { status: 404 }
      );
    }

    if (organization.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const { ownerId, ...rest } = organization;
    void ownerId;
    return NextResponse.json({ organization: rest });
  } catch (error) {
    console.error("Error fetching restaurant profile:", error);
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
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const organization = await ensureOwner(orgId);

    if (!organization) {
      return NextResponse.json(
        { error: "Restaurante no encontrado" },
        { status: 404 }
      );
    }

    if (organization.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = payloadSchema.safeParse(body);

    if (!parsed.success) {
      console.error("Validation error:", parsed.error);
      return NextResponse.json(
        {
          error: parsed.error.issues[0]?.message ?? "Datos inválidos",
          details: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const payload = parsed.data;
    const sanitizeString = (value?: string | null) =>
      value && value.trim().length > 0 ? value.trim() : null;

    const updateData: Record<string, unknown> = {};

    if ("name" in payload) {
      updateData.name = payload.name?.trim();
    }

    if ("phone" in payload) {
      updateData.phone = sanitizeString(payload.phone ?? null);
    }

    if ("email" in payload) {
      updateData.email = sanitizeString(payload.email ?? null);
    }

    if ("address" in payload) {
      updateData.address = sanitizeString(payload.address ?? null);
    }

    if ("description" in payload) {
      updateData.description = sanitizeString(payload.description ?? null);
    }

    if ("latitude" in payload) {
      updateData.latitude =
        typeof payload.latitude === "number" ? payload.latitude : null;
    }

    if ("longitude" in payload) {
      updateData.longitude =
        typeof payload.longitude === "number" ? payload.longitude : null;
    }

    let whatsappNumberToPersist: string | null | undefined;

    if ("whatsappNumber" in payload) {
      whatsappNumberToPersist = sanitizeString(payload.whatsappNumber ?? null);
      updateData.whatsappNumber = whatsappNumberToPersist;

      if (!whatsappNumberToPersist) {
        updateData.whatsappOrderingEnabled = false;
      }
    }

    if ("whatsappOrderingEnabled" in payload) {
      const effectiveNumber =
        whatsappNumberToPersist ?? organization.whatsappNumber;

      if (payload.whatsappOrderingEnabled) {
        if (organization.plan !== PlanTier.PREMIUM) {
          return NextResponse.json(
            {
              error:
                "Necesitas el plan Premium para activar los pedidos por WhatsApp",
            },
            { status: 403 }
          );
        }

        if (!effectiveNumber) {
          return NextResponse.json(
            {
              error:
                "Debes registrar un número de WhatsApp antes de activar esta función",
            },
            { status: 400 }
          );
        }

        updateData.whatsappOrderingEnabled = true;
      } else {
        updateData.whatsappOrderingEnabled = false;
      }
    }

    let updatedOrganization;
    if (Object.keys(updateData).length > 0) {
      updatedOrganization = await prisma.organization.update({
        where: { id: orgId },
        data: updateData,
        select: profileSelect,
      });
    } else {
      updatedOrganization = await prisma.organization.findUnique({
        where: { id: orgId },
        select: profileSelect,
      });
    }

    if (!updatedOrganization) {
      return NextResponse.json(
        { error: "Restaurante no encontrado" },
        { status: 404 }
      );
    }

    if (payload.openingHours) {
      for (const hour of payload.openingHours) {
        if (
          hour.isOpen &&
          (!hour.openTime ||
            !hour.closeTime ||
            !TIME_REGEX.test(hour.openTime) ||
            !TIME_REGEX.test(hour.closeTime))
        ) {
          return NextResponse.json(
            {
              error:
                "Define una hora de apertura y cierre válida para cada día activo",
            },
            { status: 400 }
          );
        }
      }

      const normalizedHours = payload.openingHours.map((hour) => ({
        dayOfWeek: hour.dayOfWeek,
        isOpen: hour.isOpen,
        openTime: hour.isOpen ? hour.openTime : null,
        closeTime: hour.isOpen ? hour.closeTime : null,
      }));

      await prisma.$transaction([
        prisma.openingHour.deleteMany({ where: { orgId } }),
        prisma.openingHour.createMany({
          data: normalizedHours.map((hour) => ({
            orgId,
            ...hour,
          })),
        }),
      ]);

      updatedOrganization = await prisma.organization.findUnique({
        where: { id: orgId },
        select: profileSelect,
      });
    }

    return NextResponse.json({ organization: updatedOrganization });
  } catch (error) {
    console.error("Error updating restaurant profile:", error);
    const message =
      error instanceof Error ? error.message : "Error interno del servidor";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
