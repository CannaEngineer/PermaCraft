import { Heart, TrendingUp } from 'lucide-react';

const FUNCTION_META: Record<string, { label: string; color: string; bg: string }> = {
  nitrogen_fixer: { label: 'Nitrogen', color: 'bg-emerald-500', bg: 'bg-emerald-500/20' },
  pollinator: { label: 'Pollinators', color: 'bg-amber-500', bg: 'bg-amber-500/20' },
  dynamic_accumulator: { label: 'Accumulate', color: 'bg-violet-500', bg: 'bg-violet-500/20' },
  wildlife_habitat: { label: 'Wildlife', color: 'bg-teal-500', bg: 'bg-teal-500/20' },
  edible: { label: 'Edibles', color: 'bg-orange-500', bg: 'bg-orange-500/20' },
  medicinal: { label: 'Medicinal', color: 'bg-rose-500', bg: 'bg-rose-500/20' },
  erosion_control: { label: 'Erosion', color: 'bg-stone-500', bg: 'bg-stone-500/20' },
  water_management: { label: 'Water', color: 'bg-sky-500', bg: 'bg-sky-500/20' },
};

interface Props {
  score: number;
  functions: Record<string, number>;
}

function getScoreColor(score: number) {
  if (score >= 80) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 60) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

function getProgressColor(score: number) {
  if (score >= 80) return 'from-emerald-600 to-emerald-400';
  if (score >= 60) return 'from-amber-600 to-amber-400';
  return 'from-red-600 to-red-400';
}

export function EcoHealthCard({ score, functions }: Props) {
  const missing = Object.entries(functions).filter(([, v]) => v === 0).length;

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-4 transition-all duration-200 hover:shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-3">
        <Heart className="h-5 w-5 text-emerald-500" />
        <h4 className="text-sm font-semibold text-foreground tracking-tight">Eco Health</h4>
      </div>

      {/* Score */}
      <div className="flex items-baseline gap-1 mb-2">
        <span className={`text-3xl font-bold tabular-nums ${getScoreColor(score)}`}>{score}</span>
        <span className="text-sm font-medium text-muted-foreground">/100</span>
      </div>

      {/* Progress bar */}
      <div className="mb-4 h-2 overflow-hidden rounded-full bg-muted/50">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${getProgressColor(score)} transition-all duration-500 ease-out`}
          style={{ width: `${score}%` }}
        />
      </div>

      {/* Functions grid */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-2">
        {Object.entries(FUNCTION_META).map(([key, { label, color, bg }]) => {
          const count = functions[key] ?? 0;
          const active = count > 0;
          return (
            <div key={key} className="flex items-center gap-2">
              <div className={`h-2 w-2 flex-shrink-0 rounded-full transition-all duration-200 ${active ? color : 'bg-border'}`} />
              <span className={`text-[11px] flex-1 truncate ${active ? 'text-foreground' : 'text-muted-foreground/50'}`}>
                {label}
              </span>
              <span className={`text-[11px] font-semibold tabular-nums ${active ? 'text-foreground' : 'text-muted-foreground/30'}`}>
                {count}
              </span>
            </div>
          );
        })}
      </div>

      {/* Suggestion */}
      {missing > 0 && score < 80 && (
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-sky-500/10 px-3 py-2">
          <TrendingUp className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400 flex-shrink-0" />
          <span className="text-[11px] font-medium text-sky-700 dark:text-sky-400">
            Add {missing} more function{missing > 1 ? 's' : ''} to improve your score
          </span>
        </div>
      )}
    </div>
  );
}
