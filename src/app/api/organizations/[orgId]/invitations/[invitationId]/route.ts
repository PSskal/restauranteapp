import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { assertResendClient, getResendFromAddress } from "@/lib/resend";

const ACTION_SCHEMA = z.object({
  action: z.enum(["resend"]),
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

async function ensureCanManageStaff(
  orgId: string,
  userId: string
): Promise<
  | { error: { status: number; message: string } }
  | { organization: { id: string; name: string; ownerId: string } }
> {
  const organization = await prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      id: true,
      name: true,
      ownerId: true,
    },
  });

  if (!organization) {
    return { error: { status: 404, message: "Organizacion no encontrada" } };
  }

  const membership = await prisma.membership.findFirst({
    where: {
      orgId,
      userId,
    },
    select: { role: true },
  });

  const canManage =
    organization.ownerId === userId ||
    membership?.role === Role.MANAGER ||
    membership?.role === Role.OWNER;

  if (!canManage) {
    return {
      error: {
        status: 403,
        message: "No tienes permisos para gestionar personal",
      },
    };
  }

  return { organization };
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ orgId: string; invitationId: string }> }
) {
  try {
    const [{ orgId, invitationId }, session] = await Promise.all([
      params,
      auth(),
    ]);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const guard = await ensureCanManageStaff(orgId, session.user.id);
    if ("error" in guard) {
      return NextResponse.json(
        { error: guard.error.message },
        { status: guard.error.status }
      );
    }

    const invitation = await prisma.invitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation || invitation.orgId !== orgId) {
      return NextResponse.json(
        { error: "Invitacion no encontrada" },
        { status: 404 }
      );
    }

    if (invitation.acceptedAt) {
      return NextResponse.json(
        { error: "La invitacion ya fue aceptada" },
        { status: 409 }
      );
    }

    await prisma.invitation.delete({
      where: { id: invitationId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting invitation:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string; invitationId: string }> }
) {
  try {
    const [{ orgId, invitationId }, session] = await Promise.all([
      params,
      auth(),
    ]);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const json = await request.json().catch(() => null);
    const parsed = ACTION_SCHEMA.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos invalidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    if (parsed.data.action !== "resend") {
      return NextResponse.json(
        { error: "Accion no soportada" },
        { status: 400 }
      );
    }

    const guard = await ensureCanManageStaff(orgId, session.user.id);
    if ("error" in guard) {
      return NextResponse.json(
        { error: guard.error.message },
        { status: guard.error.status }
      );
    }

    const invitation = await prisma.invitation.findUnique({
      where: { id: invitationId },
      include: {
        org: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!invitation || invitation.orgId !== orgId) {
      return NextResponse.json(
        { error: "Invitacion no encontrada" },
        { status: 404 }
      );
    }

    if (invitation.acceptedAt) {
      return NextResponse.json(
        { error: "La invitacion ya fue aceptada" },
        { status: 409 }
      );
    }

    const oldToken = invitation.token;
    const oldExpiresAt = invitation.expiresAt;

    const newToken = randomUUID();
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + INVITATION_EXPIRATION_DAYS);

    const updatedInvitation = await prisma.invitation.update({
      where: { id: invitation.id },
      data: {
        token: newToken,
        expiresAt: newExpiresAt,
      },
    });

    try {
      const resend = assertResendClient();
      const from = getResendFromAddress();
      const inviteUrl = buildInviteLink(newToken);
      const roleName =
        invitation.role.charAt(0) + invitation.role.slice(1).toLowerCase();

      await resend.emails.send({
        from,
        to: invitation.email,
        subject: `Invitacion a ${invitation.org.name}`,
        html: `
          <p>Hola,</p>
          <p>Te han invitado a unirte al restaurante <strong>${invitation.org.name}</strong> como <strong>${roleName}</strong>.</p>
          <p>Haz clic en el siguiente boton para aceptar la invitacion:</p>
          <p>
            <a href="${inviteUrl}" style="display:inline-block;padding:10px 16px;background-color:#111827;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600">
              Aceptar invitacion
            </a>
          </p>
          <p>Este enlace expira el ${newExpiresAt.toLocaleDateString()}.</p>
          <p>Si no esperabas esta invitacion, puedes ignorar este correo.</p>
        `,
        text: `Has sido invitado a ${invitation.org.name} como ${roleName}.
Acepta la invitacion visitando: ${inviteUrl}
El enlace expira el ${newExpiresAt.toLocaleDateString()}`,
      });
    } catch (emailError) {
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: {
          token: oldToken,
          expiresAt: oldExpiresAt,
        },
      });
      console.error("Error reenviando invitacion:", emailError);
      return NextResponse.json(
        {
          error:
            "No se pudo reenviar el correo de invitacion. Intenta nuevamente.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      invitation: {
        id: updatedInvitation.id,
        email: updatedInvitation.email,
        role: updatedInvitation.role,
        expiresAt: updatedInvitation.expiresAt,
      },
    });
  } catch (error) {
    console.error("Error updating invitation:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
