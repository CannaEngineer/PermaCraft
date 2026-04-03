import { SeasonalContext } from '@/lib/dashboard/seasonal';
import { Snowflake, Sun, Leaf, Sprout } from 'lucide-react';

const SEASON_ICONS: Record<string, { icon: React.ReactNode; accent: string }> = {
  early_spring: { icon: <Sprout className="h-5 w-5" />, accent: 'text-lime-600 dark:text-lime-400' },
  spring: { icon: <Sprout className="h-5 w-5" />, accent: 'text-green-600 dark:text-green-400' },
  late_spring: { icon: <Sprout className="h-5 w-5" />, accent: 'text-emerald-600 dark:text-emerald-400' },
  early_summer: { icon: <Sun className="h-5 w-5" />, accent: 'text-yellow-600 dark:text-yellow-400' },
  summer: { icon: <Sun className="h-5 w-5" />, accent: 'text-amber-600 dark:text-amber-400' },
  late_summer: { icon: <Sun className="h-5 w-5" />, accent: 'text-orange-600 dark:text-orange-400' },
  early_fall: { icon: <Leaf className="h-5 w-5" />, accent: 'text-orange-600 dark:text-orange-400' },
  fall: { icon: <Leaf className="h-5 w-5" />, accent: 'text-amber-600 dark:text-amber-400' },
  late_fall: { icon: <Leaf className="h-5 w-5" />, accent: 'text-stone-600 dark:text-stone-400' },
  early_winter: { icon: <Snowflake className="h-5 w-5" />, accent: 'text-blue-600 dark:text-blue-400' },
  winter: { icon: <Snowflake className="h-5 w-5" />, accent: 'text-indigo-600 dark:text-indigo-400' },
  late_winter: { icon: <Snowflake className="h-5 w-5" />, accent: 'text-slate-600 dark:text-slate-400' },
};

interface Props {
  seasonal: SeasonalContext;
}

export function SeasonWidget({ seasonal }: Props) {
  const { seasonLabel, daysToLastFrost, daysToFirstFrost, frostRisk, season } = seasonal;
  const seasonMeta = SEASON_ICONS[season] || SEASON_ICONS.spring;

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-muted/50 ${seasonMeta.accent}`}>
          {seasonMeta.icon}
        </div>
        <div>
          <h3 className="text-sm font-semibold">Season</h3>
          <p className={`text-lg font-bold ${seasonMeta.accent}`}>{seasonLabel}</p>
        </div>
      </div>

      <div className="space-y-3">
        {/* Frost info */}
        {frostRisk && (
          <div className="flex items-center gap-3 rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3">
            <Snowflake className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <div>
              <div className="text-sm font-semibold text-amber-700 dark:text-amber-300">Frost Risk</div>
              <div className="text-xs text-amber-600/80 dark:text-amber-400/80">
                {Math.abs(daysToLastFrost ?? 0)} day(s) &mdash; protect sensitive plants
              </div>
            </div>
          </div>
        )}

        {daysToLastFrost !== null && daysToLastFrost > 0 && !frostRisk && (
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-muted-foreground">Last frost</span>
            <span className="text-sm font-semibold">{daysToLastFrost} days away</span>
          </div>
        )}

        {daysToLastFrost !== null && daysToLastFrost <= 0 && (
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-muted-foreground">Last frost</span>
            <span className="text-sm font-semibold text-green-600 dark:text-green-400">Passed ✓</span>
          </div>
        )}

        {daysToFirstFrost !== null && daysToFirstFrost > 0 && daysToFirstFrost < 90 && (
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-muted-foreground">First frost</span>
            <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">{daysToFirstFrost} days</span>
          </div>
        )}
      </div>
    </div>
  );
}
