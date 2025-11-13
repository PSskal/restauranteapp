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
import {
  Edit,
  Eye,
  EyeOff,
  MoreVertical,
  Trash2,
  ImageIcon,
} from "lucide-react";
import Image from "next/image";

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

interface MenuItemCardProps {
  item: MenuItem;
  onEdit: (item: MenuItem) => void;
  onToggleActive: (id: string, active: boolean) => void;
  onDelete: (id: string) => void;
}

export function MenuItemCard({
  item,
  onEdit,
  onToggleActive,
  onDelete,
}: MenuItemCardProps) {
  return (
    <Card className="group hover:shadow-xl transition-all duration-300 border-0 shadow-sm bg-white/80 backdrop-blur-sm hover:bg-white/90">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          {/* Imagen circular */}
          <div className="flex-shrink-0">
            <div className="relative w-16 h-16 rounded-full overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 border-2 border-white shadow-lg">
              {item.imageUrl && item.imageUrl.trim() !== "" ? (
                <Image
                  src={item.imageUrl}
                  alt={item.name}
                  fill
                  className="object-cover"
                  sizes="64px"
                  onError={(e) => {
                    console.error("Error loading image:", item.imageUrl);
                    // Ocultar la imagen si hay error
                    e.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="w-6 h-6 text-gray-400" />
                </div>
              )}
            </div>
          </div>

          {/* Contenido */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 text-lg mb-1 truncate">
                  {item.name}
                </h3>
                <div className="flex items-center gap-2 mb-2">
                  <Badge
                    variant="outline"
                    className="text-xs font-medium border-gray-200 text-gray-600"
                  >
                    {item.category.name}
                  </Badge>
                  <Badge
                    variant={item.active ? "default" : "secondary"}
                    className={`text-xs ${
                      item.active
                        ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                        : "bg-gray-100 text-gray-600 border-gray-200"
                    }`}
                  >
                    {item.active ? "Activo" : "Inactivo"}
                  </Badge>
                </div>
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
                  <DropdownMenuItem onClick={() => onEdit(item)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Editar producto
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onToggleActive(item.id, !item.active)}
                  >
                    {item.active ? (
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
                    onClick={() => onDelete(item.id)}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Eliminar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Precio destacado */}
            <div className="text-2xl font-bold text-emerald-600 mb-3">
              ${item.price.toFixed(2)}
            </div>

            {/* Descripción */}
            {item.description && (
              <p className="text-sm text-gray-600 leading-relaxed line-clamp-2 mb-4">
                {item.description}
              </p>
            )}

            {/* Botones de acción */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs hover:bg-gray-50"
                onClick={() => onEdit(item)}
              >
                <Edit className="h-3 w-3 mr-2" />
                Editar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onToggleActive(item.id, !item.active)}
                className={`text-xs border-gray-200 ${
                  item.active
                    ? "text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                    : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                }`}
              >
                {item.active ? (
                  <EyeOff className="h-3 w-3" />
                ) : (
                  <Eye className="h-3 w-3" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
