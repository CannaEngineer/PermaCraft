'use client';
import { useState } from 'react';
import { SeasonalContext } from '@/lib/dashboard/seasonal';
import { AlertTriangle, Snowflake, X } from 'lucide-react';

type AlertId = 'frost' | 'urgent_tasks';

interface Alert {
  id: AlertId;
  icon: React.ReactNode;
  title: string;
  sub: string;
  accent: string;
}

interface Props {
  seasonal: SeasonalContext;
  urgentTaskCount?: number;
}

export function AlertBanner({ seasonal, urgentTaskCount = 0 }: Props) {
  const [dismissed, setDismissed] = useState<Set<AlertId>>(new Set());

  const alerts: Alert[] = [];

  if (seasonal.frostRisk && seasonal.daysToLastFrost !== null) {
    const days = Math.abs(seasonal.daysToLastFrost);
    alerts.push({
      id: 'frost',
      icon: <Snowflake className="h-5 w-5" />,
      title: `Frost risk ${days === 0 ? 'tonight' : `in ${days} day${days !== 1 ? 's' : ''}`}`,
      sub: 'Cover frost-sensitive plantings before dark',
      accent: 'border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-300',
    });
  }

  if (urgentTaskCount > 0) {
    alerts.push({
      id: 'urgent_tasks',
      icon: <AlertTriangle className="h-5 w-5" />,
      title: `${urgentTaskCount} urgent task${urgentTaskCount > 1 ? 's' : ''} need attention`,
      sub: 'Check your tasks to stay on track',
      accent: 'border-red-500/30 bg-red-500/5 text-red-700 dark:text-red-300',
    });
  }

  const visible = alerts.filter((a) => !dismissed.has(a.id));
  if (visible.length === 0) return null;

  return (
    <div className="space-y-3">
      {visible.map((alert) => (
        <div
          key={alert.id}
          className={`flex items-center gap-4 rounded-2xl border px-5 py-4 ${alert.accent}`}
        >
          <div className="flex-shrink-0">{alert.icon}</div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold">{alert.title}</div>
            <div className="text-xs opacity-80 mt-0.5">{alert.sub}</div>
          </div>
          <button
            onClick={() =>
              setDismissed((prev) => {
                const next = new Set(prev);
                next.add(alert.id);
                return next;
              })
            }
            aria-label={`Dismiss ${alert.title}`}
            className="flex-shrink-0 rounded-lg p-1.5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <X className="h-4 w-4 opacity-60" />
          </button>
        </div>
      ))}
    </div>
  );
}
