'use client';
import { formatDistanceToNow } from 'date-fns';
import { Bot, Sprout, MapPin, FileText, CheckSquare } from 'lucide-react';

interface ActivityItem {
  type: string;
  id: string;
  title: string;
  created_at: number;
}

const TYPE_META: Record<string, { icon: React.ReactNode; bg: string }> = {
  ai: {
    icon: <Bot className="h-3.5 w-3.5" />,
    bg: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  },
  planting: {
    icon: <Sprout className="h-3.5 w-3.5" />,
    bg: 'bg-green-500/10 text-green-600 dark:text-green-400',
  },
  zone: {
    icon: <MapPin className="h-3.5 w-3.5" />,
    bg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  },
  task: {
    icon: <CheckSquare className="h-3.5 w-3.5" />,
    bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  },
};

const DEFAULT_META = {
  icon: <FileText className="h-3.5 w-3.5" />,
  bg: 'bg-muted text-muted-foreground',
};

interface Props {
  items: ActivityItem[];
}

export function ActivityTimeline({ items }: Props) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h3 className="text-sm font-semibold mb-4">Recent Activity</h3>

      {items.length === 0 && (
        <div className="py-8 text-center">
          <div className="h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
            <Sprout className="h-5 w-5 text-muted-foreground/40" />
          </div>
          <p className="text-sm text-muted-foreground">No activity yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Open your farm and start designing</p>
        </div>
      )}

      <div className="space-y-1">
        {items.map((item, i) => {
          const meta = TYPE_META[item.type] || DEFAULT_META;
          return (
            <div
              key={`${item.type}-${item.id}`}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-muted/30 transition-colors"
            >
              <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${meta.bg}`}>
                {meta.icon}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-foreground truncate">{item.title || 'Untitled'}</p>
              </div>
              <span className="flex-shrink-0 text-xs text-muted-foreground/70">
                {formatDistanceToNow(new Date(item.created_at * 1000), { addSuffix: true })}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
