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
import { Edit, Eye, EyeOff, MoreVertical, Trash2 } from "lucide-react";

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
    <Card className="group hover:shadow-lg transition-all duration-200 border-0 shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg leading-tight mb-1 truncate">
              {item.name}
            </h3>
            <Badge
              variant="secondary"
              className="text-xs font-medium bg-gray-100 text-gray-600"
            >
              {item.category.name}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={item.active ? "default" : "secondary"}
              className={`text-xs ${
                item.active
                  ? "bg-green-100 text-green-800 hover:bg-green-100"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {item.active ? "Activo" : "Inactivo"}
            </Badge>
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
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-2xl font-bold text-emerald-600">
          ${item.price.toFixed(2)}
        </div>

        {item.description && (
          <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">
            {item.description}
          </p>
        )}

        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs"
            onClick={() => onEdit(item)}
          >
            <Edit className="h-3 w-3 mr-1" />
            Editar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onToggleActive(item.id, !item.active)}
            className={`text-xs ${
              item.active
                ? "text-orange-600 hover:text-orange-700"
                : "text-green-600 hover:text-green-700"
            }`}
          >
            {item.active ? (
              <EyeOff className="h-3 w-3" />
            ) : (
              <Eye className="h-3 w-3" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
