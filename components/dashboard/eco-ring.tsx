'use client';

const FUNCTION_META: Record<string, { label: string; icon: string; color: string; bgClass: string }> = {
  nitrogen_fixer: { label: 'Nitrogen Fixers', icon: '🫘', color: '#4caf50', bgClass: 'bg-green-500/10 text-green-700 dark:text-green-400' },
  pollinator: { label: 'Pollinators', icon: '🐝', color: '#f59e0b', bgClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-400' },
  dynamic_accumulator: { label: 'Accumulators', icon: '⛏️', color: '#8b5cf6', bgClass: 'bg-violet-500/10 text-violet-700 dark:text-violet-400' },
  wildlife_habitat: { label: 'Wildlife', icon: '🦎', color: '#06b6d4', bgClass: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400' },
  edible: { label: 'Edibles', icon: '🍎', color: '#f97316', bgClass: 'bg-orange-500/10 text-orange-700 dark:text-orange-400' },
  medicinal: { label: 'Medicinal', icon: '🌿', color: '#ef4444', bgClass: 'bg-red-500/10 text-red-700 dark:text-red-400' },
  erosion_control: { label: 'Erosion Control', icon: '🏔️', color: '#78716c', bgClass: 'bg-stone-500/10 text-stone-700 dark:text-stone-400' },
  water_management: { label: 'Water Mgmt', icon: '💧', color: '#3b82f6', bgClass: 'bg-blue-500/10 text-blue-700 dark:text-blue-400' },
};

interface Props {
  score: number;
  functions: Record<string, number>;
}

export function EcoRing({ score, functions }: Props) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const scoreColor = score >= 75 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h3 className="text-sm font-semibold mb-4">Ecosystem Health</h3>

      <div className="flex items-center gap-6">
        {/* SVG Ring */}
        <div className="relative flex-shrink-0">
          <svg width="128" height="128" viewBox="0 0 128 128">
            {/* Background ring */}
            <circle
              cx="64"
              cy="64"
              r={radius}
              fill="none"
              stroke="currentColor"
              className="text-muted/30"
              strokeWidth="10"
            />
            {/* Score ring */}
            <circle
              cx="64"
              cy="64"
              r={radius}
              fill="none"
              stroke={scoreColor}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              transform="rotate(-90 64 64)"
              className="transition-all duration-700 ease-out"
            />
          </svg>
          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold" style={{ color: scoreColor }}>
              {score}
            </span>
            <span className="text-[11px] text-muted-foreground font-medium">of 100</span>
          </div>
        </div>

        {/* Functions grid */}
        <div className="flex-1 grid grid-cols-2 gap-2">
          {Object.entries(FUNCTION_META).map(([key, meta]) => {
            const count = functions[key] ?? 0;
            const active = count > 0;
            return (
              <div
                key={key}
                className={`flex items-center gap-2 rounded-xl px-2.5 py-1.5 transition-colors ${
                  active ? meta.bgClass : 'bg-muted/30 text-muted-foreground/50'
                }`}
              >
                <span className={`text-sm ${active ? '' : 'grayscale opacity-40'}`}>{meta.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className={`text-[11px] font-medium truncate ${active ? '' : 'text-muted-foreground/50'}`}>
                    {meta.label}
                  </div>
                </div>
                <span className={`text-xs font-bold tabular-nums ${active ? '' : 'text-muted-foreground/30'}`}>
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Suggestion */}
      {score < 75 && (
        <div className="mt-4 rounded-xl bg-primary/5 border border-primary/10 px-4 py-3">
          <p className="text-xs text-foreground/80 leading-relaxed">
            <span className="font-semibold">Tip:</span>{' '}
            Add{' '}
            {Object.entries(functions)
              .filter(([, v]) => v === 0)
              .slice(0, 2)
              .map(([k]) => FUNCTION_META[k]?.label.toLowerCase())
              .join(' and ')}{' '}
            to strengthen your ecosystem diversity.
          </p>
        </div>
      )}
    </div>
  );
}
