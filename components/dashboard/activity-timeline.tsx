'use client';
import { useState, type ReactNode } from 'react';
import { formatDistanceToNow, isToday, isThisWeek } from 'date-fns';
import { Bot, Sprout, MapPin, FileText, CheckSquare, ArrowRight, Spline } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface ActivityItem {
  type: string;
  id: string;
  title: string;
  created_at: number;
}

const TYPE_META: Record<string, { icon: ReactNode; bg: string; label: string }> = {
  ai: {
    icon: <Bot className="h-3.5 w-3.5" />,
    bg: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
    label: 'AI',
  },
  planting: {
    icon: <Sprout className="h-3.5 w-3.5" />,
    bg: 'bg-green-500/10 text-green-600 dark:text-green-400',
    label: 'Plant',
  },
  zone: {
    icon: <MapPin className="h-3.5 w-3.5" />,
    bg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    label: 'Zone',
  },
  line: {
    icon: <Spline className="h-3.5 w-3.5" />,
    bg: 'bg-teal-500/10 text-teal-600 dark:text-teal-400',
    label: 'Line',
  },
  task: {
    icon: <CheckSquare className="h-3.5 w-3.5" />,
    bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    label: 'Task',
  },
};

const DEFAULT_META = {
  icon: <FileText className="h-3.5 w-3.5" />,
  bg: 'bg-muted text-muted-foreground',
  label: '',
};

type TimeGroup = 'today' | 'this_week' | 'earlier';

function groupByTime(items: ActivityItem[]): { group: TimeGroup; label: string; items: ActivityItem[] }[] {
  const groups: Record<TimeGroup, ActivityItem[]> = { today: [], this_week: [], earlier: [] };
  for (const item of items) {
    const date = new Date(item.created_at * 1000);
    if (isToday(date)) {
      groups.today.push(item);
    } else if (isThisWeek(date, { weekStartsOn: 1 })) {
      groups.this_week.push(item);
    } else {
      groups.earlier.push(item);
    }
  }
  const result: { group: TimeGroup; label: string; items: ActivityItem[] }[] = [];
  if (groups.today.length > 0) result.push({ group: 'today', label: 'Today', items: groups.today });
  if (groups.this_week.length > 0) result.push({ group: 'this_week', label: 'This Week', items: groups.this_week });
  if (groups.earlier.length > 0) result.push({ group: 'earlier', label: 'Earlier', items: groups.earlier });
  return result;
}

interface Props {
  items: ActivityItem[];
  farmId?: string;
}

const FILTER_TYPES = ['ai', 'planting', 'zone', 'line', 'task'] as const;
type FilterType = typeof FILTER_TYPES[number];

const FILTER_LABELS: Record<FilterType, string> = {
  ai: 'AI',
  planting: 'Plants',
  zone: 'Zones',
  line: 'Lines',
  task: 'Tasks',
};

export function ActivityTimeline({ items, farmId }: Props) {
  const [activeFilter, setActiveFilter] = useState<FilterType | null>(null);

  const typeCounts = new Map<string, number>();
  for (const item of items) {
    typeCounts.set(item.type, (typeCounts.get(item.type) ?? 0) + 1);
  }

  const availableFilters = FILTER_TYPES.filter((t) => typeCounts.has(t));
  const hasMultipleTypes = availableFilters.length > 1;

  const visibleItems = activeFilter
    ? items.filter((item) => item.type === activeFilter)
    : items;

  const grouped = groupByTime(visibleItems);

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">Recent Activity</h3>
        {farmId && items.length > 0 && (
          <Link
            href={`/farm/${farmId}`}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Open farm
            <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>

      {/* Type filter pills — only show when multiple types exist */}
      {hasMultipleTypes && items.length > 0 && (
        <div className="flex gap-1.5 mb-3 flex-wrap">
          <button
            onClick={() => setActiveFilter(null)}
            className={cn(
              'rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors',
              activeFilter === null
                ? 'bg-foreground/10 text-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            )}
          >
            All
          </button>
          {availableFilters.map((type) => {
            const count = typeCounts.get(type) ?? 0;
            return (
              <button
                key={type}
                onClick={() => setActiveFilter(activeFilter === type ? null : type)}
                className={cn(
                  'rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors inline-flex items-center gap-1',
                  activeFilter === type
                    ? 'bg-foreground/10 text-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
              >
                {FILTER_LABELS[type]}
                <span className="text-muted-foreground/50">{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {items.length === 0 && (
        <div className="py-8 text-center">
          <div className="h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
            <Sprout className="h-5 w-5 text-muted-foreground/40" />
          </div>
          <p className="text-sm text-muted-foreground">No activity yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Open your farm and start designing</p>
        </div>
      )}

      {items.length > 0 && visibleItems.length === 0 && activeFilter && (
        <div className="py-6 text-center">
          <p className="text-sm text-muted-foreground">No {FILTER_LABELS[activeFilter].toLowerCase()} activity</p>
          <button
            onClick={() => setActiveFilter(null)}
            className="text-xs text-primary hover:text-primary/80 mt-1 transition-colors"
          >
            Show all activity
          </button>
        </div>
      )}

      <div className="space-y-3">
        {grouped.map(({ group, label, items: groupItems }) => (
          <div key={group}>
            <div className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wider px-3 mb-1">
              {label}
            </div>
            <div className="space-y-1">
              {groupItems.map((item) => {
                const meta = TYPE_META[item.type] || DEFAULT_META;
                const href = farmId
                  ? item.type === 'ai'
                    ? `/farm/${farmId}?tab=ai`
                    : `/farm/${farmId}`
                  : null;
                const inner = (
                  <>
                    <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${meta.bg}`}>
                      {meta.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-foreground truncate">
                        {meta.label && (
                          <span className="text-muted-foreground font-medium text-xs mr-1.5">{meta.label}</span>
                        )}
                        {item.title || 'Untitled'}
                      </p>
                    </div>
                    <span className="flex-shrink-0 text-xs text-muted-foreground/70">
                      {formatDistanceToNow(new Date(item.created_at * 1000), { addSuffix: true })}
                    </span>
                  </>
                );
                const cls = "flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-muted/30 transition-colors";
                return href ? (
                  <Link key={`${item.type}-${item.id}`} href={href} className={cls}>
                    {inner}
                  </Link>
                ) : (
                  <div key={`${item.type}-${item.id}`} className={cls}>
                    {inner}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
