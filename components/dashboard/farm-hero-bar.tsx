import { DashboardFarm } from '@/lib/db/queries/dashboard';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

const FUNCTION_LABELS: Record<string, { label: string; color: string }> = {
  nitrogen_fixer: { label: 'N-fixers', color: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/60 dark:text-green-300 dark:border-green-800' },
  pollinator: { label: 'Pollinators', color: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/60 dark:text-yellow-300 dark:border-yellow-800' },
  dynamic_accumulator: { label: 'Accumulators', color: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/60 dark:text-purple-300 dark:border-purple-800' },
  wildlife_habitat: { label: 'Wildlife', color: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/60 dark:text-emerald-300 dark:border-emerald-800' },
  edible: { label: 'Edibles', color: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/60 dark:text-orange-300 dark:border-orange-800' },
  medicinal: { label: 'Medicinal', color: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/60 dark:text-red-300 dark:border-red-800' },
  erosion_control: { label: 'Erosion ctrl', color: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/60 dark:text-amber-300 dark:border-amber-800' },
  water_management: { label: 'Water mgmt', color: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/60 dark:text-blue-300 dark:border-blue-800' },
};

interface Props {
  farm: DashboardFarm;
  ecoFunctions: Record<string, number>;
}

export function FarmHeroBar({ farm, ecoFunctions }: Props) {
  const lastEdited = formatDistanceToNow(new Date(farm.updated_at * 1000), { addSuffix: true });

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border bg-background/80 px-4 py-3">
      <div className="min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <h2 className="text-base font-bold text-foreground">{farm.name}</h2>
          <span className="text-xs text-muted-foreground">
            {farm.acres ? `${farm.acres}ac` : ''}{farm.climate_zone ? ` · ${farm.climate_zone}` : ''} · edited {lastEdited}
          </span>
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {Object.entries(FUNCTION_LABELS).map(([key, { label, color }]) => {
            const count = ecoFunctions[key] ?? 0;
            const isGap = count === 0;
            return (
              <span
                key={key}
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                  isGap
                    ? 'border-amber-300 bg-amber-50 text-amber-600 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-400/70'
                    : color
                }`}
              >
                {isGap ? '\u26A0 ' : ''}{label} {count > 0 ? count : '\u2014'}
              </span>
            );
          })}
        </div>
      </div>
      <Link
        href={`/farm/${farm.id}`}
        className="flex-shrink-0 rounded-xl border border-green-700 bg-green-900/60 px-4 py-2 text-xs font-bold text-green-200 hover:bg-green-800/60 transition-colors text-center"
      >
        Open Map Editor &rarr;
      </Link>
    </div>
  );
}
