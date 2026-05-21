import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
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

function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    .replace(/~~(.+?)~~/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1');
}

function extractSnippet(response: string): { snippet: string; truncated: boolean } {
  const cleaned = stripMarkdown(response);
  const firstSentenceEnd = cleaned.search(/[.!?]\s/);
  if (firstSentenceEnd > 0 && firstSentenceEnd <= 160) {
    return { snippet: cleaned.slice(0, firstSentenceEnd + 1), truncated: cleaned.length > firstSentenceEnd + 2 };
  }
  const flat = cleaned.replace(/\n/g, ' ').replace(/\s{2,}/g, ' ').trim();
  if (flat.length <= 140) return { snippet: flat, truncated: false };
  const cut = flat.lastIndexOf(' ', 140);
  return { snippet: flat.slice(0, cut > 80 ? cut : 140), truncated: true };
}

export function InsightsWidget({ insights, farmId }: Props) {
  const parsed = insights.slice(0, 3).map((i) => {
    const { snippet, truncated } = extractSnippet(i.ai_response);
    return { ...i, snippet, truncated };
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
        {parsed.map((item) => (
          <Link
            key={item.id}
            href={`/farm/${farmId}?tab=ai`}
            className="block rounded-xl border border-border/60 bg-muted/20 p-3.5 hover:bg-muted/40 transition-colors"
          >
            <div className="flex items-center justify-between gap-2 mb-1.5">
              {item.user_query ? (
                <p className="text-xs font-medium text-foreground truncate flex-1">
                  {item.user_query}
                </p>
              ) : (
                <p className="text-xs font-medium text-muted-foreground truncate flex-1">
                  AI Analysis
                </p>
              )}
              <span className="text-[11px] text-muted-foreground/60 flex-shrink-0">
                {formatDistanceToNow(new Date(item.created_at * 1000), { addSuffix: true })}
              </span>
            </div>
            <p className="text-sm text-foreground/80 leading-relaxed line-clamp-2">
              {item.snippet}{item.truncated ? '...' : ''}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
