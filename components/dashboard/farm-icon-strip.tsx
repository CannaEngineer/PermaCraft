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

export function FarmIconStrip({ farms, activeFarmId, onSelect, urgentFarmIds }: Props) {
  return (
    <div className="flex items-center gap-3 overflow-x-auto px-4 py-3 scrollbar-hide">
      {farms.map((farm) => {
        const isActive = activeFarmId === farm.id;
        return (
          <button
            key={farm.id}
            onClick={() => onSelect(farm.id)}
            className="relative flex flex-col items-center gap-1.5 flex-shrink-0"
          >
            {/* Attention dot */}
            {urgentFarmIds.has(farm.id) && (
              <div className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-amber-400 ring-2 ring-background z-10 animate-pulse" />
            )}
            <div className={cn(
              'h-12 w-12 overflow-hidden rounded-2xl border-2 transition-all duration-200',
              isActive
                ? 'border-primary/50 shadow-sm scale-105'
                : 'border-border/40 hover:border-border'
            )}>
              {farm.latest_screenshot ? (
                <img src={farm.latest_screenshot} alt={farm.name} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full" style={{ background: farmGradient(farm.id) }} />
              )}
            </div>
            <span className={cn(
              'max-w-[60px] truncate text-[11px] font-medium transition-colors',
              isActive ? 'text-foreground' : 'text-muted-foreground'
            )}>
              {farm.name}
            </span>
            {isActive && (
              <div className="h-0.5 w-6 rounded-full bg-primary" />
            )}
          </button>
        );
      })}
      <Link href="/farm/new" className="flex flex-col items-center gap-1.5 flex-shrink-0">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-dashed border-border/50 text-muted-foreground hover:border-border hover:text-foreground transition-all duration-200">
          <Plus className="h-5 w-5" />
        </div>
        <span className="text-[11px] font-medium text-muted-foreground">Add</span>
      </Link>
    </div>
  );
}
