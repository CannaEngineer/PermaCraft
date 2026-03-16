import { SeasonalContext } from '@/lib/dashboard/seasonal';

interface Props {
  seasonal: SeasonalContext;
}

export function SeasonalCard({ seasonal }: Props) {
  const { seasonLabel, daysToLastFrost, daysToFirstFrost, frostRisk } = seasonal;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <span>&#127800;</span>
        <span className="text-xs font-bold text-foreground">Season</span>
      </div>
      <div className="p-3 space-y-2">
        <div className="text-xs font-semibold text-green-400">{seasonLabel}</div>
        {frostRisk && (
          <div className="rounded-md bg-amber-950/60 border border-amber-800/60 px-2 py-1 text-[10px] text-amber-300">
            &#9888; Frost risk &mdash; {Math.abs(daysToLastFrost ?? 0)} day(s)
          </div>
        )}
        {daysToLastFrost !== null && daysToLastFrost > 0 && (
          <div className="text-[10px] text-muted-foreground">Last frost: {daysToLastFrost}d away</div>
        )}
        {daysToLastFrost !== null && daysToLastFrost <= 0 && (
          <div className="text-[10px] text-green-400 font-medium">&#10003; Past last frost</div>
        )}
        {daysToFirstFrost !== null && daysToFirstFrost > 0 && daysToFirstFrost < 60 && (
          <div className="text-[10px] text-amber-400">First frost: {daysToFirstFrost}d away</div>
        )}
      </div>
    </div>
  );
}
