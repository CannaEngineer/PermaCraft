const FUNCTION_META: Record<string, { label: string; color: string }> = {
  nitrogen_fixer: { label: 'Nitrogen', color: '#4caf50' },
  pollinator: { label: 'Pollinators', color: '#ffc107' },
  dynamic_accumulator: { label: 'Accum.', color: '#9c27b0' },
  wildlife_habitat: { label: 'Wildlife', color: '#00bcd4' },
  edible: { label: 'Edibles', color: '#ff9800' },
  medicinal: { label: 'Medicinal', color: '#f44336' },
  erosion_control: { label: 'Erosion', color: '#795548' },
  water_management: { label: 'Water', color: '#2196f3' },
};

interface Props {
  score: number;
  functions: Record<string, number>;
}

export function EcoHealthCard({ score, functions }: Props) {
  const missing = Object.entries(functions).filter(([, v]) => v === 0).length;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <span>&#127758;</span>
        <span className="text-xs font-bold text-foreground">Eco Health</span>
      </div>
      <div className="p-3">
        <div className="mb-1 text-2xl font-black text-green-400 leading-none">
          {score}<span className="text-xs font-normal text-muted-foreground">/100</span>
        </div>
        <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-green-700 to-green-400 transition-all"
            style={{ width: `${score}%` }}
          />
        </div>
        <div className="grid grid-cols-2 gap-x-2 gap-y-1">
          {Object.entries(FUNCTION_META).map(([key, { label, color }]) => {
            const count = functions[key] ?? 0;
            return (
              <div key={key} className="flex items-center gap-1.5">
                <div
                  className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: count > 0 ? color : '#2d3d2a' }}
                />
                <span className={`text-[9px] flex-1 truncate ${count > 0 ? 'text-muted-foreground' : 'text-muted-foreground/40'}`}>
                  {label}
                </span>
                <span className={`text-[9px] font-semibold ${count > 0 ? 'text-foreground' : 'text-muted-foreground/30'}`}>
                  {count}
                </span>
              </div>
            );
          })}
        </div>
        {missing > 0 && score < 80 && (
          <div className="mt-2 rounded-md bg-teal-950/40 border border-teal-800/40 px-2 py-1.5 text-[9px] text-teal-400">
            Add {missing} more function{missing > 1 ? 's' : ''} to improve your score
          </div>
        )}
      </div>
    </div>
  );
}
