import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function FarmCardSkeleton() {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <CardContent className="p-0">
        {/* Image Skeleton */}
        <Skeleton className="w-full h-48" />

        {/* Content Skeleton */}
        <div className="p-4">
          {/* Title */}
          <Skeleton className="h-6 w-3/4 mb-2" />

          {/* Location */}
          <Skeleton className="h-4 w-1/2 mb-4" />

          {/* Stats Row */}
          <div className="flex gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-4 w-12" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-4 w-12" />
            </div>
          </div>

          {/* Vitals Section */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-14 rounded-full" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
