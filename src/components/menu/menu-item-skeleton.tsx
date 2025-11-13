import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function MenuItemSkeleton() {
  return (
    <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          {/* Imagen circular skeleton */}
          <div className="flex-shrink-0">
            <Skeleton className="w-16 h-16 rounded-full" />
          </div>

          {/* Contenido skeleton */}
          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-12" />
                </div>
              </div>
              <Skeleton className="h-8 w-8" />
            </div>

            {/* Precio skeleton */}
            <Skeleton className="h-8 w-20" />

            {/* Descripción skeleton */}
            <div className="space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>

            {/* Botones skeleton */}
            <div className="flex gap-2 pt-2">
              <Skeleton className="h-8 flex-1" />
              <Skeleton className="h-8 w-8" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
