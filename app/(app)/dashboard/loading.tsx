import { IntelligenceRowSkeleton } from '@/components/dashboard/intel/intelligence-row-skeleton';

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header skeleton */}
      <div className="border-b border-border/50 bg-background/80 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div>
              <div className="h-5 w-40 animate-pulse rounded-lg bg-muted mb-1.5" />
              <div className="h-3.5 w-56 animate-pulse rounded-lg bg-muted" />
            </div>
            <div className="h-9 w-28 animate-pulse rounded-xl bg-muted" />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        {/* Farm selector skeleton */}
        <div className="flex gap-2 px-4 sm:px-6 lg:px-8 py-3 border-b border-border/30">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-14 w-44 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>

        {/* Hero skeleton */}
        <div className="border-b border-border/30 px-4 sm:px-6 lg:px-8 py-4">
          <div className="h-6 w-48 animate-pulse rounded-lg bg-muted mb-3" />
          <div className="flex gap-2 mb-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-7 w-20 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
          <div className="flex gap-1.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-7 w-24 animate-pulse rounded-full bg-muted" />
            ))}
          </div>
        </div>

        {/* Content skeleton */}
        <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          <IntelligenceRowSkeleton />
          <div>
            <div className="h-3 w-32 animate-pulse rounded bg-muted mb-3" />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="h-52 animate-pulse rounded-2xl bg-muted" />
              <div className="h-52 animate-pulse rounded-2xl bg-muted" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
