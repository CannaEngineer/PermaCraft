import Link from 'next/link';
import { Sparkles, ArrowRight } from 'lucide-react';

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

function categorize(response: string): 'gap' | 'opportunity' | 'insight' {
  const lower = response.toLowerCase();
  if (lower.includes('missing') || lower.includes('lack') || lower.includes('without')) return 'gap';
  if (lower.includes('add') || lower.includes('consider') || lower.includes('would benefit') || lower.includes('could'))
    return 'opportunity';
  return 'insight';
}

const CATEGORY_STYLE = {
  gap: {
    label: 'Gap',
    dot: 'bg-amber-500',
    bg: 'bg-amber-500/5 border-amber-500/15',
    text: 'text-amber-700 dark:text-amber-400',
  },
  opportunity: {
    label: 'Opportunity',
    dot: 'bg-teal-500',
    bg: 'bg-teal-500/5 border-teal-500/15',
    text: 'text-teal-700 dark:text-teal-400',
  },
  insight: {
    label: 'Insight',
    dot: 'bg-green-500',
    bg: 'bg-green-500/5 border-green-500/15',
    text: 'text-green-700 dark:text-green-400',
  },
};

export function InsightsWidget({ insights, farmId }: Props) {
  const parsed = insights.slice(0, 3).map((i) => {
    const flat = i.ai_response.replace(/\n/g, ' ').trim();
    let snippet = flat;
    let truncated = false;
    if (flat.length > 140) {
      const cut = flat.lastIndexOf(' ', 140);
      snippet = flat.slice(0, cut > 80 ? cut : 140);
      truncated = true;
    }
    return { ...i, snippet, truncated, category: categorize(i.ai_response) };
  });

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10">
            <Sparkles className="h-4.5 w-4.5 text-violet-600 dark:text-violet-400" />
          </div>
          <h3 className="text-sm font-semibold">AI Insights</h3>
        </div>
        {parsed.length > 0 && (
          <Link
            href={`/farm/${farmId}?tab=ai`}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            View all
            <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>

      <div className="space-y-2.5">
        {parsed.length === 0 && (
          <div className="py-6 text-center">
            <Sparkles className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No analyses yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1 mb-3">Ask AI to analyze your farm design</p>
            <Link
              href={`/farm/${farmId}?chat=open`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary/10 border border-primary/20 px-4 py-2 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
            >
              <Sparkles className="h-3 w-3" />
              Start AI Analysis
            </Link>
          </div>
        )}
        {parsed.map((item) => {
          const style = CATEGORY_STYLE[item.category];
          return (
            <div key={item.id} className={`rounded-xl border p-3.5 ${style.bg}`}>
              <div className="flex items-center gap-2 mb-1.5">
                <div className={`h-2 w-2 rounded-full ${style.dot}`} />
                <span className={`text-[11px] font-semibold uppercase tracking-wide ${style.text}`}>
                  {style.label}
                </span>
              </div>
              {item.user_query && (
                <p className="text-xs text-muted-foreground mb-1 truncate">
                  Q: {item.user_query}
                </p>
              )}
              <p className="text-sm text-foreground/80 leading-relaxed line-clamp-2">
                {item.snippet}{item.truncated ? '...' : ''}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
