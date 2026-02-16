// components/map/info-cards/quick-stats-card.tsx
'use client';

import { MAP_INFO_TOKENS as tokens } from '@/lib/design/map-info-tokens';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatItem {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  color?: 'success' | 'warning' | 'error' | 'info';
}

interface QuickStatsCardProps {
  stats: StatItem[];
  title?: string;
  className?: string;
}

export function QuickStatsCard({ stats, title, className }: QuickStatsCardProps) {
  return (
    <div className={cn(
      tokens.colors.card.background,
      tokens.colors.card.border,
      tokens.shadows.card,
      'rounded-lg overflow-hidden',
      tokens.animation.card,
      className
    )}>
      {title && (
        <div className={cn(tokens.spacing.card.padding, 'border-b border-border')}>
          <h3 className={tokens.typography.title}>{title}</h3>
        </div>
      )}
      <div className={cn(
        'grid grid-cols-2 md:grid-cols-4 gap-px bg-border',
        !title && 'rounded-lg overflow-hidden'
      )}>
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          const colorClass = stat.color ? tokens.colors.status[stat.color] : '';

          return (
            <div
              key={index}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  // Future: Handle stat click action
                }
              }}
              aria-label={`${stat.label}: ${stat.value}`}
              className={cn(
                tokens.colors.card.background,
                tokens.spacing.card.padding,
                'flex flex-col items-center justify-center text-center',
                tokens.colors.card.hover,
                'cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'
              )}
            >
              <div className={cn(
                'p-2 rounded-full mb-2',
                colorClass || 'bg-primary/10'
              )} aria-hidden="true">
                <Icon className="h-4 w-4" />
              </div>
              <div className={tokens.typography.value}>{stat.value}</div>
              <div className={tokens.typography.label}>{stat.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
