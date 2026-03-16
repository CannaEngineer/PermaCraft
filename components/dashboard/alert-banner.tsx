'use client';
import { useState } from 'react';
import { SeasonalContext } from '@/lib/dashboard/seasonal';

interface Props {
  seasonal: SeasonalContext;
  urgentTaskCount?: number;
}

export function AlertBanner({ seasonal, urgentTaskCount = 0 }: Props) {
  const [dismissed, setDismissed] = useState(false);

  const alerts: { icon: string; title: string; sub: string }[] = [];

  if (seasonal.frostRisk && seasonal.daysToLastFrost !== null) {
    const days = Math.abs(seasonal.daysToLastFrost);
    alerts.push({
      icon: '\uD83C\uDF21\uFE0F',
      title: `Frost risk \u2014 ${days === 0 ? 'tonight' : `in ${days} day${days !== 1 ? 's' : ''}`}`,
      sub: 'Cover frost-sensitive plantings before dark',
    });
  }

  if (urgentTaskCount > 0) {
    alerts.push({
      icon: '\u26A1',
      title: `${urgentTaskCount} urgent task${urgentTaskCount > 1 ? 's' : ''} need attention`,
      sub: 'Tap Tasks to view and complete them',
    });
  }

  if (alerts.length === 0 || dismissed) return null;

  return (
    <div className="space-y-2">
      {alerts.map((alert, i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl border border-amber-800/60 bg-amber-950/40 px-4 py-3">
          <span className="text-xl">{alert.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-amber-300">{alert.title}</div>
            <div className="text-xs text-amber-400/70">{alert.sub}</div>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="flex-shrink-0 text-amber-600 hover:text-amber-400 transition-colors text-lg leading-none"
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  );
}
