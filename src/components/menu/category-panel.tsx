import { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Ellipsis, Pencil, Trash2 } from "lucide-react";

interface CategoryPanelItem {
  id: string;
  name: string;
  itemCount: number;
  icon?: ReactNode;
}

interface CategoryPanelProps {
  categories: CategoryPanelItem[];
  selectedCategoryId: string;
  onSelectCategory: (categoryId: string) => void;
  onAddCategory?: () => void;
  onEditCategory?: (categoryId: string) => void;
  onDeleteCategory?: (categoryId: string) => void;
  isLoading?: boolean;
}

export function CategoryPanel({
  categories,
  selectedCategoryId,
  onSelectCategory,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
  isLoading,
}: CategoryPanelProps) {
  return (
    <div className="flex h-full flex-col bg-card">
      <div className="border-b border-border px-4 py-5">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">
            Categorías de Platos
          </p>
          <h2 className="text-xl font-semibold">Gestionar Platos</h2>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full px-4 py-2">
          <div className="space-y-2">
            {isLoading
              ? Array.from({ length: 8 }).map((_, index) => (
                  <CategoryPanelSkeleton key={index} />
                ))
              : categories.map((category) => (
                  <div
                    key={category.id}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border px-3 py-3 transition hover:border-primary/40 hover:bg-primary/5",
                      selectedCategoryId === category.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => onSelectCategory(category.id)}
                      className="flex flex-1 items-center gap-3 text-left"
                    >
                      {category.icon ? (
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                          {category.icon}
                        </div>
                      ) : null}
                      <div className="flex flex-1 flex-col">
                        <span className="font-medium leading-tight">
                          {category.name}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {category.itemCount} platos
                        </span>
                      </div>
                    </button>

                    {category.id !== "all" &&
                    (onEditCategory || onDeleteCategory) ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                          >
                            <Ellipsis className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          {onEditCategory ? (
                            <DropdownMenuItem
                              onClick={() => onEditCategory(category.id)}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              Editar categoría
                            </DropdownMenuItem>
                          ) : null}
                          {onDeleteCategory ? (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => onDeleteCategory(category.id)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Eliminar
                              </DropdownMenuItem>
                            </>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : null}
                  </div>
                ))}
          </div>
        </ScrollArea>
      </div>{" "}
      {onAddCategory ? (
        <div className="border-t border-border px-4 py-4">
          <Button onClick={onAddCategory} className="w-full">
            Agregar Nueva Categoría
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function CategoryPanelSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border px-3 py-3">
      <Skeleton className="h-9 w-9 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-3 w-1/3" />
      </div>
      <Skeleton className="h-4 w-8" />
    </div>
  );
}
