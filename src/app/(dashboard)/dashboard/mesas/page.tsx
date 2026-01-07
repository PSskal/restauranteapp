"use client";

import Link from "next/link";
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
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  Trash2,
  Eye,
  Loader2,
  Printer,
  Download,
  List,
  LayoutGrid,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CreateTableModal } from "@/components/tables/create-table-modal";
import { QRCodeCanvas } from "@/components/qr/qr-code-canvas";
import { FloorPlanEditor } from "@/components/mesas/floor-plan-editor";
import { toast } from "sonner";

interface Table {
  id: string;
  number: number;
  qrToken: string;
  orgId: string;
  isEnabled: boolean;
}

export default function MesasPage() {
  const { status } = useSession();
  const { currentOrg, isLoading: orgLoading } = useOrganization();
  const [tables, setTables] = useState<Table[]>([]);
  const [isLoadingTables, setIsLoadingTables] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTableForQR, setSelectedTableForQR] = useState<Table | null>(
    null
  );
  const [updatingTableId, setUpdatingTableId] = useState<string | null>(null);
  const router = useRouter();
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

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
  };

  const handleToggleTable = useCallback(
    async (table: Table, nextValue: boolean) => {
      if (!currentOrg) {
        return;
      }

      setUpdatingTableId(table.id);
      try {
        const response = await fetch(
          `/api/organizations/${currentOrg.id}/tables`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              tableId: table.id,
              isEnabled: nextValue,
            }),
          }
        );

        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(payload?.error || "No pudimos actualizar la mesa");
        }

        setTables((prev) =>
          prev.map((entry) =>
            entry.id === table.id ? { ...entry, isEnabled: nextValue } : entry
          )
        );

        toast.success(
          nextValue
            ? `Mesa ${table.number} habilitada`
            : `Mesa ${table.number} deshabilitada`
        );
      } catch (error) {
        console.error("Error toggling table state:", error);
        const message =
          error instanceof Error
            ? error.message
            : "Error inesperado al actualizar la mesa";
        toast.error(message);
      } finally {
        setUpdatingTableId(null);
      }
    },
    [currentOrg]
  );

  // Función para imprimir QR codes
  const handlePrintQRs = () => {
    // Fetch each QR image as a blob and convert to data URLs, then open print window with inlined images.
    const blobToDataURL = (blob: Blob) =>
      new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

    (async () => {
      const items = await Promise.all(
        tables.map(async (table) => {
          try {
            const res = await fetch(`/api/qr/${table.id}`);
            if (!res.ok) throw new Error("fetch failed");
            const blob = await res.blob();
            const dataUrl = await blobToDataURL(blob);
            return { table, dataUrl };
          } catch {
            // fallback to endpoint URL if blob fetch fails
            return { table, dataUrl: `/api/qr/${table.id}` };
          }
        })
      );

      const printWindow = window.open("", "_blank");
      if (!printWindow) return;

      const printContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Códigos QR - ${currentOrg?.name}</title>
            <meta name="viewport" content="width=device-width,initial-scale=1" />
            <style>
              body { font-family: Arial, sans-serif; margin: 12px; }
              .qr-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 18px; }
              .qr-item { text-align: center; border: 1px solid #e5e7eb; padding: 12px; border-radius: 8px; }
              .qr-item h3 { margin-bottom: 8px; font-size: 16px; }
              .qr-item img { width: 200px; height: 200px; object-fit: contain; }
              .qr-item p { font-size: 12px; color: #4b5563; margin: 6px 0 0; }
              @media print { body { margin: 0; } .qr-item { page-break-inside: avoid; } }
            </style>
          </head>
          <body>
            <h1 style="font-size:18px; margin-bottom:12px;">Códigos QR - ${currentOrg?.name}</h1>
            <div class="qr-grid">
              ${items
                .map(
                  ({ table, dataUrl }) => `
                    <div class="qr-item">
                      <h3>Mesa ${table.number}</h3>
                      <img src="${dataUrl}" alt="QR Mesa ${table.number}" />
                      <p>Escanea para hacer tu pedido</p>
                      <p style="font-size:10px; color:#6b7280;">URL: ${
                        baseUrl
                          ? `${baseUrl}/table/${table.qrToken}`
                          : `/table/${table.qrToken}`
                      }</p>
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
      setTimeout(() => printWindow.print(), 400);
    })();
  };

  // Verificar autenticación
  if (status === "loading" || orgLoading || isLoadingTables) {
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
            <Link href="/dashboard">Volver al Dashboard</Link>
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
        <Tabs defaultValue="list" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
            <TabsTrigger value="list" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              Vista de Lista
            </TabsTrigger>
            <TabsTrigger value="floor-plan" className="flex items-center gap-2">
              <LayoutGrid className="h-4 w-4" />
              Plano del Local
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-0">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {tables.map((table: Table) => (
                <Card
                  key={table.id}
                  className="hover:shadow-md transition-shadow"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        Mesa {table.number}
                      </CardTitle>
                      <Badge
                        variant={table.isEnabled ? "default" : "outline"}
                        className={`text-xs ${
                          table.isEnabled
                            ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                            : "text-muted-foreground"
                        }`}
                      >
                        {table.isEnabled ? "Habilitada" : "Deshabilitada"}
                      </Badge>
                    </div>
                    <CardDescription className="text-xs">
                      Token: {table.qrToken.slice(0, 8)}...
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-center p-4 bg-gray-50 rounded-lg">
                      <QRCodeCanvas
                        url={`${baseUrl}/table/${table.qrToken}`}
                        size={120}
                        className="rounded"
                      />
                    </div>

                    <div className="flex items-center justify-between rounded-md border px-3 py-2">
                      <div>
                        <p className="text-sm font-medium">Habilitar pedidos</p>
                        <p className="text-xs text-muted-foreground">
                          Activa la mesa solo cuando haya comensales presentes.
                        </p>
                      </div>
                      <Switch
                        checked={table.isEnabled}
                        onCheckedChange={(value) =>
                          handleToggleTable(table, value)
                        }
                        disabled={updatingTableId === table.id}
                      />
                    </div>

                    {updatingTableId === table.id ? (
                      <p className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Guardando cambios...
                      </p>
                    ) : null}

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
                      URL:{" "}
                      {baseUrl
                        ? `${baseUrl}/table/${table.qrToken}`
                        : `/table/${table.qrToken}`}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="floor-plan" className="space-y-0">
            <FloorPlanEditor
              tables={tables}
              onSave={(positions) => {
                console.log("Saving floor plan positions:", positions);
                toast.success("Layout guardado exitosamente");
              }}
            />
          </TabsContent>
        </Tabs>
      )}

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
            {selectedTableForQR && (
              <div className="flex items-center justify-center p-4 bg-gray-50 rounded-lg">
                <QRCodeCanvas
                  url={`${typeof window !== "undefined" ? window.location.origin : ""}/table/${selectedTableForQR.qrToken}`}
                  size={260}
                  className="rounded"
                />
              </div>
            )}
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Los clientes pueden escanear este código para hacer pedidos
              </p>
              <p className="text-xs font-mono bg-gray-100 p-2 rounded">
                {typeof window !== "undefined"
                  ? `${window.location.origin}/table/${selectedTableForQR?.qrToken}`
                  : `/table/${selectedTableForQR?.qrToken}`}
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
                  if (!selectedTableForQR) return;

                  // Try to find a canvas inside the dialog and use its data URL for printing
                  const dialog = document.querySelector("[role='dialog']");
                  let dataUrl: string | null = null;
                  if (dialog) {
                    const canvas = dialog.querySelector(
                      "canvas"
                    ) as HTMLCanvasElement | null;
                    if (canvas) {
                      try {
                        dataUrl = canvas.toDataURL("image/png");
                      } catch {
                        dataUrl = null;
                      }
                    }
                  }

                  const doPrint = (imgSrc: string) => {
                    const printWindow = window.open("", "_blank");
                    if (!printWindow) return;
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
                          <img src="${imgSrc}" width="300" height="300" />
                          <p>Escanea para hacer tu pedido</p>
                        </body>
                      </html>
                    `);
                    printWindow.document.close();
                    printWindow.print();
                  };

                  if (dataUrl) {
                    doPrint(dataUrl);
                  } else {
                    // fallback to server endpoint
                    doPrint(`/api/qr/${selectedTableForQR.id}`);
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
