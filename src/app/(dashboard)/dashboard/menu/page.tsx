"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useOrganization } from "@/contexts/organization-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Loader2, ChefHat, Tag, TrendingUp, Package } from "lucide-react";
import { toast } from "sonner";
import { CreateCategoryModal } from "@/components/menu/create-category-modal";
import { CreateMenuItemModal } from "@/components/menu/create-menu-item-modal";
import { EditCategoryModal } from "@/components/menu/edit-category-modal";
import { EditMenuItemModal } from "@/components/menu/edit-menu-item-modal";
import { EmptyState } from "@/components/menu/empty-state";
import { MenuItemCard } from "@/components/menu/menu-item-card";
import { CategoryCard } from "@/components/menu/category-card";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";

interface Category {
  id: string;
  name: string;
  position: number;
  itemCount: number;
}

interface MenuItem {
  id: string;
  name: string;
  price: number;
  active: boolean;
  description?: string;
  category: {
    id: string;
    name: string;
  };
}

export default function MenuPage() {
  const { status } = useSession();
  const { currentOrg, isLoading: orgLoading } = useOrganization();
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [isLoadingItems, setIsLoadingItems] = useState(false);

  // Modal states
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [showCreateMenuItem, setShowCreateMenuItem] = useState(false);
  const [showEditCategory, setShowEditCategory] = useState(false);
  const [showEditMenuItem, setShowEditMenuItem] = useState(false);

  // Edit modal data
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null
  );
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(
    null
  );

  // Delete confirmation states
  const [showDeleteCategory, setShowDeleteCategory] = useState(false);
  const [showDeleteMenuItem, setShowDeleteMenuItem] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(
    null
  );
  const [menuItemToDelete, setMenuItemToDelete] = useState<MenuItem | null>(
    null
  );
  const [isDeletingCategory, setIsDeletingCategory] = useState(false);
  const [isDeletingMenuItem, setIsDeletingMenuItem] = useState(false);

  const router = useRouter();

  // Función para cargar categorías
  const fetchCategories = useCallback(async () => {
    if (!currentOrg) return;

    setIsLoadingCategories(true);
    try {
      const response = await fetch(
        `/api/organizations/${currentOrg.id}/categories`
      );
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    } finally {
      setIsLoadingCategories(false);
    }
  }, [currentOrg]);

  // Función para cargar items del menú
  const fetchMenuItems = useCallback(async () => {
    if (!currentOrg) return;

    setIsLoadingItems(true);
    try {
      const response = await fetch(
        `/api/organizations/${currentOrg.id}/menu-items`
      );
      if (response.ok) {
        const data = await response.json();
        setMenuItems(data.menuItems || []);
      }
    } catch (error) {
      console.error("Error fetching menu items:", error);
    } finally {
      setIsLoadingItems(false);
    }
  }, [currentOrg]);

  // Cargar datos cuando cambie la organización
  useEffect(() => {
    fetchCategories();
    fetchMenuItems();
  }, [fetchCategories, fetchMenuItems]);

  // Refresh data after successful operations
  const handleDataRefresh = useCallback(() => {
    fetchCategories();
    fetchMenuItems();
  }, [fetchCategories, fetchMenuItems]);

  // Handle menu item actions
  const handleEditMenuItem = (item: MenuItem) => {
    setSelectedMenuItem(item);
    setShowEditMenuItem(true);
  };

  const handleToggleItemActive = async (itemId: string, active: boolean) => {
    if (!currentOrg) return;

    try {
      const response = await fetch(
        `/api/organizations/${currentOrg.id}/menu-items/${itemId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ active }),
        }
      );

      if (response.ok) {
        handleDataRefresh();
        toast.success(active ? "Producto activado" : "Producto desactivado", {
          description: active
            ? "El producto ahora es visible en el menú público."
            : "El producto se ha ocultado del menú público.",
        });
      } else {
        toast.error("Error al actualizar el producto", {
          description: "No se pudo cambiar el estado del producto.",
        });
      }
    } catch (error) {
      console.error("Error toggling item active state:", error);
      toast.error("Error de conexión", {
        description: "No se pudo conectar con el servidor.",
      });
    }
  };

  const handleDeleteMenuItem = (itemId: string) => {
    const item = menuItems.find((item) => item.id === itemId);
    if (item) {
      setMenuItemToDelete(item);
      setShowDeleteMenuItem(true);
    }
  };

  const confirmDeleteMenuItem = async () => {
    if (!currentOrg || !menuItemToDelete) return;

    setIsDeletingMenuItem(true);
    try {
      const response = await fetch(
        `/api/organizations/${currentOrg.id}/menu-items/${menuItemToDelete.id}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        handleDataRefresh();
        setShowDeleteMenuItem(false);
        setMenuItemToDelete(null);
        toast.success("Producto eliminado", {
          description: "El producto ha sido eliminado exitosamente del menú.",
        });
      } else {
        toast.error("Error al eliminar producto", {
          description: "No se pudo eliminar el producto.",
        });
      }
    } catch (error) {
      console.error("Error deleting menu item:", error);
      toast.error("Error de conexión", {
        description: "No se pudo conectar con el servidor.",
      });
    } finally {
      setIsDeletingMenuItem(false);
    }
  };

  // Handle category actions
  const handleEditCategory = (category: Category) => {
    setSelectedCategory(category);
    setShowEditCategory(true);
  };

  const handleDeleteCategory = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId);
    if (!category) return;

    if (category.itemCount > 0) {
      toast.error("No se puede eliminar la categoría", {
        description:
          "Esta categoría contiene productos. Primero mueve o elimina todos los productos.",
      });
      return;
    }

    setCategoryToDelete(category);
    setShowDeleteCategory(true);
  };

  const confirmDeleteCategory = async () => {
    if (!currentOrg || !categoryToDelete) return;

    setIsDeletingCategory(true);
    try {
      const response = await fetch(
        `/api/organizations/${currentOrg.id}/categories/${categoryToDelete.id}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        handleDataRefresh();
        setShowDeleteCategory(false);
        setCategoryToDelete(null);
        toast.success("Categoría eliminada", {
          description: "La categoría ha sido eliminada exitosamente.",
        });
      } else {
        toast.error("Error al eliminar categoría", {
          description: "No se pudo eliminar la categoría.",
        });
      }
    } catch (error) {
      console.error("Error deleting category:", error);
      toast.error("Error de conexión", {
        description: "No se pudo conectar con el servidor.",
      });
    } finally {
      setIsDeletingCategory(false);
    }
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
            el menú.
          </p>
          <Button className="mt-4" asChild>
            <a href="/dashboard">Volver al Dashboard</a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b pb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Gestión del Menú
            </h1>
            <p className="text-muted-foreground mt-1">
              Administra las categorías y productos de{" "}
              <span className="font-medium">{currentOrg.name}</span>
            </p>
          </div>

          {/* Quick Stats */}
          <div className="flex gap-6 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {categories.length}
              </div>
              <div className="text-muted-foreground">Categorías</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-600">
                {menuItems.length}
              </div>
              <div className="text-muted-foreground">Productos</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="menu-items" className="space-y-6">
        <div className="flex items-center justify-between">
          <TabsList className="grid w-fit grid-cols-2">
            <TabsTrigger value="menu-items" className="flex items-center gap-2">
              <ChefHat className="h-4 w-4" />
              Productos ({menuItems.length})
            </TabsTrigger>
            <TabsTrigger value="categories" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Categorías ({categories.length})
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Products Tab */}
        <TabsContent value="menu-items" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Productos del Menú</h2>
              <p className="text-muted-foreground text-sm">
                Gestiona los productos disponibles en tu menú
              </p>
            </div>
            <Button
              onClick={() => setShowCreateMenuItem(true)}
              disabled={categories.length === 0}
              size="lg"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Producto
            </Button>
          </div>

          {isLoadingItems ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : menuItems.length === 0 ? (
            <EmptyState
              type="menu-items"
              hasCategories={categories.length > 0}
              onCreateCategory={() => setShowCreateCategory(true)}
              onCreateMenuItem={() => setShowCreateMenuItem(true)}
            />
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {menuItems.map((item) => (
                <MenuItemCard
                  key={item.id}
                  item={item}
                  onEdit={handleEditMenuItem}
                  onToggleActive={handleToggleItemActive}
                  onDelete={handleDeleteMenuItem}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Categorías del Menú</h2>
              <p className="text-muted-foreground text-sm">
                Organiza tu menú en categorías para una mejor navegación
              </p>
            </div>
            <Button onClick={() => setShowCreateCategory(true)} size="lg">
              <Plus className="h-4 w-4 mr-2" />
              Nueva Categoría
            </Button>
          </div>

          {isLoadingCategories ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : categories.length === 0 ? (
            <EmptyState
              type="categories"
              onCreateCategory={() => setShowCreateCategory(true)}
            />
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {categories.map((category) => (
                <CategoryCard
                  key={category.id}
                  category={category}
                  onEdit={handleEditCategory}
                  onDelete={handleDeleteCategory}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Enhanced Statistics */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold mb-4">Estadísticas del Menú</h3>
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-600 text-sm font-medium">
                    Categorías
                  </p>
                  <p className="text-2xl font-bold text-blue-900">
                    {categories.length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-200 rounded-lg flex items-center justify-center">
                  <Tag className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-emerald-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-emerald-600 text-sm font-medium">
                    Total Productos
                  </p>
                  <p className="text-2xl font-bold text-emerald-900">
                    {menuItems.length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-emerald-200 rounded-lg flex items-center justify-center">
                  <ChefHat className="h-6 w-6 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-green-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-600 text-sm font-medium">
                    Productos Activos
                  </p>
                  <p className="text-2xl font-bold text-green-900">
                    {menuItems.filter((item) => item.active).length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-200 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-br from-gray-50 to-gray-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">
                    Productos Inactivos
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {menuItems.filter((item) => !item.active).length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                  <Package className="h-6 w-6 text-gray-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modals */}
      <CreateCategoryModal
        open={showCreateCategory}
        onOpenChange={setShowCreateCategory}
        onSuccess={handleDataRefresh}
        organizationId={currentOrg.id}
      />

      <CreateMenuItemModal
        open={showCreateMenuItem}
        onOpenChange={setShowCreateMenuItem}
        onSuccess={handleDataRefresh}
        organizationId={currentOrg.id}
        categories={categories}
      />

      <EditCategoryModal
        open={showEditCategory}
        onOpenChange={setShowEditCategory}
        onSuccess={handleDataRefresh}
        organizationId={currentOrg.id}
        category={selectedCategory}
      />

      <EditMenuItemModal
        open={showEditMenuItem}
        onOpenChange={setShowEditMenuItem}
        onSuccess={handleDataRefresh}
        organizationId={currentOrg.id}
        categories={categories}
        menuItem={selectedMenuItem}
      />

      {/* Delete Confirmation Dialogs */}
      <DeleteConfirmDialog
        open={showDeleteCategory}
        onOpenChange={setShowDeleteCategory}
        onConfirm={confirmDeleteCategory}
        title="Eliminar Categoría"
        description="Esta acción eliminará permanentemente la categoría de tu menú."
        itemName={categoryToDelete?.name}
        isLoading={isDeletingCategory}
      />

      <DeleteConfirmDialog
        open={showDeleteMenuItem}
        onOpenChange={setShowDeleteMenuItem}
        onConfirm={confirmDeleteMenuItem}
        title="Eliminar Producto"
        description="Esta acción eliminará permanentemente el producto de tu menú."
        itemName={menuItemToDelete?.name}
        isLoading={isDeletingMenuItem}
      />
    </div>
  );
}
