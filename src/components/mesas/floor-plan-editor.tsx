"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragEndEvent,
  useDraggable,
  useDroppable,
  DragOverlay,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Grid3x3,
  Users,
  ZoomIn,
  ZoomOut,
  Save,
  RotateCw,
  Square,
  Circle,
  RectangleHorizontal,
  Clock,
  DollarSign,
  ShoppingCart,
} from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from "@/components/ui/context-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface TablePosition {
  id: string;
  number: number;
  x: number;
  y: number;
  width: number;
  height: number;
  shape: "square" | "circle" | "rectangle";
  rotation: number;
  isEnabled: boolean;
  // Información de estado en tiempo real
  status?: "available" | "occupied" | "reserved" | "billing";
  currentOrder?: {
    id: string;
    items: number;
    total: number;
    startTime: Date;
    waiter?: string;
  };
}

interface FloorPlanEditorProps {
  tables: Array<{
    id: string;
    number: number;
    isEnabled: boolean;
  }>;
  onSave?: (positions: TablePosition[]) => void;
}

function DraggableTable({
  table,
  isDragging,
  onResize,
  onRotate,
  onChangeShape,
  isSelected,
  onSelect,
  isEditMode,
  onOpenDialog,
}: {
  table: TablePosition;
  isDragging?: boolean;
  onResize?: (tableId: string, newWidth: number, newHeight: number) => void;
  onRotate?: (tableId: string, newRotation: number) => void;
  onChangeShape?: (
    tableId: string,
    newShape: "square" | "circle" | "rectangle"
  ) => void;
  isSelected?: boolean;
  onSelect?: (tableId: string) => void;
  isEditMode?: boolean;
  onOpenDialog?: (table: TablePosition) => void;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: table.id,
    disabled: !isEditMode, // Solo drag en modo edición
  });

  const resizeStartRef = useRef<{
    width: number;
    height: number;
    startX: number;
    startY: number;
  } | null>(null);

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  const shapeClass =
    table.shape === "circle"
      ? "rounded-full"
      : table.shape === "rectangle"
        ? "rounded-lg"
        : "rounded-xl";

  // Determinar colores según estado
  const getStatusColors = () => {
    switch (table.status) {
      case "occupied":
        return "from-red-500 to-red-600 hover:from-red-600 hover:to-red-700";
      case "billing":
        return "from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700";
      case "reserved":
        return "from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700";
      default:
        return "from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800";
    }
  };

  const statusColors = getStatusColors();

  // Calcular tiempo transcurrido
  const getElapsedTime = () => {
    if (!table.currentOrder?.startTime) return null;
    const now = new Date();
    const diff =
      now.getTime() - new Date(table.currentOrder.startTime).getTime();
    const minutes = Math.floor(diff / 60000);
    return minutes;
  };

  const elapsedTime = getElapsedTime();

  const handleResizeStart = (e: React.MouseEvent, corner: string) => {
    e.stopPropagation();
    resizeStartRef.current = {
      width: table.width,
      height: table.height,
      startX: e.clientX,
      startY: e.clientY,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!resizeStartRef.current) return;

      const deltaX = moveEvent.clientX - resizeStartRef.current.startX;
      const deltaY = moveEvent.clientY - resizeStartRef.current.startY;

      let newWidth = resizeStartRef.current.width;
      let newHeight = resizeStartRef.current.height;

      if (corner.includes("e")) newWidth += deltaX;
      if (corner.includes("w")) newWidth -= deltaX;
      if (corner.includes("s")) newHeight += deltaY;
      if (corner.includes("n")) newHeight -= deltaY;

      // Min y max size
      newWidth = Math.max(80, Math.min(300, newWidth));
      newHeight = Math.max(80, Math.min(300, newHeight));

      if (onResize) {
        onResize(table.id, newWidth, newHeight);
      }
    };

    const handleMouseUp = () => {
      resizeStartRef.current = null;
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger disabled={!isEditMode}>
        <div
          ref={setNodeRef}
          style={style}
          {...(isEditMode ? listeners : {})}
          {...(isEditMode ? attributes : {})}
          className={`absolute ${isEditMode ? "cursor-move" : "cursor-pointer"} touch-none ${shapeClass} ${isSelected ? "ring-2 ring-slate-400 ring-offset-2" : ""}`}
          data-table-id={table.id}
          onClick={() => {
            if (!isEditMode && table.currentOrder) {
              onOpenDialog?.(table);
            }
          }}
        >
          <div
            className={`${shapeClass} bg-gradient-to-br ${statusColors} shadow-lg hover:shadow-xl transition-all flex items-center justify-center text-white font-bold border-4 border-white relative overflow-hidden`}
            style={{
              width: `${table.width}px`,
              height: `${table.height}px`,
              transform: `rotate(${table.rotation}deg)`,
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              if (isEditMode) {
                onSelect?.(table.id);
              }
            }}
          >
            <div className="text-center pointer-events-none z-10">
              <div className="text-2xl">{table.number}</div>
              <Users className="h-4 w-4 mx-auto mt-1 opacity-80" />

              {/* Información rápida si está ocupada */}
              {table.currentOrder && (
                <div className="text-xs mt-1 space-y-0.5">
                  <div className="flex items-center justify-center gap-1">
                    <ShoppingCart className="h-3 w-3" />
                    <span>{table.currentOrder.items}</span>
                  </div>
                  <div className="flex items-center justify-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    <span>{table.currentOrder.total.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Indicador de tiempo */}
            {elapsedTime !== null && (
              <div className="absolute top-1 right-1 bg-black/30 backdrop-blur-sm rounded-full px-1.5 py-0.5 text-[10px] flex items-center gap-1">
                <Clock className="h-2.5 w-2.5" />
                {elapsedTime}m
              </div>
            )}

            {/* Resize Handles */}
            {isSelected && !isDragging && isEditMode && (
              <>
                {/* Corner handles */}
                <div
                  onMouseDown={(e) => handleResizeStart(e, "se")}
                  className="absolute -bottom-1 -right-1 w-3 h-3 bg-white border-2 border-slate-500 rounded-full cursor-se-resize z-10"
                  style={{ transform: `rotate(-${table.rotation}deg)` }}
                />
                <div
                  onMouseDown={(e) => handleResizeStart(e, "sw")}
                  className="absolute -bottom-1 -left-1 w-3 h-3 bg-white border-2 border-slate-500 rounded-full cursor-sw-resize z-10"
                  style={{ transform: `rotate(-${table.rotation}deg)` }}
                />
                <div
                  onMouseDown={(e) => handleResizeStart(e, "ne")}
                  className="absolute -top-1 -right-1 w-3 h-3 bg-white border-2 border-slate-500 rounded-full cursor-ne-resize z-10"
                  style={{ transform: `rotate(-${table.rotation}deg)` }}
                />
                <div
                  onMouseDown={(e) => handleResizeStart(e, "nw")}
                  className="absolute -top-1 -left-1 w-3 h-3 bg-white border-2 border-slate-500 rounded-full cursor-nw-resize z-10"
                  style={{ transform: `rotate(-${table.rotation}deg)` }}
                />
              </>
            )}
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuItem
          onClick={() => onRotate?.(table.id, (table.rotation + 45) % 360)}
        >
          <RotateCw className="h-4 w-4 mr-2" />
          Rotar 45°
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() => onRotate?.(table.id, (table.rotation + 90) % 360)}
        >
          <RotateCw className="h-4 w-4 mr-2" />
          Rotar 90°
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onRotate?.(table.id, 0)}>
          <RotateCw className="h-4 w-4 mr-2" />
          Resetear rotación
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <Square className="h-4 w-4 mr-2" />
            Cambiar forma
          </ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuItem
              onClick={() => onChangeShape?.(table.id, "square")}
            >
              <Square className="h-4 w-4 mr-2" />
              Cuadrada
            </ContextMenuItem>
            <ContextMenuItem
              onClick={() => onChangeShape?.(table.id, "circle")}
            >
              <Circle className="h-4 w-4 mr-2" />
              Redonda
            </ContextMenuItem>
            <ContextMenuItem
              onClick={() => onChangeShape?.(table.id, "rectangle")}
            >
              <RectangleHorizontal className="h-4 w-4 mr-2" />
              Rectangular
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
      </ContextMenuContent>
    </ContextMenu>
  );
}

