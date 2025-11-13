import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function CategorySkeleton() {
  return (
    <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          {/* Imagen circular skeleton */}
          <div className="flex-shrink-0">
            <Skeleton className="w-14 h-14 rounded-full" />
          </div>

          {/* Contenido skeleton */}
          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0 space-y-2">
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-8 w-8" />
            </div>

            {/* Info adicional skeleton */}
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>

            {/* Botones skeleton */}
            <div className="flex gap-2">
              <Skeleton className="h-8 flex-1" />
              <Skeleton className="h-8 w-8" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
