import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Edit, MoreVertical, Trash2, FolderOpen } from "lucide-react";
import Image from "next/image";

interface Category {
  id: string;
  name: string;
  position: number;
  itemCount: number;
  imageUrl?: string;
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
    <Card className="group hover:shadow-xl transition-all duration-300 border-0 shadow-sm bg-white/80 backdrop-blur-sm hover:bg-white/90">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          {/* Imagen circular o ícono */}
          <div className="flex-shrink-0">
            <div className="relative w-14 h-14 rounded-full overflow-hidden bg-gradient-to-br from-blue-100 to-blue-200 border-2 border-white shadow-lg">
              {category.imageUrl ? (
                <Image
                  src={category.imageUrl}
                  alt={category.name}
                  fill
                  className="object-cover"
                  sizes="56px"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <FolderOpen className="w-6 h-6 text-blue-600" />
                </div>
              )}
            </div>
          </div>

          {/* Contenido */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 text-lg mb-2 truncate">
                  {category.name}
                </h3>
                <Badge
                  variant="outline"
                  className="text-xs font-medium bg-gray-50 text-gray-600 border-gray-200 mb-3"
                >
                  {category.itemCount}{" "}
                  {category.itemCount === 1 ? "producto" : "productos"}
                </Badge>
              </div>

              {/* Menu de acciones */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-gray-700"
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

            {/* Información adicional */}
            <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
              <span>Posición #{category.position}</span>
              {category.itemCount > 0 && (
                <span className="text-emerald-600 font-medium">
                  Activos: {category.itemCount}
                </span>
              )}
            </div>

            {/* Botones de acción */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs hover:bg-gray-50"
                onClick={() => onEdit(category)}
              >
                <Edit className="h-3 w-3 mr-2" />
                Editar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDelete(category.id)}
                disabled={!canDelete}
                className={`text-xs border-gray-200 ${
                  canDelete
                    ? "text-red-600 hover:text-red-700 hover:bg-red-50"
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
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