export function FloorPlanEditor({ tables, onSave }: FloorPlanEditorProps) {
  const router = useRouter();
  const [selectedTable, setSelectedTable] = useState<TablePosition | null>(
    null
  );
  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // Inicializar posiciones (grid automático si no tienen posición)
  const [tablePositions, setTablePositions] = useState<TablePosition[]>(() => {
    return tables.map((table, index) => ({
      id: table.id,
      number: table.number,
      x: (index % 6) * 150 + 50,
      y: Math.floor(index / 6) * 150 + 50,
      width: 120,
      height: 120,
      shape: "square" as const,
      rotation: 0,
      isEnabled: table.isEnabled,
      // Demo: Algunas mesas con pedidos activos
      status:
        index % 3 === 0
          ? "occupied"
          : index % 5 === 0
            ? "billing"
            : "available",
      currentOrder:
        index % 3 === 0
          ? {
              id: `ORDER-${Math.random().toString(36).substr(2, 9)}`,
              items: Math.floor(Math.random() * 8) + 1,
              total: Math.random() * 150 + 30,
              startTime: new Date(Date.now() - Math.random() * 3600000),
              waiter: `Mesero ${Math.floor(Math.random() * 5) + 1}`,
            }
          : undefined,
    }));
  });

  const { setNodeRef } = useDroppable({
    id: "floor-plan-droppable",
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event;

    setTablePositions((prev) =>
      prev.map((table) =>
        table.id === active.id
          ? {
              ...table,
              x: table.x + delta.x,
              y: table.y + delta.y,
            }
          : table
      )
    );

    setActiveId(null);
  };

  const handleResize = (
    tableId: string,
    newWidth: number,
    newHeight: number
  ) => {
    setTablePositions((prev) =>
      prev.map((table) =>
        table.id === tableId
          ? { ...table, width: newWidth, height: newHeight }
          : table
      )
    );
  };

  const handleRotate = (tableId: string, newRotation: number) => {
    setTablePositions((prev) =>
      prev.map((table) =>
        table.id === tableId ? { ...table, rotation: newRotation } : table
      )
    );
    setSelectedTableId(tableId);
  };

  const handleChangeShape = (
    tableId: string,
    newShape: "square" | "circle" | "rectangle"
  ) => {
    setTablePositions((prev) =>
      prev.map((table) =>
        table.id === tableId ? { ...table, shape: newShape } : table
      )
    );
    setSelectedTableId(tableId);
  };

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.1, 2));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.1, 0.5));

  const handleSave = () => {
    if (onSave) {
      onSave(tablePositions);
    }
  };

  const activeTable = activeId
    ? tablePositions.find((t) => t.id === activeId)
    : null;

  // Click fuera para deseleccionar
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-table-id]")) {
        setSelectedTableId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <Card className="p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant={isEditMode ? "default" : "outline"}
              size="sm"
              onClick={() => setIsEditMode(!isEditMode)}
            >
              {isEditMode ? "Modo Visualización" : "Modo Edición"}
            </Button>

            {isEditMode && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowGrid(!showGrid)}
                >
                  <Grid3x3 className="h-4 w-4 mr-2" />
                  {showGrid ? "Ocultar Grid" : "Mostrar Grid"}
                </Button>

                <div className="flex items-center gap-2 border rounded-lg px-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleZoomOut}
                    disabled={zoom <= 0.5}
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium min-w-[60px] text-center">
                    {Math.round(zoom * 100)}%
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleZoomIn}
                    disabled={zoom >= 2}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-sm">
              {tables.length} mesas
            </Badge>
            {isEditMode && (
              <Button onClick={handleSave} size="sm">
                <Save className="h-4 w-4 mr-2" />
                Guardar Layout
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Floor Plan Canvas */}
      <Card className="relative overflow-hidden bg-slate-50">
        <DndContext
          onDragEnd={handleDragEnd}
          onDragStart={(e) => setActiveId(e.active.id as string)}
        >
          <div
            ref={setNodeRef}
            className="relative min-h-[600px] w-full"
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: "top left",
              backgroundImage: showGrid
                ? "radial-gradient(circle, #94a3b8 2px, transparent 2px)"
                : undefined,
              backgroundSize: showGrid ? "30px 30px" : undefined,
            }}
          >
            {/* Render Tables */}
            {tablePositions.map((table) => (
              <div
                key={table.id}
                style={{
                  position: "absolute",
                  left: `${table.x}px`,
                  top: `${table.y}px`,
                }}
              >
                <DraggableTable
                  table={table}
                  isDragging={activeId === table.id}
                  isSelected={selectedTableId === table.id}
                  onResize={handleResize}
                  onRotate={handleRotate}
                  onChangeShape={handleChangeShape}
                  onSelect={setSelectedTableId}
                  isEditMode={isEditMode}
                  onOpenDialog={setSelectedTable}
                />
              </div>
            ))}
          </div>

          {/* Drag Overlay */}
          <DragOverlay>
            {activeTable ? (
              <div className="opacity-80">
                <DraggableTable table={activeTable} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </Card>

      {/* Legend */}
      <Card className="p-4">
        <div className="flex items-center gap-6 text-sm text-muted-foreground flex-wrap">
          {isEditMode ? (
            <>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-white border-2 border-slate-500 rounded-full"></div>
                <span>Doble click para redimensionar</span>
              </div>
              <div className="flex items-center gap-2">
                <RotateCw className="h-4 w-4" />
                <span>Click derecho para rotar y cambiar forma</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-slate-600 rounded-lg"></div>
                <span>Disponible</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-red-600 rounded-lg"></div>
                <span>Ocupada</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-amber-600 rounded-lg"></div>
                <span>En cuenta</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg"></div>
                <span>Reservada</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  💡 Click en mesa ocupada para ver detalles del pedido
                </span>
              </div>
            </>
          )}
        </div>
      </Card>

      {/* Dialog para mostrar detalles del pedido */}
      <Dialog
        open={!!selectedTable}
        onOpenChange={(open) => !open && setSelectedTable(null)}
      >
        <DialogContent className="sm:max-w-md">
          {selectedTable && (
            <>
              <DialogHeader>
                <DialogTitle>Mesa {selectedTable.number}</DialogTitle>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Estado:</span>
                  <Badge
                    variant={
                      selectedTable.status === "occupied"
                        ? "destructive"
                        : selectedTable.status === "billing"
                          ? "default"
                          : selectedTable.status === "reserved"
                            ? "default"
                            : "secondary"
                    }
                  >
                    {selectedTable.status === "occupied"
                      ? "Ocupada"
                      : selectedTable.status === "billing"
                        ? "En cuenta"
                        : selectedTable.status === "reserved"
                          ? "Reservada"
                          : "Disponible"}
                  </Badge>
                </div>

                {selectedTable.currentOrder && (
                  <>
                    <div className="space-y-3 text-sm border-t pt-3">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Pedido #:</span>
                        <span className="font-mono">
                          {selectedTable.currentOrder.id.slice(0, 8)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Items:</span>
                        <span className="font-semibold">
                          {selectedTable.currentOrder.items}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Total:</span>
                        <span className="font-semibold text-lg">
                          S/ {selectedTable.currentOrder.total.toFixed(2)}
                        </span>
                      </div>

                      {selectedTable.currentOrder.waiter && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Mesero:</span>
                          <span>{selectedTable.currentOrder.waiter}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Tiempo:</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {Math.floor(
                            (Date.now() -
                              selectedTable.currentOrder.startTime.getTime()) /
                              60000
                          )}{" "}
                          minutos
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          if (selectedTable.currentOrder) {
                            router.push(
                              `/dashboard/orders/${selectedTable.currentOrder.id}`
                            );
                            setSelectedTable(null);
                          }
                        }}
                      >
                        Ver Pedido
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          if (selectedTable.currentOrder) {
                            router.push(
                              `/dashboard/pos?orderId=${selectedTable.currentOrder.id}&tableId=${selectedTable.id}`
                            );
                            setSelectedTable(null);
                          }
                        }}
                      >
                        Ir a Cuenta
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
