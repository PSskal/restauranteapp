"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Loader2,
  Minus,
  Plus,
  RefreshCcw,
  ShoppingCart,
  Trash2,
  Printer,
  UtensilsCrossed,
  Wallet,
} from "lucide-react";
import Image from "next/image";

import { useOrganization } from "@/contexts/organization-context";
import { PlanGate } from "@/components/plans/plan-gate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const formatCurrency = (cents: number) => "S/ " + (cents / 100).toFixed(2);

type Category = {
  id: string;
  name: string;
  position: number;
  itemCount: number;
};

type PosMenuItem = {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  imageUrl: string | null;
  category: {
    id: string;
    name: string;
  };
};

type CartItem = {
  id: string;
  name: string;
  priceCents: number;
  quantity: number;
};

type TableSummary = {
  id: string;
  number: number;
  isEnabled: boolean;
};

export function PosTerminal() {
  const { currentOrg, isLoading: isOrgLoading } = useOrganization();
  const currentOrgId = currentOrg?.id ?? null;

  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<PosMenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderNotes, setOrderNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMobileCart, setShowMobileCart] = useState(false);
  const [tablesLoading, setTablesLoading] = useState(false);
  const [tables, setTables] = useState<TableSummary[]>([]);
  const [tablesError, setTablesError] = useState<string | null>(null);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [isTableDialogOpen, setIsTableDialogOpen] = useState(false);

  const loadCatalog = useCallback(async () => {
    if (!currentOrgId) {
      return;
    }

    setCatalogLoading(true);
    setCatalogError(null);

    try {
      const [categoriesResponse, menuResponse] = await Promise.all([
        fetch(`/api/organizations/${currentOrgId}/categories`),
        fetch(`/api/organizations/${currentOrgId}/menu-items?activeOnly=true`),
      ]);

      if (!categoriesResponse.ok) {
        const data = await categoriesResponse.json().catch(() => null);
        throw new Error(
          data?.error || "No pudimos cargar las categorias del menu"
        );
      }

      if (!menuResponse.ok) {
        const data = await menuResponse.json().catch(() => null);
        throw new Error(data?.error || "No pudimos cargar el menu activo");
      }

      const categoriesJson = (await categoriesResponse.json()) as {
        categories: Category[];
      };
      const menuJson = (await menuResponse.json()) as {
        menuItems: Array<
          PosMenuItem & {
            price: number;
            active: boolean;
          }
        >;
      };

      setCategories(categoriesJson.categories);
      setMenuItems(
        menuJson.menuItems.map((item) => ({
          id: item.id,
          name: item.name,
          description: item.description ?? null,
          priceCents: item.priceCents,
          imageUrl: item.imageUrl ?? null,
          category: item.category,
        }))
      );
      setSelectedCategory("all");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Error cargando el menu";
      console.error("Error loading POS catalog:", error);
      setCatalogError(message);
      toast.error(message);
    } finally {
      setCatalogLoading(false);
    }
  }, [currentOrgId]);

  const loadTables = useCallback(async () => {
    if (!currentOrgId) {
      return;
    }

    setTablesLoading(true);
    setTablesError(null);

    try {
      const response = await fetch(`/api/organizations/${currentOrgId}/tables`);

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(
          data?.error || "No pudimos cargar las mesas del restaurante"
        );
      }

      const data = (await response.json()) as {
        tables: Array<{ id: string; number: number; isEnabled: boolean }>;
      };

      const enabledTables = (data.tables ?? []).filter(
        (table) => table.isEnabled
      );
      setTables(enabledTables);
      setSelectedTableId((prev) =>
        prev && enabledTables.some((table) => table.id === prev) ? prev : null
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Error inesperado al cargar las mesas";
      console.error("Error loading tables:", error);
      setTablesError(message);
      toast.error(message);
    } finally {
      setTablesLoading(false);
    }
  }, [currentOrgId]);

  useEffect(() => {
    if (!currentOrgId) {
      setTables([]);
      setSelectedTableId(null);
      return;
    }

    loadCatalog();
    loadTables();
  }, [currentOrgId, loadCatalog, loadTables]);

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    return menuItems.filter((item) => {
      const matchesCategory =
        selectedCategory === "all" || item.category.id === selectedCategory;
      const matchesTerm =
        term.length === 0 ||
        item.name.toLowerCase().includes(term) ||
        item.category.name.toLowerCase().includes(term);
      return matchesCategory && matchesTerm;
    });
  }, [menuItems, search, selectedCategory]);

  const selectedTable = useMemo(
    () => tables.find((table) => table.id === selectedTableId) ?? null,
    [selectedTableId, tables]
  );

  const cartCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );

  const cartTotalC = useMemo(
    () => cart.reduce((sum, item) => sum + item.priceCents * item.quantity, 0),
    [cart]
  );

  const handleAddToCart = useCallback((item: PosMenuItem) => {
    setCart((prev) => {
      const existing = prev.find((entry) => entry.id === item.id);
      if (existing) {
        return prev.map((entry) =>
          entry.id === item.id
            ? { ...entry, quantity: entry.quantity + 1 }
            : entry
        );
      }
      return [
        ...prev,
        {
          id: item.id,
          name: item.name,
          priceCents: item.priceCents,
          quantity: 1,
        },
      ];
    });
  }, []);

  const decreaseQuantity = useCallback((itemId: string) => {
    setCart((prev) =>
      prev
        .map((entry) =>
          entry.id === itemId
            ? { ...entry, quantity: Math.max(entry.quantity - 1, 0) }
            : entry
        )
        .filter((entry) => entry.quantity > 0)
    );
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setOrderNotes("");
  }, []);

  const handleSubmitOrder = useCallback(async () => {
    if (!currentOrgId) {
      toast.error("Selecciona un restaurante para crear pedidos");
      return;
    }

    if (cart.length === 0) {
      toast.error("Agrega productos al pedido antes de confirmar");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(
        `/api/organizations/${currentOrgId}/orders`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            items: cart.map((entry) => ({
              menuItemId: entry.id,
              quantity: entry.quantity,
            })),
            notes: orderNotes.trim() || undefined,
            tableId: selectedTableId || undefined,
          }),
        }
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const message = data?.error || "No pudimos registrar el pedido";
        throw new Error(message);
      }

      const orderNumber = data?.order?.number;
      toast.success(
        orderNumber
          ? `Pedido #${orderNumber} creado correctamente`
          : "Pedido creado correctamente"
      );
      clearCart();
      loadCatalog();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Error inesperado al confirmar el pedido";
      console.error("Error creating POS order:", error);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [cart, clearCart, currentOrgId, loadCatalog, orderNotes, selectedTableId]);

  const handlePrintPrecheck = useCallback(() => {
    if (cart.length === 0) {
      toast.error("Agrega productos para imprimir la precuenta");
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("No se pudo abrir la ventana de impresión");
      return;
    }

    const subtotal = cartTotalC;
    const total = subtotal;
    const selectedTable = tables.find((t) => t.id === selectedTableId);

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Precuenta - ${currentOrg?.name || "Restaurante"}</title>
          <meta charset="UTF-8" />
          <style>
            @media print {
              @page { margin: 0; size: 80mm auto; }
              body { margin: 0; padding: 0; }
            }
            body {
              font-family: 'Courier New', monospace;
              font-size: 12px;
              line-height: 1.4;
              max-width: 80mm;
              margin: 0 auto;
              padding: 10mm;
            }
            .header {
              text-align: center;
              margin-bottom: 15px;
              border-bottom: 2px dashed #000;
              padding-bottom: 10px;
            }
            .header h1 {
              margin: 0 0 5px 0;
              font-size: 18px;
              font-weight: bold;
            }
            .header p {
              margin: 3px 0;
              font-size: 11px;
            }
            .info {
              margin-bottom: 15px;
              padding-bottom: 10px;
              border-bottom: 1px dashed #000;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              margin: 3px 0;
            }
            .items {
              margin-bottom: 15px;
              border-bottom: 1px dashed #000;
              padding-bottom: 10px;
            }
            .item {
              margin: 8px 0;
            }
            .item-header {
              display: flex;
              justify-content: space-between;
              font-weight: bold;
            }
            .totals {
              margin-top: 10px;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              margin: 5px 0;
            }
            .total-row.grand {
              font-size: 14px;
              font-weight: bold;
              border-top: 2px solid #000;
              padding-top: 8px;
              margin-top: 8px;
            }
            .footer {
              text-align: center;
              margin-top: 15px;
              padding-top: 10px;
              border-top: 2px dashed #000;
              font-size: 11px;
            }
            .footer p {
              margin: 3px 0;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${currentOrg?.name || "RESTAURANTE"}</h1>
            <p>PRECUENTA</p>
            <p>No válido como comprobante de pago</p>
            <p>${new Date().toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" })}</p>
          </div>

          <div class="info">
            ${selectedTable ? `<div class="info-row"><span><strong>Mesa:</strong> ${selectedTable.number}</span></div>` : ""}
            ${orderNotes ? `<div class="info-row"><span><strong>Nota:</strong> ${orderNotes}</span></div>` : ""}
          </div>

          <div class="items">
            <div style="font-weight: bold; margin-bottom: 8px;">DETALLE:</div>
            ${cart
              .map(
                (item) => `
              <div class="item">
                <div class="item-header">
                  <span>${item.quantity}x ${item.name}</span>
                  <span>S/ ${((item.priceCents * item.quantity) / 100).toFixed(2)}</span>
                </div>
              </div>
            `
              )
              .join("")}
          </div>

          <div class="totals">
            <div class="total-row grand">
              <span>TOTAL:</span>
              <span>S/ ${(total / 100).toFixed(2)}</span>
            </div>
          </div>

          <div class="footer">
            <p>¡Gracias por su preferencia!</p>
            <p>Solicite su comprobante de pago</p>
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                setTimeout(function() {
                  window.close();
                }, 100);
              }, 250);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    toast.success("Abriendo ventana de impresión...");
  }, [cart, cartTotalC, currentOrg, orderNotes, selectedTableId, tables]);

  if (isOrgLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cargando restaurante activo...</CardTitle>
          <CardDescription>
            Espera un momento mientras obtenemos tu organizacion actual.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Esto puede tardar unos segundos.
        </CardContent>
      </Card>
    );
  }

  if (!currentOrgId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Selecciona un restaurante</CardTitle>
          <CardDescription>
            Usa el selector del sidebar para elegir en que restaurante operar.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (currentOrg?.plan !== "PREMIUM") {
    return (
      <PlanGate
        title="Terminal POS Premium"
        description="Registra pedidos, controla cantidades y asigna mesas desde la terminal POS activando el plan Premium."
      />
    );
  }

  return (
    <>
      <Dialog open={isTableDialogOpen} onOpenChange={setIsTableDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Asignar mesa al pedido</DialogTitle>
            <DialogDescription>
              Selecciona una mesa disponible para vincular este pedido POS.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {tablesLoading ? (
              <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Cargando mesas...
              </div>
            ) : tables.length === 0 ? (
              <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                No hay mesas habilitadas. Activa una mesa desde la sección Mesas
                antes de continuar.
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {tables.map((table) => {
                  const isSelected = table.id === selectedTableId;
                  return (
                    <Button
                      key={table.id}
                      type="button"
                      variant={isSelected ? "default" : "outline"}
                      className="justify-start"
                      onClick={() => {
                        setSelectedTableId(table.id);
                        setIsTableDialogOpen(false);
                      }}
                    >
                      <UtensilsCrossed className="mr-2 h-4 w-4" />
                      Mesa {table.number}
                    </Button>
                  );
                })}
              </div>
            )}
            {selectedTableId ? (
              <Button
                type="button"
                variant="ghost"
                className="w-full justify-center text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => {
                  setSelectedTableId(null);
                  setIsTableDialogOpen(false);
                }}
              >
                Quitar asignacion
              </Button>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid gap-6 lg:grid-cols-[1fr_384px]">
        <Card className="flex flex-col h-[700px]">
          <CardHeader className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Punto de venta</CardTitle>
                <CardDescription>
                  {catalogLoading
                    ? "Cargando menu activo..."
                    : catalogError
                      ? catalogError
                      : `Gestiona pedidos para ${currentOrg?.name || "tu restaurante"}`}
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={loadCatalog}
                disabled={catalogLoading}
                className="gap-2"
              >
                <RefreshCcw className="h-4 w-4" />
                Refrescar
              </Button>
            </div>
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <Input
                placeholder="Buscar por nombre o categoria"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="md:max-w-sm"
                disabled={catalogLoading}
              />
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant={selectedCategory === "all" ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setSelectedCategory("all")}
                >
                  Todo
                </Badge>
                {categories.map((category) => (
                  <Badge
                    key={category.id}
                    variant={
                      selectedCategory === category.id ? "default" : "outline"
                    }
                    className="cursor-pointer"
                    onClick={() => setSelectedCategory(category.id)}
                  >
                    {category.name}
                  </Badge>
                ))}
              </div>
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="flex-1 overflow-hidden p-0">
            <ScrollArea className="h-[600px]">
              <div className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3">
                {catalogLoading ? (
                  <div className="col-span-full text-center text-sm text-muted-foreground">
                    Cargando menu...
                  </div>
                ) : filteredItems.length === 0 ? (
                  <div className="col-span-full text-center text-sm text-muted-foreground">
                    No hay productos que coincidan con la busqueda.
                  </div>
                ) : (
                  filteredItems.map((item) => {
                    const cartItem = cart.find((c) => c.id === item.id);
                    const isInCart = cartItem && cartItem.quantity > 0;

                    return (
                      <Card
                        key={item.id}
                        className={`p-4 bg-white hover:bg-gray-50 transition-all duration-200 border-2 ${
                          isInCart ? "border-gray-600" : "border-gray-200"
                        }`}
                      >
                        <div className="flex gap-4">
                          <Image
                            src={item.imageUrl || "/placeholder.svg"}
                            alt={item.name}
                            width={80}
                            height={80}
                            className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm mb-1 truncate">
                              {item.name}
                            </h3>
                            <p className="text-xs text-gray-500 mb-2 line-clamp-2">
                              {item.description ?? "Sin descripcion"}
                            </p>
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center justify-between">
                                <span className="font-bold">
                                  {formatCurrency(item.priceCents)}
                                </span>
                              </div>
                              <div className="flex justify-end">
                                {(() => {
                                  const cartItem = cart.find(
                                    (c) => c.id === item.id
                                  );
                                  const quantity = cartItem?.quantity || 0;

                                  if (quantity === 0) {
                                    return (
                                      <Button
                                        size="sm"
                                        className="h-8 px-3 text-xs"
                                        onClick={() => handleAddToCart(item)}
                                      >
                                        <Plus className="h-3 w-3 mr-1" />
                                        Agregar
                                      </Button>
                                    );
                                  }

                                  return (
                                    <div className="flex items-center gap-2 bg-gray-100 rounded-full p-1">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 hover:bg-white rounded-full"
                                        onClick={() =>
                                          decreaseQuantity(item.id)
                                        }
                                      >
                                        <Minus className="h-3 w-3" />
                                      </Button>
                                      <span className="w-8 text-center text-sm font-semibold">
                                        {quantity}
                                      </span>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 hover:bg-white rounded-full"
                                        onClick={() => handleAddToCart(item)}
                                      >
                                        <Plus className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>
                          </div>
                        </div>
                      </Card>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Desktop Cart */}
        <div className="hidden lg:flex bg-white border border-gray-200 rounded-lg flex-col h-[700px]">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Pedido POS</h2>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    loadTables();
                    setIsTableDialogOpen(true);
                  }}
                  disabled={isSubmitting}
                  className="gap-2 border-gray-300 text-gray-600 hover:bg-gray-100"
                >
                  {tablesLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <UtensilsCrossed className="h-4 w-4" />
                  )}
                  {selectedTable
                    ? `Mesa ${selectedTable.number}`
                    : "Asignar mesa"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearCart}
                  disabled={cart.length === 0 || isSubmitting}
                  className="gap-2 border-gray-300 text-gray-600 hover:bg-gray-100"
                >
                  <Trash2 className="h-4 w-4" />
                  Vaciar
                </Button>
              </div>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">
                Orden #{Math.floor(Math.random() * 100)}
              </span>
              <span className="font-semibold">
                {currentOrg?.name || "Restaurante"}
              </span>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              {selectedTable
                ? `Mesa asignada: ${selectedTable.number}`
                : "Sin mesa asignada"}
            </div>
            {tablesError ? (
              <p className="mt-2 text-xs text-red-500">{tablesError}</p>
            ) : null}
          </div>

          <div className="flex-1 overflow-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Items del pedido</h3>
              <span className="text-sm text-gray-500">{cart.length}</span>
            </div>

            <div className="space-y-4 mb-6">
              {cart.length === 0 ? (
                <p className="rounded-md border border-dashed p-4 text-sm text-gray-500 text-center">
                  Todavia no agregaste productos. Toca un item del menu para
                  sumar al carrito.
                </p>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between items-start"
                  >
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="font-semibold text-sm">{item.name}</h4>
                        <span className="font-semibold text-sm ml-2">
                          {formatCurrency(item.priceCents * item.quantity)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">
                          {item.quantity}x item
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <>
                <div className="border-t pt-4 mb-6">
                  <h3 className="font-semibold mb-3">Resumen de pago</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Subtotal</span>
                      <span className="font-semibold">
                        {formatCurrency(cartTotalC)}
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 border-t font-bold">
                      <span>Total a pagar</span>
                      <span>{formatCurrency(cartTotalC)}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 mb-6">
                  <label
                    className="text-sm font-semibold"
                    htmlFor="order-notes"
                  >
                    Notas del pedido
                  </label>
                  <Textarea
                    id="order-notes"
                    placeholder="Ej: sin sal, entregar en barra, etc."
                    value={orderNotes}
                    onChange={(event) => setOrderNotes(event.target.value)}
                    disabled={isSubmitting}
                    rows={3}
                    className="text-sm"
                  />
                </div>
              </>
            )}
          </div>

          {cart.length > 0 && (
            <div className="p-6 border-t">
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 bg-transparent"
                  onClick={handlePrintPrecheck}
                  disabled={isSubmitting}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Imprimir Precuenta
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSubmitOrder}
                  disabled={isSubmitting}
                >
                  <Wallet className="h-4 w-4 mr-2" />
                  Confirmar pedido
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Cart Button */}
        <div className="lg:hidden">
          <Button
            className="fixed bottom-4 right-4 z-40 rounded-full shadow-lg"
            size="lg"
            onClick={() => setShowMobileCart(true)}
          >
            <ShoppingCart className="h-5 w-5 mr-2" />
            {cartCount > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center ml-1">
                {cartCount}
              </span>
            )}
          </Button>
        </div>

        {/* Mobile Cart Modal */}
        {showMobileCart && (
          <div
            className="lg:hidden fixed inset-0 z-50 bg-black/50"
            onClick={() => setShowMobileCart(false)}
          >
            <div
              className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[85vh] overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-6" />

                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold">Pedido POS</h2>
                  <span className="text-sm text-gray-500">
                    Orden #{Math.floor(Math.random() * 100)}
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                  <span className="text-sm text-gray-500">
                    {selectedTable
                      ? `Mesa asignada: ${selectedTable.number}`
                      : "Sin mesa asignada"}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      loadTables();
                      setIsTableDialogOpen(true);
                    }}
                    disabled={isSubmitting}
                    className="gap-2 border-gray-300 text-gray-600 hover:bg-gray-100 bg-transparent"
                  >
                    {tablesLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <UtensilsCrossed className="h-4 w-4" />
                    )}
                    {selectedTable ? "Cambiar mesa" : "Asignar mesa"}
                  </Button>
                </div>

                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-semibold">Items del pedido</h3>
                  <span className="text-sm text-gray-500">{cart.length}</span>
                </div>

                {tablesError ? (
                  <p className="mb-4 text-xs text-red-500">{tablesError}</p>
                ) : null}

                <div className="space-y-4 mb-6">
                  {cart.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">
                      No hay productos en el carrito
                    </p>
                  ) : (
                    cart.map((item) => (
                      <div
                        key={item.id}
                        className="flex justify-between items-start"
                      >
                        <div className="flex-1">
                          <div className="flex justify-between items-start mb-1">
                            <h4 className="font-semibold text-sm">
                              {item.name}
                            </h4>
                            <span className="font-semibold text-sm ml-2">
                              {formatCurrency(item.priceCents * item.quantity)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-500">
                              {item.quantity}x item
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {cart.length > 0 && (
                  <>
                    <div className="border-t pt-4 mb-6">
                      <h3 className="font-semibold mb-3">Resumen de pago</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Subtotal</span>
                          <span className="font-semibold">
                            {formatCurrency(cartTotalC)}
                          </span>
                        </div>
                        <div className="flex justify-between pt-2 border-t font-bold">
                          <span>Total a pagar</span>
                          <span>{formatCurrency(cartTotalC)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 mb-6">
                      <label
                        className="text-sm font-semibold"
                        htmlFor="mobile-order-notes"
                      >
                        Notas del pedido
                      </label>
                      <Textarea
                        id="mobile-order-notes"
                        placeholder="Ej: sin sal, entregar en barra, etc."
                        value={orderNotes}
                        onChange={(event) => setOrderNotes(event.target.value)}
                        disabled={isSubmitting}
                        rows={3}
                        className="text-sm"
                      />
                    </div>

                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        className="flex-1 bg-transparent"
                        onClick={handlePrintPrecheck}
                        disabled={isSubmitting}
                      >
                        <Printer className="h-4 w-4 mr-2" />
                        Imprimir Precuenta
                      </Button>
                      <Button
                        className="flex-1"
                        onClick={() => {
                          handleSubmitOrder();
                          setShowMobileCart(false);
                        }}
                        disabled={isSubmitting}
                      >
                        <Wallet className="h-4 w-4 mr-2" />
                        Confirmar
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
