import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Edit, MoreVertical, Trash2, Package } from "lucide-react";

interface Category {
  id: string;
  name: string;
  position: number;
  itemCount: number;
}

interface CategoryCardProps {
  category: Category;
  onEdit: (category: Category) => void;
  onDelete: (id: string) => void;
}

export function CategoryCard({
  category,
  onEdit,
  onDelete,
}: CategoryCardProps) {
  const canDelete = category.itemCount === 0;

  return (
    <Card className="group hover:shadow-lg transition-all duration-200 border-0 shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center">
                <Package className="w-4 h-4 text-blue-600" />
              </div>
              <h3 className="font-semibold text-lg leading-tight truncate">
                {category.name}
              </h3>
            </div>
            <Badge
              variant="outline"
              className="text-xs font-medium bg-gray-50 text-gray-600 border-gray-200"
            >
              {category.itemCount}{" "}
              {category.itemCount === 1 ? "producto" : "productos"}
            </Badge>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => onEdit(category)}>
                <Edit className="mr-2 h-4 w-4" />
                Editar categoría
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(category.id)}
                disabled={!canDelete}
                className={`${
                  canDelete
                    ? "text-red-600 focus:text-red-600"
                    : "text-gray-400 cursor-not-allowed"
                }`}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Posición: #{category.position}</span>
          {category.itemCount > 0 && (
            <span className="text-emerald-600 font-medium">
              {category.itemCount} productos activos
            </span>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs"
            onClick={() => onEdit(category)}
          >
            <Edit className="h-3 w-3 mr-1" />
            Editar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(category.id)}
            disabled={!canDelete}
            className={`text-xs ${
              canDelete
                ? "text-red-600 hover:text-red-700 hover:border-red-200"
                : "text-gray-400 cursor-not-allowed"
            }`}
            title={
              !canDelete
                ? "No se puede eliminar una categoría que tiene productos"
                : "Eliminar categoría"
            }
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
