import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { checkNumericLimit } from "@/lib/subscription";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const [{ token }, session] = await Promise.all([params, auth()]);

    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const normalizedEmail = session.user.email.toLowerCase();

    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: {
        org: {
          select: {
            id: true,
            name: true,
            ownerId: true,
            plan: true,
          },
        },
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: "Invitacion no encontrada" },
        { status: 404 }
      );
    }

    if (invitation.acceptedAt) {
      return NextResponse.json(
        { error: "La invitacion ya fue aceptada" },
        { status: 410 }
      );
    }

    if (invitation.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "La invitacion expiro" },
        { status: 410 }
      );
    }

    if (invitation.email !== normalizedEmail) {
      return NextResponse.json(
        { error: "El correo de la sesion no coincide con la invitacion" },
        { status: 403 }
      );
    }

    const userId = session.user.id;

    try {
      await prisma.$transaction(async (tx) => {
        const existingMembership = await tx.membership.findFirst({
          where: {
            orgId: invitation.orgId,
            userId,
          },
        });

        if (existingMembership) {
          throw new Error("already-member");
        }

        const membershipCount = await tx.membership.count({
          where: { orgId: invitation.orgId },
        });

        const seatCheck = checkNumericLimit(
          invitation.org.plan,
          "staffSeats",
          membershipCount
        );

        if (!seatCheck.allowed) {
          throw new Error("seat-limit");
        }

        await tx.membership.create({
          data: {
            orgId: invitation.orgId,
            userId,
            role: invitation.role,
          },
        });

        await tx.invitation.update({
          where: { id: invitation.id },
          data: {
            acceptedAt: new Date(),
          },
        });
      });
    } catch (txError) {
      if (txError instanceof Error && txError.message === "already-member") {
        return NextResponse.json(
          { error: "Ya eres miembro de este restaurante" },
          { status: 409 }
        );
      }

      if (txError instanceof Error && txError.message === "seat-limit") {
        return NextResponse.json(
          {
            error:
              "Este restaurante alcanz� el l�mite de usuarios del plan Free.",
          },
          { status: 402 }
        );
      }

      throw txError;
    }

    return NextResponse.json({
      membership: {
        orgId: invitation.orgId,
        orgName: invitation.org.name,
        role: invitation.role,
      },
    });
  } catch (error) {
    console.error("Error accepting invitation:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
