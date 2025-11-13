"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { DishesPanel } from "@/components/menu/dishes-panel";
import { CreateCategoryModal } from "@/components/menu/create-category-modal";
import { CreateMenuItemModal } from "@/components/menu/create-menu-item-modal";
import { EditCategoryModal } from "@/components/menu/edit-category-modal";
import { EditMenuItemModal } from "@/components/menu/edit-menu-item-modal";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { Button } from "@/components/ui/button";
import { useOrganization } from "@/contexts/organization-context";
import { CategoryPanel } from "@/components/menu/category-panel";

interface Category {
  id: string;
  name: string;
  position: number;
  itemCount: number;
  imageUrl?: string;
}

interface MenuItem {
  id: string;
  name: string;
  price: number;
  active: boolean;
  description?: string;
  imageUrl?: string;
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

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");

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

  useEffect(() => {
    fetchCategories();
    fetchMenuItems();
  }, [fetchCategories, fetchMenuItems]);

  useEffect(() => {
    if (
      selectedCategoryId !== "all" &&
      !categories.some((category) => category.id === selectedCategoryId)
    ) {
      setSelectedCategoryId("all");
    }
  }, [categories, selectedCategoryId]);

  const handleDataRefresh = useCallback(() => {
    fetchCategories();
    fetchMenuItems();
  }, [fetchCategories, fetchMenuItems]);

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
            ? "El producto ahora es visible en el men� p�blico."
            : "El producto se ha ocultado del men� p�blico.",
        });
      } else {
        toast.error("Error al actualizar el producto", {
          description: "No se pudo cambiar el estado del producto.",
        });
      }
    } catch (error) {
      console.error("Error toggling item active state:", error);
      toast.error("Error de conexi�n", {
        description: "No se pudo conectar con el servidor.",
      });
    }
  };

  const handleDeleteMenuItem = (itemId: string) => {
    const item = menuItems.find((menuItem) => menuItem.id === itemId);
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
          description: "El producto ha sido eliminado exitosamente del men�.",
        });
      } else {
        toast.error("Error al eliminar producto", {
          description: "No se pudo eliminar el producto.",
        });
      }
    } catch (error) {
      console.error("Error deleting menu item:", error);
      toast.error("Error de conexi�n", {
        description: "No se pudo conectar con el servidor.",
      });
    } finally {
      setIsDeletingMenuItem(false);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _handleEditCategory = (categoryId: string) => {
    const category = categories.find((item) => item.id === categoryId);
    if (!category) return;

    setSelectedCategory(category);
    setShowEditCategory(true);
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleDeleteCategory = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId);
    if (!category) return;

    if (category.itemCount > 0) {
      toast.error("No se puede eliminar la categor�a", {
        description:
          "Esta categor�a contiene productos. Primero mueve o elimina todos los productos.",
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
        if (selectedCategoryId === categoryToDelete.id) {
          setSelectedCategoryId("all");
        }
        handleDataRefresh();
        setShowDeleteCategory(false);
        setCategoryToDelete(null);
        toast.success("Categor�a eliminada", {
          description: "La categor�a ha sido eliminada exitosamente.",
        });
      } else {
        toast.error("Error al eliminar categor�a", {
          description: "No se pudo eliminar la categor�a.",
        });
      }
    } catch (error) {
      console.error("Error deleting category:", error);
      toast.error("Error de conexi�n", {
        description: "No se pudo conectar con el servidor.",
      });
    } finally {
      setIsDeletingCategory(false);
    }
  };

  const categoriesForPanel = useMemo(
    () => [
      {
        id: "all",
        name: "All Dishes",
        itemCount: menuItems.length,
      },
      ...categories
        .slice()
        .sort((a, b) => a.position - b.position)
        .map((category) => ({
          id: category.id,
          name: category.name,
          itemCount: category.itemCount,
        })),
    ],
    [categories, menuItems.length]
  );

  if (status === "loading" || orgLoading) {
    return (
      <div className="flex min-h-[calc(100vh-200px)] items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin" />
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
      <div className="flex min-h-[calc(100vh-200px)] items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">
            No tienes acceso a ning�n restaurante
          </h2>
          <p className="mt-2 text-gray-600">
            Necesitas crear un restaurante o ser invitado a uno para gestionar
            el men�.
          </p>
          <Button className="mt-4" asChild>
            <a href="/dashboard">Volver al Dashboard</a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Main Content Area */}
      <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
        {/* Category Panel - Hidden on mobile/tablet, shown in modal or as separate view */}
        <div className="hidden lg:block lg:w-80 border-r border-border bg-card overflow-y-auto">
          <CategoryPanel
            categories={categoriesForPanel}
            selectedCategoryId={selectedCategoryId}
            onSelectCategory={setSelectedCategoryId}
            onAddCategory={() => setShowCreateCategory(true)}
            onEditCategory={(categoryId) => {
              const category = categories.find((c) => c.id === categoryId);
              if (category) {
                setSelectedCategory(category);
                setShowEditCategory(true);
              }
            }}
            onDeleteCategory={(categoryId) => {
              const category = categories.find((c) => c.id === categoryId);
              if (category && category.itemCount === 0) {
                setCategoryToDelete(category);
                setShowDeleteCategory(true);
              }
            }}
            isLoading={isLoadingCategories}
          />
        </div>

        {/* Dishes Panel - Main content */}
        <div className="flex-1 overflow-y-auto">
          <DishesPanel
            categories={categoriesForPanel}
            menuItems={menuItems}
            selectedCategoryId={selectedCategoryId}
            onCategoryChange={setSelectedCategoryId}
            onCreateMenuItem={() => setShowCreateMenuItem(true)}
            onEditMenuItem={(menuItem) => {
              // Convert MenuItemData to MenuItem for compatibility
              const convertedItem: MenuItem = {
                ...menuItem,
                imageUrl: menuItem.imageUrl || undefined,
              };
              handleEditMenuItem(convertedItem);
            }}
            onToggleMenuItem={handleToggleItemActive}
            onDeleteMenuItem={handleDeleteMenuItem}
            onCreateCategory={() => setShowCreateCategory(true)}
            onEditCategory={(categoryId) => {
              const category = categories.find((c) => c.id === categoryId);
              if (category) {
                setSelectedCategory(category);
                setShowEditCategory(true);
              }
            }}
            onDeleteCategory={(categoryId) => {
              const category = categories.find((c) => c.id === categoryId);
              if (category && category.itemCount === 0) {
                setCategoryToDelete(category);
                setShowDeleteCategory(true);
              }
            }}
            isLoadingCategories={isLoadingCategories}
            isLoadingMenuItems={isLoadingItems}
          />
        </div>
      </div>

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

      <DeleteConfirmDialog
        open={showDeleteCategory}
        onOpenChange={setShowDeleteCategory}
        onConfirm={confirmDeleteCategory}
        title="Eliminar Categor�a"
        description="Esta acci�n eliminar� permanentemente la categor�a de tu men�."
        itemName={categoryToDelete?.name}
        isLoading={isDeletingCategory}
      />

      <DeleteConfirmDialog
        open={showDeleteMenuItem}
        onOpenChange={setShowDeleteMenuItem}
        onConfirm={confirmDeleteMenuItem}
        title="Eliminar Producto"
        description="Esta acci�n eliminar� permanentemente el producto de tu men�."
        itemName={menuItemToDelete?.name}
        isLoading={isDeletingMenuItem}
      />
    </div>
  );
}
