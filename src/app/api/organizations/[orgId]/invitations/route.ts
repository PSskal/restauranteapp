import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { checkNumericLimit } from "@/lib/subscription";
import { assertResendClient, getResendFromAddress } from "@/lib/resend";

const invitationSchema = z.object({
  email: z.string().email(),
  role: z.nativeEnum(Role),
});

const INVITATION_EXPIRATION_DAYS = 7;

function buildInviteLink(token: string) {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL.replace(/^https?:\/\//, "")}`
      : "http://localhost:3000");

  return `${baseUrl.replace(/\/$/, "")}/invite/${token}`;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const [{ orgId }, session] = await Promise.all([params, auth()]);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const json = await request.json().catch(() => null);
    const parsed = invitationSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos invalidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { email, role } = parsed.data;

    const organization = await prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        id: true,
        name: true,
        ownerId: true,
        plan: true,
      },
    });

    if (!organization) {
      return NextResponse.json(
        { error: "Organizacion no encontrada" },
        { status: 404 }
      );
    }

    const sessionUserId = session.user.id;

    const membership = await prisma.membership.findFirst({
      where: {
        orgId,
        userId: sessionUserId,
      },
      select: {
        role: true,
      },
    });

    const isOwner = organization.ownerId === sessionUserId;
    const canManageStaff =
      isOwner ||
      membership?.role === Role.MANAGER ||
      membership?.role === Role.OWNER;

    if (!canManageStaff) {
      return NextResponse.json(
        { error: "No tienes permisos para invitar personal" },
        { status: 403 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    const membershipCount = await prisma.membership.count({
      where: { orgId },
    });

    const seatCheck = checkNumericLimit(
      organization.plan,
      "staffSeats",
      membershipCount
    );

    if (!seatCheck.allowed) {
      return NextResponse.json(
        {
          error:
            "Alcanzaste el l�mite de usuarios del plan Free. Actualiza a Premium para invitar m�s personal.",
        },
        { status: 402 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (existingUser) {
      const existingMembership = await prisma.membership.findFirst({
        where: {
          orgId,
          userId: existingUser.id,
        },
      });

      if (existingMembership) {
        return NextResponse.json(
          {
            error: "El usuario ya forma parte del restaurante",
          },
          { status: 409 }
        );
      }
    }

    const pendingInvitation = await prisma.invitation.findFirst({
      where: {
        orgId,
        email: normalizedEmail,
        acceptedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (pendingInvitation) {
      return NextResponse.json(
        {
          error: "Ya existe una invitacion pendiente para este correo",
        },
        { status: 409 }
      );
    }

    const token = randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRATION_DAYS);

    const invitation = await prisma.invitation.create({
      data: {
        orgId,
        email: normalizedEmail,
        role,
        token,
        expiresAt,
      },
    });

    try {
      const resend = assertResendClient();
      const from = getResendFromAddress();
      const inviteUrl = buildInviteLink(token);
      const roleName = role.charAt(0) + role.slice(1).toLowerCase();

      console.log("Enviando invitación con Resend:", {
        from,
        to: normalizedEmail,
        subject: `Invitación a ${organization.name}`,
      });

      const result = await resend.emails.send({
        from,
        to: normalizedEmail,
        reply_to: "ricpascual29@gmail.com", // Las respuestas irán aquí
        subject: `Invitación a ${organization.name}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Invitación a ${organization.name}</h2>
            <p>Hola,</p>
            <p>Te han invitado a unirte al restaurante <strong>${organization.name}</strong> como <strong>${roleName}</strong>.</p>
            <p>Haz clic en el siguiente botón para aceptar la invitación:</p>
            <p style="margin: 24px 0;">
              <a href="${inviteUrl}" style="display:inline-block;padding:12px 24px;background-color:#111827;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;">
                Aceptar invitación
              </a>
            </p>
            <p style="color: #666; font-size: 14px;">O copia este enlace en tu navegador:</p>
            <p style="color: #666; font-size: 14px; word-break: break-all;">${inviteUrl}</p>
            <p style="color: #999; font-size: 12px; margin-top: 32px;">Este enlace expira el ${expiresAt.toLocaleDateString("es-PE", { dateStyle: "long" })}.</p>
            <p style="color: #999; font-size: 12px;">Si no esperabas esta invitación, puedes ignorar este correo.</p>
          </div>
        `,
        text: `Has sido invitado a ${organization.name} como ${roleName}.

Acepta la invitación visitando: ${inviteUrl}

El enlace expira el ${expiresAt.toLocaleDateString("es-PE", { dateStyle: "long" })}

Si no esperabas esta invitación, puedes ignorar este correo.`,
      });

      console.log("Resend result:", result);

      if (result.error) {
        console.error("Resend API error details:", result.error);
        throw new Error(
          `Resend API error: ${result.error.message || JSON.stringify(result.error)}`
        );
      }
    } catch (emailError) {
      await prisma.invitation.delete({ where: { id: invitation.id } });
      console.error("Error enviando invitacion por correo:", emailError);
      return NextResponse.json(
        {
          error:
            "No se pudo enviar el correo de invitacion. Intenta nuevamente.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json(
      {
        invitation: {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          expiresAt: invitation.expiresAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating invitation:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
