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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  QrCode,
  Plus,
  Trash2,
  Eye,
  Loader2,
  Printer,
  Download,
} from "lucide-react";
import { CreateTableModal } from "@/components/tables/create-table-modal";
import { QRCodeCanvas } from "@/components/qr/qr-code-canvas";
import Image from "next/image";

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
  const [selectedTableForQR, setSelectedTableForQR] = useState<Table | null>(
    null
  );
  const [qrImageUrl, setQrImageUrl] = useState<string>("");
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

  // Función para ver QR de una mesa
  const handleViewQR = async (table: Table) => {
    setSelectedTableForQR(table);
    const qrUrl = `/api/qr/${table.id}`;
    setQrImageUrl(qrUrl);
  };

  // Función para imprimir QR codes
  const handlePrintQRs = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Códigos QR - ${currentOrg?.name}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .qr-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; }
            .qr-item { text-align: center; border: 1px solid #ddd; padding: 20px; border-radius: 8px; }
            .qr-item h3 { margin-bottom: 10px; }
            .qr-item img { width: 200px; height: 200px; margin: 10px 0; }
            .qr-item p { font-size: 12px; color: #666; }
            @media print { 
              body { margin: 0; }
              .qr-item { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <h1>Códigos QR - ${currentOrg?.name}</h1>
          <div class="qr-grid">
            ${tables
              .map(
                (table) => `
              <div class="qr-item">
                <h3>Mesa ${table.number}</h3>
                <img src="/api/qr/${table.id}" alt="QR Mesa ${table.number}" />
                <p>Escanea para hacer tu pedido</p>
                <p style="font-size: 10px;">URL: ${window.location.origin}/table/${table.qrToken}</p>
              </div>
            `
              )
              .join("")}
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  };

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Gestión de Mesas</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Restaurante: <span className="font-medium">{currentOrg.name}</span>
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={handlePrintQRs}
            disabled={tables.length === 0}
            className="w-full sm:w-auto"
          >
            <Printer className="h-4 w-4 mr-2" />
            Imprimir QRs
          </Button>
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nueva Mesa
          </Button>
        </div>
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
                  <QRCodeCanvas
                    url={`${window.location.origin}/table/${table.qrToken}`}
                    size={120}
                    className="rounded"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleViewQR(table)}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Ver QR
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const link = document.createElement("a");
                      link.href = `/api/qr/${table.id}`;
                      link.download = `mesa-${table.number}-qr.png`;
                      link.click();
                    }}
                  >
                    <Download className="h-3 w-3" />
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

      {/* Modal para ver QR en grande */}
      <Dialog
        open={selectedTableForQR !== null}
        onOpenChange={() => setSelectedTableForQR(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Código QR - Mesa {selectedTableForQR?.number}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-4">
            {qrImageUrl && (
              <Image
                src={qrImageUrl}
                alt={`QR Mesa ${selectedTableForQR?.number}`}
                width={300}
                height={300}
                className="rounded-lg border"
              />
            )}
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Los clientes pueden escanear este código para hacer pedidos
              </p>
              <p className="text-xs font-mono bg-gray-100 p-2 rounded">
                {window.location.origin}/table/{selectedTableForQR?.qrToken}
              </p>
            </div>
            <div className="flex gap-2 w-full">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  if (selectedTableForQR) {
                    const link = document.createElement("a");
                    link.href = `/api/qr/${selectedTableForQR.id}`;
                    link.download = `mesa-${selectedTableForQR.number}-qr.png`;
                    link.click();
                  }
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Descargar
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  if (selectedTableForQR) {
                    const printWindow = window.open("", "_blank");
                    if (printWindow) {
                      printWindow.document.write(`
                        <!DOCTYPE html>
                        <html>
                          <head>
                            <title>QR Mesa ${selectedTableForQR.number}</title>
                            <style>
                              body { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; font-family: Arial, sans-serif; }
                              h1 { margin-bottom: 20px; }
                              img { border: 1px solid #ddd; border-radius: 8px; }
                              p { margin-top: 20px; text-align: center; }
                            </style>
                          </head>
                          <body>
                            <h1>Mesa ${selectedTableForQR.number}</h1>
                            <img src="/api/qr/${selectedTableForQR.id}" width="300" height="300" />
                            <p>Escanea para hacer tu pedido</p>
                          </body>
                        </html>
                      `);
                      printWindow.document.close();
                      printWindow.print();
                    }
                  }
                }}
              >
                <Printer className="h-4 w-4 mr-2" />
                Imprimir
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
