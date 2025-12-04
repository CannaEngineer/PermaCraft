import { FarmCardSkeleton } from "@/components/dashboard/farm-card-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="p-4 md:p-8">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <Skeleton className="h-9 w-48 mb-2" />
          <Skeleton className="h-5 w-64" />
        </div>
        <Skeleton className="hidden md:block h-10 w-32 rounded" />
      </div>

      {/* Search Skeleton */}
      <div className="mb-6">
        <Skeleton className="h-10 w-full max-w-2xl rounded" />
      </div>

      {/* Farm Cards Skeleton Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <FarmCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
