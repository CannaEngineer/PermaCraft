'use client';
import { useState } from 'react';
import { SeasonalContext } from '@/lib/dashboard/seasonal';
import { X, Thermometer, Zap } from 'lucide-react';

interface Props {
  seasonal: SeasonalContext;
  urgentTaskCount?: number;
}

export function AlertBanner({ seasonal, urgentTaskCount = 0 }: Props) {
  const [dismissed, setDismissed] = useState(false);

  const alerts: { icon: React.ReactNode; title: string; sub: string; style: string }[] = [];

  if (seasonal.frostRisk && seasonal.daysToLastFrost !== null) {
    const days = Math.abs(seasonal.daysToLastFrost);
    alerts.push({
      icon: <Thermometer className="h-4 w-4" />,
      title: `Frost risk — ${days === 0 ? 'tonight' : `in ${days} day${days !== 1 ? 's' : ''}`}`,
      sub: 'Cover frost-sensitive plantings before dark',
      style: 'bg-amber-500/10 border-amber-500/20 text-amber-800 dark:text-amber-300',
    });
  }

  if (urgentTaskCount > 0) {
    alerts.push({
      icon: <Zap className="h-4 w-4" />,
      title: `${urgentTaskCount} urgent task${urgentTaskCount > 1 ? 's' : ''} need attention`,
      sub: 'Open Tasks to view and complete them',
      style: 'bg-red-500/10 border-red-500/20 text-red-800 dark:text-red-300',
    });
  }

  if (alerts.length === 0 || dismissed) return null;

  return (
    <div className="space-y-2">
      {alerts.map((alert, i) => (
        <div key={i} className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition-all duration-200 ${alert.style}`}>
          <div className="flex-shrink-0">{alert.icon}</div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold">{alert.title}</div>
            <div className="text-xs opacity-70">{alert.sub}</div>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="flex-shrink-0 rounded-lg p-1 opacity-50 hover:opacity-100 transition-opacity"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
