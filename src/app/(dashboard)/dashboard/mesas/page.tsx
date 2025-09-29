"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useOrganization } from "@/contexts/organization-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QrCode, Plus, Edit, Trash2, Eye, Loader2 } from "lucide-react";
import { CreateTableModal } from "@/components/tables/create-table-modal";

interface Table {
  id: string;
  number: number;
  qrToken: string;
  orgId: string;
}

export default function MesasPage() {
  const { data: session, status } = useSession();
  const { currentOrg, isLoading: orgLoading } = useOrganization();
  const [tables, setTables] = useState<Table[]>([]);
  const [isLoadingTables, setIsLoadingTables] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const router = useRouter();

  // Función para cargar mesas
  const fetchTables = useCallback(async () => {
    if (!currentOrg) return;

    setIsLoadingTables(true);
    try {
      const response = await fetch(
        `/api/organizations/${currentOrg.id}/tables`
      );
      if (response.ok) {
        const data = await response.json();
        setTables(data.tables || []);
      }
    } catch (error) {
      console.error("Error fetching tables:", error);
    } finally {
      setIsLoadingTables(false);
    }
  }, [currentOrg]);

  // Cargar mesas cuando cambie la organización actual
  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  // Verificar autenticación
  if (status === "loading" || orgLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)] p-4">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  if (!currentOrg) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)] p-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">
            No tienes acceso a ningún restaurante
          </h2>
          <p className="mt-2 text-gray-600">
            Necesitas crear un restaurante o ser invitado a uno para gestionar
            mesas.
          </p>
          <Button className="mt-4" asChild>
            <a href="/dashboard">Volver al Dashboard</a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Mesas</h1>
          <p className="text-muted-foreground">
            Restaurante: <span className="font-medium">{currentOrg.name}</span>
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Mesa
        </Button>
      </div>

      {tables.length === 0 ? (
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">No hay mesas configuradas</CardTitle>
            <CardDescription>
              Agrega tu primera mesa para comenzar a recibir pedidos via QR
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Crear Primera Mesa
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {tables.map((table: Table) => (
            <Card key={table.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Mesa {table.number}</CardTitle>
                  <Badge variant="outline" className="text-xs">
                    QR Activo
                  </Badge>
                </div>
                <CardDescription className="text-xs">
                  Token: {table.qrToken.slice(0, 8)}...
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-center p-4 bg-gray-50 rounded-lg">
                  <QrCode className="h-12 w-12 text-gray-400" />
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Eye className="h-3 w-3 mr-1" />
                    Ver QR
                  </Button>
                  <Button variant="outline" size="sm">
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>

                <div className="text-xs text-muted-foreground text-center">
                  URL: /mesa/{table.qrToken}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Estadísticas rápidas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Mesas</CardTitle>
            <QrCode className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tables.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Códigos QR Activos
            </CardTitle>
            <div className="h-4 w-4 bg-green-500 rounded-full"></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {tables.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Última Mesa</CardTitle>
            <Badge variant="outline">
              #{tables[tables.length - 1]?.number || "N/A"}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tables[tables.length - 1]?.number || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estado</CardTitle>
            <div className="h-4 w-4 bg-blue-500 rounded-full"></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">Activo</div>
          </CardContent>
        </Card>
      </div>

      <CreateTableModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onTableCreated={fetchTables}
      />
    </div>
  );
}
