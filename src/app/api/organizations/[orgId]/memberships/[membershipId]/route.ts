import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

// PUT: Cambiar el rol de un miembro
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ orgId: string; membershipId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { orgId, membershipId } = await params;
    const { role } = await req.json();

    // Validar rol
    const validRoles = ["MANAGER", "CASHIER", "WAITER", "KITCHEN"];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
    }

    // Verificar que el usuario tiene permiso (owner o manager)
    const userMembership = await prisma.membership.findUnique({
      where: {
        userId_orgId: {
          userId: session.user.id,
          orgId: orgId,
        },
      },
      include: {
        org: {
          select: { ownerId: true },
        },
      },
    });

    const isOwner = userMembership?.org.ownerId === session.user.id;
    const isManager = userMembership?.role === "MANAGER";

    if (!isOwner && !isManager) {
      return NextResponse.json(
        { error: "No tienes permiso para cambiar roles" },
        { status: 403 }
      );
    }

    // Verificar que el membership a modificar existe
    const targetMembership = await prisma.membership.findUnique({
      where: { id: membershipId },
      include: {
        org: {
          select: { ownerId: true },
        },
      },
    });

    if (!targetMembership) {
      return NextResponse.json(
        { error: "Miembro no encontrado" },
        { status: 404 }
      );
    }

    // No se puede modificar al propietario
    if (targetMembership.userId === targetMembership.org.ownerId) {
      return NextResponse.json(
        { error: "No se puede modificar el rol del propietario" },
        { status: 403 }
      );
    }

    // Un manager no puede modificar su propio rol
    if (isManager && targetMembership.userId === session.user.id) {
      return NextResponse.json(
        { error: "No puedes cambiar tu propio rol" },
        { status: 403 }
      );
    }

    // Actualizar el rol
    const updatedMembership = await prisma.membership.update({
      where: { id: membershipId },
      data: { role },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    return NextResponse.json(updatedMembership);
  } catch (error) {
    console.error("Error al cambiar rol:", error);
    return NextResponse.json(
      { error: "Error al cambiar el rol del miembro" },
      { status: 500 }
    );
  }
}

// DELETE: Remover un miembro del equipo
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ orgId: string; membershipId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { orgId, membershipId } = await params;

    // Verificar que el usuario tiene permiso (owner o manager)
    const userMembership = await prisma.membership.findUnique({
      where: {
        userId_orgId: {
          userId: session.user.id,
          orgId: orgId,
        },
      },
      include: {
        org: {
          select: { ownerId: true },
        },
      },
    });

    const isOwner = userMembership?.org.ownerId === session.user.id;
    const isManager = userMembership?.role === "MANAGER";

    if (!isOwner && !isManager) {
      return NextResponse.json(
        { error: "No tienes permiso para remover miembros" },
        { status: 403 }
      );
    }

    // Verificar que el membership a eliminar existe
    const targetMembership = await prisma.membership.findUnique({
      where: { id: membershipId },
      include: {
        org: {
          select: { ownerId: true },
        },
      },
    });

    if (!targetMembership) {
      return NextResponse.json(
        { error: "Miembro no encontrado" },
        { status: 404 }
      );
    }

    // No se puede remover al propietario
    if (targetMembership.userId === targetMembership.org.ownerId) {
      return NextResponse.json(
        { error: "No se puede remover al propietario" },
        { status: 403 }
      );
    }

    // Un manager no puede removerse a sí mismo
    if (isManager && targetMembership.userId === session.user.id) {
      return NextResponse.json(
        { error: "No puedes removerte a ti mismo" },
        { status: 403 }
      );
    }

    // Eliminar el membership
    await prisma.membership.delete({
      where: { id: membershipId },
    });

    return NextResponse.json(
      { message: "Miembro removido exitosamente" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error al remover miembro:", error);
    return NextResponse.json(
      { error: "Error al remover el miembro" },
      { status: 500 }
    );
  }
}
