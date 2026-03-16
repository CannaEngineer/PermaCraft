'use client';
import { cn } from '@/lib/utils';
import { DashboardFarm } from '@/lib/db/queries/dashboard';
import Link from 'next/link';

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
    <div className="flex items-end gap-2 overflow-x-auto border-b border-border bg-card px-4 pt-2 scrollbar-hide">
      {farms.map((farm) => (
        <button
          key={farm.id}
          onClick={() => onSelect(farm.id)}
          className={cn(
            'group relative flex-shrink-0 flex items-center gap-2 rounded-t-xl border border-b-0 px-3 py-2 transition-all min-w-[130px]',
            activeFarmId === farm.id
              ? 'border-border bg-background -mb-px'
              : 'border-transparent bg-muted/40 hover:bg-muted/70'
          )}
        >
          {/* Attention dot */}
          {urgentFarmIds.has(farm.id) && (
            <div className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-amber-400 ring-2 ring-card" />
          )}
          {/* Thumbnail */}
          <div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded-md border border-border">
            {farm.latest_screenshot ? (
              <img src={farm.latest_screenshot} alt={farm.name} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full" style={{ background: farmGradient(farm.id) }} />
            )}
          </div>
          <div className="min-w-0 text-left">
            <div className={cn('truncate text-xs font-bold', activeFarmId === farm.id ? 'text-foreground' : 'text-muted-foreground')}>
              {farm.name}
            </div>
            <div className="text-[10px] text-muted-foreground">
              {farm.acres ? `${farm.acres}ac · ` : ''}{farm.planting_count} plants
            </div>
          </div>
          {activeFarmId === farm.id && (
            <div className="ml-auto h-1.5 w-1.5 flex-shrink-0 rounded-full bg-green-400" />
          )}
        </button>
      ))}
      <Link
        href="/farm/new"
        className="mb-[-1px] flex-shrink-0 rounded-t-xl border border-dashed border-border px-4 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        + New farm
      </Link>
    </div>
  );
}
