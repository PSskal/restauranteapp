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

      // Usar tu email para testing hasta que passkal.com se propague completamente
      // Sin dominio verificado, solo puedes enviar a tu propio email
      const finalToEmail =
        normalizedEmail !== "ricpascual29@gmail.com"
          ? "ricpascual29@gmail.com"
          : normalizedEmail;

      console.log("Enviando correo con Resend:", {
        from,
        to: finalToEmail,
        originalTo: normalizedEmail,
        subject: `Invitacion a ${organization.name}`,
        domain: "onboarding@resend.dev (temporary fallback)",
      });

      const result = await resend.emails.send({
        from,
        to: finalToEmail,
        subject: `Invitacion a ${organization.name}`,
        html: `
          <p>Hola,</p>
          ${finalToEmail !== normalizedEmail ? `<p><strong>📧 NOTA:</strong> Esta invitación era para <code>${normalizedEmail}</code></p>` : ""}
          <p>Te han invitado a unirte al restaurante <strong>${organization.name}</strong> como <strong>${roleName}</strong>.</p>
          <p>Haz clic en el siguiente boton para aceptar la invitacion:</p>
          <p>
            <a href="${inviteUrl}" style="display:inline-block;padding:10px 16px;background-color:#111827;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600">
              Aceptar invitacion
            </a>
          </p>
          <p>Este enlace expira el ${expiresAt.toLocaleDateString()}.</p>
          <p>Si no esperabas esta invitacion, puedes ignorar este correo.</p>
        `,
        text: `Has sido invitado a ${organization.name} como ${roleName}.
Acepta la invitacion visitando: ${inviteUrl}
El enlace expira el ${expiresAt.toLocaleDateString()}`,
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
