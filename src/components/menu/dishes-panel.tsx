"use client";

import { useMemo, useState } from "react";

import Image from "next/image";

import { EmptyState } from "@/components/menu/empty-state";
import { CategoryPanel } from "@/components/menu/category-panel";
import { MenuItemSkeleton } from "@/components/menu/menu-item-skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  Edit,
  Eye,
  EyeOff,
  Grid3x3,
  ImageIcon,
  List,
  MoreVertical,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";

interface CategoryPanelItem {
  id: string;
  name: string;
  itemCount: number;
}

interface MenuItemCategory {
  id: string;
  name: string;
}

interface MenuItemData {
  id: string;
  name: string;
  price: number;
  active: boolean;
  description?: string;
  imageUrl?: string | null;
  category: MenuItemCategory;
}

interface DishesPanelProps {
  categories: CategoryPanelItem[];
  menuItems: MenuItemData[];
  selectedCategoryId: string;
  onCategoryChange: (categoryId: string) => void;
  onCreateMenuItem: () => void;
  onEditMenuItem: (menuItem: MenuItemData) => void;
  onToggleMenuItem: (menuItemId: string, active: boolean) => void;
  onDeleteMenuItem: (menuItemId: string) => void;
  onCreateCategory?: () => void;
  onEditCategory?: (categoryId: string) => void;
  onDeleteCategory?: (categoryId: string) => void;
  isLoadingCategories?: boolean;
  isLoadingMenuItems?: boolean;
}

export function DishesPanel({
  categories,
  menuItems,
  selectedCategoryId,
  onCategoryChange,
  onCreateMenuItem,
  onEditMenuItem,
  onToggleMenuItem,
  onDeleteMenuItem,
  onCreateCategory,
  onEditCategory,
  onDeleteCategory,
  isLoadingCategories,
  isLoadingMenuItems,
}: DishesPanelProps) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedDishes, setSelectedDishes] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredMenuItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return menuItems.filter((item) => {
      const matchesCategory =
        selectedCategoryId === "all" || item.category.id === selectedCategoryId;
      const matchesQuery =
        query.length === 0 || item.name.toLowerCase().includes(query);

      return matchesCategory && matchesQuery;
    });
  }, [menuItems, searchQuery, selectedCategoryId]);

  const activeCategory = useMemo(() => {
    const current = categories.find(
      (category) => category.id === selectedCategoryId
    );
    const total = categories.find((category) => category.id === "all");

    if (current) {
      return current;
    }

    return (
      total || {
        id: "all",
        name: "Todas las Categorías",
        itemCount: menuItems.length,
      }
    );
  }, [categories, menuItems.length, selectedCategoryId]);

  const toggleDishSelection = (id: string) => {
    setSelectedDishes((prev) =>
      prev.includes(id) ? prev.filter((dishId) => dishId !== id) : [...prev, id]
    );
  };

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="border-b border-border bg-card">
        <div className="p-4 lg:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <h1 className="text-2xl font-semibold">Gestionar Platos</h1>
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Buscar platos"
                  className="pl-9"
                />
              </div>
              <Button
                className="gap-2 whitespace-nowrap"
                onClick={onCreateMenuItem}
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Agregar Nuevo Plato</span>
                <span className="sm:hidden">Agregar</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="border-b border-border bg-card px-4 py-4 lg:px-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  className="gap-2 bg-transparent lg:hidden"
                >
                  {activeCategory.name}
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 p-0">
                <CategoryPanel
                  categories={categories}
                  selectedCategoryId={selectedCategoryId}
                  onSelectCategory={(categoryId) => {
                    onCategoryChange(categoryId);
                  }}
                  onAddCategory={onCreateCategory}
                  onEditCategory={onEditCategory}
                  onDeleteCategory={onDeleteCategory}
                  isLoading={isLoadingCategories}
                />
              </SheetContent>
            </Sheet>

            <div className="hidden lg:block text-lg font-semibold">
              {activeCategory.name} ({activeCategory.itemCount})
            </div>
            <span className="lg:hidden text-lg font-semibold">
              ({activeCategory.itemCount})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-1 rounded-lg border border-border p-1 sm:flex">
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="icon"
                className="h-8 w-8"
                onClick={() => setViewMode("grid")}
              >
                <Grid3x3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="icon"
                className="h-8 w-8"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 bg-transparent"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="flex h-full flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 lg:p-6">
            {isLoadingMenuItems ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, index) => (
                  <MenuItemSkeleton key={index} />
                ))}
              </div>
            ) : filteredMenuItems.length === 0 ? (
              <EmptyState
                type="menu-items"
                hasCategories={categories.length > 1}
                onCreateCategory={onCreateCategory}
                onCreateMenuItem={onCreateMenuItem}
              />
            ) : (
              <div
                className={cn(
                  "grid gap-4",
                  viewMode === "grid"
                    ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                    : "grid-cols-1"
                )}
              >
                <button
                  className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border p-6 transition-colors hover:border-primary hover:bg-muted/50"
                  type="button"
                  onClick={onCreateMenuItem}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <Plus className="h-6 w-6 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium">Agregar Nuevo Plato a</p>
                    <p className="text-sm text-muted-foreground">
                      {activeCategory.name}
                    </p>
                  </div>
                </button>

                {filteredMenuItems.map((dish) => {
                  const hasImage = Boolean(
                    dish.imageUrl && dish.imageUrl.trim() !== ""
                  );

                  return (
                    <div
                      key={dish.id}
                      className={cn(
                        "rounded-xl border border-border bg-card transition-shadow hover:shadow-md",
                        viewMode === "list"
                          ? "sm:flex sm:items-center sm:gap-6 sm:p-4"
                          : ""
                      )}
                    >
                      <div className="p-4 sm:flex-1">
                        <div className="mb-3 flex items-start justify-between">
                          <Checkbox
                            checked={selectedDishes.includes(dish.id)}
                            onCheckedChange={() => toggleDishSelection(dish.id)}
                          />
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem
                                onClick={() => onEditMenuItem(dish)}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Editar plato
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  onToggleMenuItem(dish.id, !dish.active)
                                }
                              >
                                {dish.active ? (
                                  <>
                                    <EyeOff className="mr-2 h-4 w-4" />
                                    Desactivar
                                  </>
                                ) : (
                                  <>
                                    <Eye className="mr-2 h-4 w-4" />
                                    Activar
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => onDeleteMenuItem(dish.id)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <div
                          className={cn(
                            "mb-4 flex justify-center",
                            viewMode === "list"
                              ? "sm:mb-0 sm:justify-start"
                              : ""
                          )}
                        >
                          <div className="relative h-24 w-24 overflow-hidden rounded-full bg-muted">
                            {hasImage ? (
                              <Image
                                src={dish.imageUrl as string}
                                alt={dish.name}
                                fill
                                sizes="96px"
                                className="object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                                <ImageIcon className="h-8 w-8" />
                              </div>
                            )}
                          </div>
                        </div>

                        <div
                          className={cn(
                            "text-center",
                            viewMode === "list" ? "sm:text-left" : ""
                          )}
                        >
                          <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
                            {dish.category.name}
                          </p>
                          <h3 className="mb-2 line-clamp-2 font-medium text-foreground">
                            {dish.name}
                          </h3>
                          <div className="mb-2 text-lg font-semibold">
                            ${dish.price.toFixed(2)}
                          </div>
                          <Badge
                            variant={dish.active ? "default" : "secondary"}
                            className={cn(
                              "text-xs",
                              dish.active
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            {dish.active ? "Activo" : "Inactivo"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
