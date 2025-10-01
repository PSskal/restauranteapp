import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChefHat, Plus, Tag } from "lucide-react";

interface EmptyStateProps {
  type: "categories" | "menu-items";
  onCreateCategory?: () => void;
  onCreateMenuItem?: () => void;
  hasCategories?: boolean;
  isCreating?: boolean;
}

export function EmptyState({
  type,
  onCreateCategory,
  onCreateMenuItem,
  hasCategories = false,
  isCreating = false,
}: EmptyStateProps) {
  if (type === "categories") {
    return (
      <Card className="border-dashed border-2 border-gray-300">
        <CardContent className="flex flex-col items-center justify-center py-12 px-6">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Tag className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No hay categorías
          </h3>
          <p className="text-gray-500 text-center mb-6 max-w-sm">
            Las categorías te ayudan a organizar tu menú. Crea tu primera
            categoría para empezar.
          </p>
          <Button
            onClick={onCreateCategory}
            disabled={isCreating}
            size="lg"
            className="shadow-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            {isCreating ? "Creando..." : "Crear Primera Categoría"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-dashed border-2 border-gray-300">
      <CardContent className="flex flex-col items-center justify-center py-12 px-6">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <ChefHat className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          No hay productos
        </h3>
        <p className="text-gray-500 text-center mb-6 max-w-sm">
          {!hasCategories
            ? "Primero crea una categoría, luego agrega productos a tu menú."
            : "Agrega tu primer producto para que tus clientes puedan ver tu oferta."}
        </p>
        {!hasCategories ? (
          <Button
            onClick={onCreateCategory}
            disabled={isCreating}
            size="lg"
            variant="outline"
            className="shadow-sm"
          >
            <Tag className="w-4 h-4 mr-2" />
            {isCreating ? "Creando..." : "Crear Primera Categoría"}
          </Button>
        ) : (
          <Button
            onClick={onCreateMenuItem}
            disabled={isCreating}
            size="lg"
            className="shadow-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            {isCreating ? "Creando..." : "Crear Primer Producto"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
