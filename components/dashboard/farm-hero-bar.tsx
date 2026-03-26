import { DashboardFarm } from '@/lib/db/queries/dashboard';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ArrowRight, Clock } from 'lucide-react';

const FUNCTION_LABELS: Record<string, { label: string; icon: string; filled: string; gap: string }> = {
  nitrogen_fixer: {
    label: 'N-fixers',
    icon: '🫘',
    filled: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
    gap: 'bg-muted/50 text-muted-foreground/60 border-border/50',
  },
  pollinator: {
    label: 'Pollinators',
    icon: '🐝',
    filled: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
    gap: 'bg-muted/50 text-muted-foreground/60 border-border/50',
  },
  dynamic_accumulator: {
    label: 'Accumulators',
    icon: '⛏️',
    filled: 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20',
    gap: 'bg-muted/50 text-muted-foreground/60 border-border/50',
  },
  wildlife_habitat: {
    label: 'Wildlife',
    icon: '🦎',
    filled: 'bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/20',
    gap: 'bg-muted/50 text-muted-foreground/60 border-border/50',
  },
  edible: {
    label: 'Edibles',
    icon: '🍎',
    filled: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20',
    gap: 'bg-muted/50 text-muted-foreground/60 border-border/50',
  },
  medicinal: {
    label: 'Medicinal',
    icon: '🌿',
    filled: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
    gap: 'bg-muted/50 text-muted-foreground/60 border-border/50',
  },
  erosion_control: {
    label: 'Erosion',
    icon: '🏔️',
    filled: 'bg-stone-500/10 text-stone-700 dark:text-stone-400 border-stone-500/20',
    gap: 'bg-muted/50 text-muted-foreground/60 border-border/50',
  },
  water_management: {
    label: 'Water',
    icon: '💧',
    filled: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20',
    gap: 'bg-muted/50 text-muted-foreground/60 border-border/50',
  },
};

interface Props {
  farm: DashboardFarm;
  ecoFunctions: Record<string, number>;
}

export function FarmHeroBar({ farm, ecoFunctions }: Props) {
  const lastEdited = formatDistanceToNow(new Date(farm.updated_at * 1000), { addSuffix: true });
  const filledCount = Object.values(ecoFunctions).filter(v => v > 0).length;
  const totalFunctions = Object.keys(FUNCTION_LABELS).length;

  return (
    <div className="bg-card/50 backdrop-blur-sm border-b border-border/30">
      <div className="px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          {/* Farm info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 mb-3">
              <h2 className="text-xl font-bold text-foreground tracking-tight">{farm.name}</h2>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {lastEdited}
              </div>
            </div>

            {/* Meta row */}
            <div className="flex items-center gap-2 mb-3">
              {farm.acres && (
                <span className="inline-flex items-center rounded-lg bg-muted/60 px-2.5 py-1 text-xs font-medium text-foreground">
                  {farm.acres} acres
                </span>
              )}
              {farm.climate_zone && (
                <span className="inline-flex items-center rounded-lg bg-muted/60 px-2.5 py-1 text-xs font-medium text-foreground">
                  {farm.climate_zone}
                </span>
              )}
              <span className="inline-flex items-center rounded-lg bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                {filledCount}/{totalFunctions} functions
              </span>
            </div>

            {/* Ecological function pills */}
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(FUNCTION_LABELS).map(([key, meta]) => {
                const count = ecoFunctions[key] ?? 0;
                const isGap = count === 0;
                return (
                  <span
                    key={key}
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all duration-200 ${
                      isGap ? meta.gap : meta.filled
                    }`}
                  >
                    <span className="text-xs">{meta.icon}</span>
                    {meta.label}
                    <span className="font-semibold tabular-nums">{count > 0 ? count : '—'}</span>
                  </span>
                );
              })}
            </div>
          </div>

          {/* Open editor CTA */}
          <Link
            href={`/farm/${farm.id}`}
            className="inline-flex items-center gap-2 flex-shrink-0 rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90 active:scale-[0.97] transition-all duration-200"
          >
            Open Editor
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
