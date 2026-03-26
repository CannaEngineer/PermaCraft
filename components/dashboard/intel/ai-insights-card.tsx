import { BrainCircuit, AlertTriangle, Lightbulb, TrendingUp } from 'lucide-react';

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

const CATEGORY_CONFIG = {
  gap: {
    label: 'Gap',
    Icon: AlertTriangle,
    accent: 'border-l-amber-500',
    badge: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  },
  opportunity: {
    label: 'Opportunity',
    Icon: Lightbulb,
    accent: 'border-l-sky-500',
    badge: 'bg-sky-500/10 text-sky-700 dark:text-sky-400',
  },
  insight: {
    label: 'Insight',
    Icon: TrendingUp,
    accent: 'border-l-emerald-500',
    badge: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  },
};

export function AiInsightsCard({ insights, farmId }: Props) {
  const parsed = insights.slice(0, 3).map((i) => {
    const snippet = i.ai_response.slice(0, 120).replace(/\n/g, ' ');
    const category = categoriseInsight(i.ai_response);
    return { ...i, snippet, category };
  });

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-4 transition-all duration-200 hover:shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-3">
        <BrainCircuit className="h-5 w-5 text-violet-500" />
        <h4 className="text-sm font-semibold text-foreground tracking-tight">AI Insights</h4>
      </div>

      {/* Content */}
      <div className="space-y-2">
        {parsed.length === 0 && (
          <div className="py-6 text-center text-xs text-muted-foreground">
            No analyses yet — open the map and ask AI
          </div>
        )}
        {parsed.map((item) => {
          const config = CATEGORY_CONFIG[item.category];
          const { Icon } = config;
          return (
            <div key={item.id} className={`rounded-xl bg-muted/20 border-l-[3px] ${config.accent} p-3`}>
              <div className="flex items-center gap-1.5 mb-1">
                <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${config.badge}`}>
                  <Icon className="h-3 w-3" />
                  {config.label}
                </span>
              </div>
              <p className="text-xs text-foreground/80 leading-relaxed line-clamp-2">{item.snippet}...</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
