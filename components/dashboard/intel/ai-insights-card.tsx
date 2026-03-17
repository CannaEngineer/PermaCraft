interface Insight {
  id: string;
  ai_response: string;
  created_at: number;
  user_query: string;
}

interface Props {
  insights: Insight[];
  farmId: string;
}

function categoriseInsight(response: string): 'gap' | 'opportunity' | 'insight' {
  const lower = response.toLowerCase();
  if (lower.includes('missing') || lower.includes('lack') || lower.includes('no ') || lower.includes('without')) return 'gap';
  if (lower.includes('add') || lower.includes('consider') || lower.includes('would benefit') || lower.includes('could')) return 'opportunity';
  return 'insight';
}

const CATEGORY_STYLES = {
  gap: { label: '\u26A0 Gap', border: 'border-l-amber-500', type: 'text-amber-700 dark:text-amber-400' },
  opportunity: { label: '\uD83D\uDCA1 Opportunity', border: 'border-l-teal-500', type: 'text-teal-700 dark:text-teal-400' },
  insight: { label: '\u2713 Insight', border: 'border-l-green-500', type: 'text-green-700 dark:text-green-400' },
};

export function AiInsightsCard({ insights, farmId }: Props) {
  const parsed = insights.slice(0, 3).map((i) => {
    const snippet = i.ai_response.slice(0, 120).replace(/\n/g, ' ');
    const category = categoriseInsight(i.ai_response);
    return { ...i, snippet, category };
  });

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <span>&#129302;</span>
        <span className="text-xs font-bold text-foreground">AI Insights</span>
      </div>
      <div className="p-2 space-y-1.5">
        {parsed.length === 0 && (
          <div className="py-3 text-center text-[10px] text-muted-foreground">No analyses yet &mdash; open the map and ask AI</div>
        )}
        {parsed.map((item) => {
          const style = CATEGORY_STYLES[item.category];
          return (
            <div key={item.id} className={`rounded-md bg-muted/30 border-l-2 ${style.border} p-2`}>
              <div className={`text-[9px] font-bold uppercase tracking-wide mb-1 ${style.type}`}>{style.label}</div>
              <div className="text-[10px] text-foreground/80 leading-relaxed line-clamp-2">{item.snippet}&hellip;</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
