import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    console.log("=== DEBUG DATABASE ===");

    // Listar todos los usuarios
    const users = await prisma.user.findMany();
    console.log("All users:", JSON.stringify(users, null, 2));

    // Listar todas las organizaciones
    const organizations = await prisma.organization.findMany();
    console.log("All organizations:", JSON.stringify(organizations, null, 2));

    // Listar todas las membresías
    const memberships = await prisma.membership.findMany({
      include: {
        user: true,
        org: true,
      },
    });
    console.log("All memberships:", JSON.stringify(memberships, null, 2));

    return NextResponse.json({
      users: users.map((u) => ({ id: u.id, email: u.email, name: u.name })),
      organizations: organizations.map((org) => ({
        id: org.id,
        name: org.name,
        slug: org.slug,
        ownerId: org.ownerId,
      })),
      memberships: memberships.map((m) => ({
        userId: m.userId,
        userEmail: m.user?.email,
        orgId: m.orgId,
        orgName: m.org?.name,
      })),
      totals: {
        users: users.length,
        organizations: organizations.length,
        memberships: memberships.length,
      },
    });
  } catch (error) {
    console.error("Error in debug database:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
