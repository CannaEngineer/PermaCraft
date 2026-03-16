import { IntelligenceRowSkeleton } from '@/components/dashboard/intel/intelligence-row-skeleton';

export default function DashboardLoading() {
  return (
    <div className="flex flex-col">
      {/* Top bar skeleton */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <div className="h-4 w-32 animate-pulse rounded bg-muted mb-1" />
          <div className="h-3 w-48 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-8 w-24 animate-pulse rounded-xl bg-muted" />
      </div>
      {/* Tab strip skeleton */}
      <div className="flex gap-2 border-b border-border bg-card px-4 py-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-12 w-32 animate-pulse rounded-t-xl bg-muted" />
        ))}
      </div>
      {/* Hero skeleton */}
      <div className="border-b border-border px-4 py-3">
        <div className="h-5 w-48 animate-pulse rounded bg-muted mb-2" />
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-5 w-20 animate-pulse rounded-full bg-muted" />
          ))}
        </div>
      </div>
      <div className="p-4 space-y-4">
        <IntelligenceRowSkeleton />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="h-48 animate-pulse rounded-xl bg-muted" />
          <div className="h-48 animate-pulse rounded-xl bg-muted" />
        </div>
      </div>
    </div>
  );
}
