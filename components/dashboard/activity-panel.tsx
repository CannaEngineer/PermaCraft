import { formatDistanceToNow } from 'date-fns';
import { Activity, BrainCircuit, Sprout, Map, FileText } from 'lucide-react';

interface ActivityItem {
  type: string;
  id: string;
  title: string;
  created_at: number;
}

const TYPE_CONFIG: Record<string, { Icon: typeof Activity; color: string; bg: string }> = {
  ai: { Icon: BrainCircuit, color: 'text-violet-500', bg: 'bg-violet-500/10' },
  planting: { Icon: Sprout, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  zone: { Icon: Map, color: 'text-sky-500', bg: 'bg-sky-500/10' },
};

const DEFAULT_CONFIG = { Icon: FileText, color: 'text-muted-foreground', bg: 'bg-muted/50' };

interface Props {
  items: ActivityItem[];
}

export function ActivityPanel({ items }: Props) {
  return (
    <div className="rounded-2xl border border-border/50 bg-card transition-all duration-200 hover:shadow-sm">
      <div className="flex items-center gap-2.5 px-4 pt-4 pb-3">
        <Activity className="h-5 w-5 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground tracking-tight">Recent Activity</h3>
      </div>

      <div className="px-4 pb-4">
        {items.length === 0 && (
          <div className="py-8 text-center">
            <div className="text-2xl mb-2">🌱</div>
            <p className="text-xs text-muted-foreground">
              No activity yet — open your farm and start planting
            </p>
          </div>
        )}
        <div className="space-y-1">
          {items.map((item) => {
            const config = TYPE_CONFIG[item.type] ?? DEFAULT_CONFIG;
            const { Icon } = config;
            return (
              <div key={`${item.type}-${item.id}`} className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-muted/20 transition-all duration-200">
                <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl ${config.bg}`}>
                  <Icon className={`h-4 w-4 ${config.color}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-foreground">{item.title || 'Untitled'}</p>
                </div>
                <span className="flex-shrink-0 text-[11px] text-muted-foreground whitespace-nowrap">
                  {formatDistanceToNow(new Date(item.created_at * 1000), { addSuffix: true })}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
