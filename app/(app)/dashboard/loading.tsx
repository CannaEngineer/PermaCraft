export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header skeleton */}
      <div className="border-b border-border/60 bg-card/50">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 md:px-6 py-4">
          <div>
            <div className="h-6 w-40 animate-pulse rounded-lg bg-muted mb-1.5" />
            <div className="h-4 w-56 animate-pulse rounded-lg bg-muted" />
          </div>
          <div className="h-10 w-28 animate-pulse rounded-xl bg-muted" />
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
        {/* Hero card skeleton */}
        <div className="rounded-3xl border border-border overflow-hidden">
          <div className="flex flex-col md:flex-row">
            <div className="md:w-2/5 aspect-[16/9] md:aspect-auto md:min-h-[220px] animate-pulse bg-muted" />
            <div className="flex-1 p-5 md:p-6 space-y-4">
              <div>
                <div className="h-7 w-48 animate-pulse rounded-lg bg-muted mb-2" />
                <div className="h-4 w-64 animate-pulse rounded-lg bg-muted" />
              </div>
              <div className="flex gap-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i}>
                    <div className="h-9 w-12 animate-pulse rounded-lg bg-muted mb-1" />
                    <div className="h-3 w-16 animate-pulse rounded bg-muted" />
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <div className="h-10 w-36 animate-pulse rounded-2xl bg-muted" />
                <div className="h-10 w-24 animate-pulse rounded-2xl bg-muted" />
              </div>
            </div>
          </div>
        </div>

        {/* Intelligence grid skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-4">
            <div className="h-56 animate-pulse rounded-2xl bg-muted" />
            <div className="h-40 animate-pulse rounded-2xl bg-muted" />
          </div>
          <div className="space-y-4">
            <div className="h-64 animate-pulse rounded-2xl bg-muted" />
            <div className="h-48 animate-pulse rounded-2xl bg-muted" />
          </div>
        </div>
      </div>
    </div>
  );
}
