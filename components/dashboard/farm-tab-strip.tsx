'use client';
import { cn } from '@/lib/utils';
import { DashboardFarm } from '@/lib/db/queries/dashboard';
import Link from 'next/link';
import { Plus } from 'lucide-react';

interface Props {
  farms: DashboardFarm[];
  activeFarmId: string;
  onSelect: (farmId: string) => void;
  urgentFarmIds: Set<string>;
}

function farmGradient(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  const h = Math.abs(hash) % 360;
  return `linear-gradient(135deg, hsl(${h}, 40%, 25%), hsl(${(h + 40) % 360}, 50%, 20%))`;
}

export function FarmTabStrip({ farms, activeFarmId, onSelect, urgentFarmIds }: Props) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto px-4 sm:px-6 lg:px-8 py-3 scrollbar-hide">
      {farms.map((farm) => {
        const isActive = activeFarmId === farm.id;
        const hasUrgent = urgentFarmIds.has(farm.id);
        return (
          <button
            key={farm.id}
            onClick={() => onSelect(farm.id)}
            className={cn(
              'group relative flex items-center gap-3 rounded-2xl border px-4 py-3 transition-all duration-200 ease-out flex-shrink-0 min-w-[180px]',
              isActive
                ? 'border-primary/30 bg-primary/5 shadow-sm dark:bg-primary/10'
                : 'border-border/50 bg-card hover:bg-accent/40 hover:border-border'
            )}
          >
            {/* Attention dot */}
            {hasUrgent && (
              <div className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-amber-400 ring-2 ring-background animate-pulse" />
            )}
            {/* Thumbnail */}
            <div className={cn(
              'h-10 w-10 flex-shrink-0 overflow-hidden rounded-xl border-2 transition-all',
              isActive ? 'border-primary/40' : 'border-border/40'
            )}>
              {farm.latest_screenshot ? (
                <img src={farm.latest_screenshot} alt={farm.name} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full" style={{ background: farmGradient(farm.id) }} />
              )}
            </div>
            <div className="min-w-0 text-left">
              <div className={cn(
                'truncate text-sm font-semibold tracking-tight',
                isActive ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'
              )}>
                {farm.name}
              </div>
              <div className="text-xs text-muted-foreground">
                {farm.acres ? `${farm.acres} ac` : ''}{farm.acres && farm.planting_count ? ' · ' : ''}{farm.planting_count} plant{farm.planting_count !== 1 ? 's' : ''}
              </div>
            </div>
            {isActive && (
              <div className="ml-auto h-2 w-2 flex-shrink-0 rounded-full bg-emerald-500" />
            )}
          </button>
        );
      })}
      <Link
        href="/farm/new"
        className="flex items-center gap-2 flex-shrink-0 rounded-2xl border border-dashed border-border/60 px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-border hover:bg-accent/30 transition-all duration-200"
      >
        <Plus className="h-4 w-4" />
        New farm
      </Link>
    </div>
  );
}
