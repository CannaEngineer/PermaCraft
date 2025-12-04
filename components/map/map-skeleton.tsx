import { Skeleton } from "@/components/ui/skeleton";

export function MapSkeleton() {
  return (
    <div className="relative h-full w-full bg-muted">
      {/* Map Container Skeleton */}
      <Skeleton className="absolute inset-0" />

      {/* Control Overlays Skeleton - Desktop */}
      <div className="hidden md:block">
        {/* Top Left Controls */}
        <div className="absolute top-4 left-4 space-y-3">
          <Skeleton className="h-9 w-40 rounded" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24 rounded" />
            <Skeleton className="h-9 w-32 rounded" />
          </div>
        </div>

        {/* Bottom Right Legend */}
        <Skeleton className="absolute bottom-4 right-4 h-64 w-60 rounded-lg" />

        {/* Bottom Right Compass */}
        <Skeleton className="absolute bottom-72 right-4 h-12 w-12 rounded-full" />
      </div>

      {/* Mobile Control Button Skeleton */}
      <div className="md:hidden">
        <Skeleton className="absolute bottom-[72px] right-4 h-14 w-14 rounded-full" />
        <Skeleton className="absolute bottom-[140px] right-4 h-12 w-24 rounded-lg" />
      </div>

      {/* Loading Text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="bg-card/80 backdrop-blur-sm rounded-lg p-6 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium">Loading map...</p>
          </div>
        </div>
      </div>
    </div>
  );
}
