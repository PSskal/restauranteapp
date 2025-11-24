"use client";

import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { MoreVertical, UserCog, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

type MemberRole = "OWNER" | "MANAGER" | "CASHIER" | "WAITER" | "KITCHEN";

interface MemberActionsProps {
  orgId: string;
  membership: {
    id: string;
    userId: string;
    userName: string;
    userEmail: string;
    role: MemberRole;
  };
}

export function MemberActions({ orgId, membership }: MemberActionsProps) {
  const router = useRouter();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleRoleChange = async (newRole: MemberRole) => {
    if (newRole === membership.role) return;

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/organizations/${orgId}/memberships/${membership.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: newRole }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al cambiar rol");
      }

      router.refresh();
    } catch (error) {
      console.error("Error al cambiar rol:", error);
      alert(error instanceof Error ? error.message : "Error al cambiar el rol");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveMember = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/organizations/${orgId}/memberships/${membership.id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al remover miembro");
      }

      setShowDeleteDialog(false);
      router.refresh();
    } catch (error) {
      console.error("Error al remover miembro:", error);
      alert(
        error instanceof Error ? error.message : "Error al remover el miembro"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" disabled={isLoading}>
            <MoreVertical className="h-4 w-4" />
            <span className="sr-only">Acciones</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Gestionar miembro</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
            Cambiar rol
          </DropdownMenuLabel>
          <DropdownMenuItem
            onClick={() => handleRoleChange("MANAGER")}
            disabled={membership.role === "MANAGER"}
          >
            <UserCog className="h-4 w-4 mr-2" />
            Gerente
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleRoleChange("CASHIER")}
            disabled={membership.role === "CASHIER"}
          >
            <UserCog className="h-4 w-4 mr-2" />
            Cajero
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleRoleChange("WAITER")}
            disabled={membership.role === "WAITER"}
          >
            <UserCog className="h-4 w-4 mr-2" />
            Mesero
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleRoleChange("KITCHEN")}
            disabled={membership.role === "KITCHEN"}
          >
            <UserCog className="h-4 w-4 mr-2" />
            Cocina
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setShowDeleteDialog(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Remover del equipo
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Vas a remover a{" "}
              <span className="font-medium text-foreground">
                {membership.userName}
              </span>{" "}
              ({membership.userEmail}) del equipo. Esta acción no se puede
              deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              disabled={isLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading ? "Removiendo..." : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
