import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();

    console.log("=== DEBUG SESSION ===");
    console.log("Session:", JSON.stringify(session, null, 2));

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          error: "No session or no user ID",
          session: session,
        },
        { status: 401 }
      );
    }

    // Buscar usuario en la base de datos
    const dbUser = await prisma.user.findUnique({
      where: {
        id: session.user.id,
      },
    });

    console.log("DB User:", JSON.stringify(dbUser, null, 2));

    // Buscar organizaciones del usuario
    const userMemberships = await prisma.membership.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        org: true,
      },
    });

    console.log("User memberships:", JSON.stringify(userMemberships, null, 2));

    // Buscar organizaciones propias
    const ownedOrgs = await prisma.organization.findMany({
      where: {
        ownerId: session.user.id,
      },
    });

    console.log("Owned orgs:", JSON.stringify(ownedOrgs, null, 2));

    return NextResponse.json({
      session,
      dbUser,
      userMemberships,
      ownedOrgs,
      totalOrgs: ownedOrgs.length + userMemberships.length,
    });
  } catch (error) {
    console.error("Error in debug session:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
