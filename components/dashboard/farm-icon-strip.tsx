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

export function FarmIconStrip({ farms, activeFarmId, onSelect, urgentFarmIds }: Props) {
  return (
    <div className="flex items-end gap-4 overflow-x-auto border-b border-border bg-card px-4 py-2 scrollbar-hide">
      {farms.map((farm) => (
        <button
          key={farm.id}
          onClick={() => onSelect(farm.id)}
          className="relative flex flex-col items-center gap-1 flex-shrink-0"
        >
          {/* Attention dot */}
          {urgentFarmIds.has(farm.id) && (
            <div className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-amber-400 ring-2 ring-card z-10" />
          )}
          <div className={cn(
            'h-11 w-11 overflow-hidden rounded-xl border-2 transition-all',
            activeFarmId === farm.id ? 'border-green-400' : 'border-border'
          )}>
            {farm.latest_screenshot ? (
              <img src={farm.latest_screenshot} alt={farm.name} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full" style={{ background: farmGradient(farm.id) }} />
            )}
          </div>
          <span className={cn(
            'max-w-[56px] truncate text-[10px] font-semibold',
            activeFarmId === farm.id ? 'text-foreground' : 'text-muted-foreground'
          )}>
            {farm.name}
          </span>
          {activeFarmId === farm.id && (
            <div className="h-0.5 w-full rounded-full bg-green-400" />
          )}
        </button>
      ))}
      <Link href="/farm/new" className="flex flex-col items-center gap-1 flex-shrink-0">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-dashed border-border text-lg text-muted-foreground">
          +
        </div>
        <span className="text-[10px] text-muted-foreground">Add farm</span>
      </Link>
    </div>
  );
}
