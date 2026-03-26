import { SeasonalContext } from '@/lib/dashboard/seasonal';
import { Sun, Snowflake, CloudSun, Leaf, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface Props {
  seasonal: SeasonalContext;
}

function SeasonIcon({ label }: { label: string }) {
  const lower = label.toLowerCase();
  if (lower.includes('spring')) return <Sun className="h-5 w-5 text-emerald-500" />;
  if (lower.includes('summer')) return <Sun className="h-5 w-5 text-amber-500" />;
  if (lower.includes('autumn') || lower.includes('fall')) return <Leaf className="h-5 w-5 text-orange-500" />;
  if (lower.includes('winter')) return <Snowflake className="h-5 w-5 text-sky-500" />;
  return <CloudSun className="h-5 w-5 text-muted-foreground" />;
}

export function SeasonalCard({ seasonal }: Props) {
  const { seasonLabel, daysToLastFrost, daysToFirstFrost, frostRisk } = seasonal;

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-4 transition-all duration-200 hover:shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-3">
        <SeasonIcon label={seasonLabel} />
        <div>
          <h4 className="text-sm font-semibold text-foreground tracking-tight">Season</h4>
          <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">{seasonLabel}</p>
        </div>
      </div>

      {/* Frost info */}
      <div className="space-y-2">
        {frostRisk && (
          <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 px-3 py-2">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
              Frost risk — {Math.abs(daysToLastFrost ?? 0)} day(s)
            </span>
          </div>
        )}
        {daysToLastFrost !== null && daysToLastFrost > 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Snowflake className="h-3 w-3 flex-shrink-0" />
            Last frost: {daysToLastFrost} days away
          </div>
        )}
        {daysToLastFrost !== null && daysToLastFrost <= 0 && (
          <div className="flex items-center gap-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
            Past last frost
          </div>
        )}
        {daysToFirstFrost !== null && daysToFirstFrost > 0 && daysToFirstFrost < 60 && (
          <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
            <Snowflake className="h-3 w-3 flex-shrink-0" />
            First frost: {daysToFirstFrost} days away
          </div>
        )}
      </div>
    </div>
  );
}
