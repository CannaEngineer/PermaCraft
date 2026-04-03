'use client';
import { useState } from 'react';
import { SeasonalContext } from '@/lib/dashboard/seasonal';
import { AlertTriangle, Snowflake, X } from 'lucide-react';

interface Props {
  seasonal: SeasonalContext;
  urgentTaskCount?: number;
}

export function AlertBanner({ seasonal, urgentTaskCount = 0 }: Props) {
  const [dismissed, setDismissed] = useState(false);

  const alerts: { icon: React.ReactNode; title: string; sub: string; accent: string }[] = [];

  if (seasonal.frostRisk && seasonal.daysToLastFrost !== null) {
    const days = Math.abs(seasonal.daysToLastFrost);
    alerts.push({
      icon: <Snowflake className="h-5 w-5" />,
      title: `Frost risk ${days === 0 ? 'tonight' : `in ${days} day${days !== 1 ? 's' : ''}`}`,
      sub: 'Cover frost-sensitive plantings before dark',
      accent: 'border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-300',
    });
  }

  if (urgentTaskCount > 0) {
    alerts.push({
      icon: <AlertTriangle className="h-5 w-5" />,
      title: `${urgentTaskCount} urgent task${urgentTaskCount > 1 ? 's' : ''} need attention`,
      sub: 'Check your tasks to stay on track',
      accent: 'border-red-500/30 bg-red-500/5 text-red-700 dark:text-red-300',
    });
  }

  if (alerts.length === 0 || dismissed) return null;

  return (
    <div className="space-y-3">
      {alerts.map((alert, i) => (
        <div
          key={i}
          className={`flex items-center gap-4 rounded-2xl border px-5 py-4 ${alert.accent}`}
        >
          <div className="flex-shrink-0">{alert.icon}</div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold">{alert.title}</div>
            <div className="text-xs opacity-80 mt-0.5">{alert.sub}</div>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="flex-shrink-0 rounded-lg p-1.5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <X className="h-4 w-4 opacity-60" />
          </button>
        </div>
      ))}
    </div>
  );
}
