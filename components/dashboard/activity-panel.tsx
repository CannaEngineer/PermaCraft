import { formatDistanceToNow } from 'date-fns';

interface ActivityItem {
  type: string;
  id: string;
  title: string;
  created_at: number;
}

const ICONS: Record<string, string> = {
  ai: '\uD83E\uDD16',
  planting: '\uD83C\uDF31',
  zone: '\uD83D\uDDFA\uFE0F',
};

interface Props {
  items: ActivityItem[];
}

export function ActivityPanel({ items }: Props) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <h3 className="text-xs font-bold text-foreground">Recent Activity</h3>
      </div>
      <div className="divide-y divide-border">
        {items.length === 0 && (
          <div className="py-6 text-center text-xs text-muted-foreground">No activity yet &mdash; open your farm and start planting</div>
        )}
        {items.map((item) => (
          <div key={`${item.type}-${item.id}`} className="flex items-start gap-3 px-4 py-2.5">
            <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md bg-muted text-sm">
              {ICONS[item.type] ?? '\uD83D\uDCDD'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs text-foreground/80">{item.title || 'Untitled'}</div>
            </div>
            <div className="flex-shrink-0 text-[10px] text-muted-foreground whitespace-nowrap">
              {formatDistanceToNow(new Date(item.created_at * 1000), { addSuffix: true })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
