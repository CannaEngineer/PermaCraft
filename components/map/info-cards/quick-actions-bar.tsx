// components/map/info-cards/quick-actions-bar.tsx
'use client';

import { MAP_INFO_TOKENS as tokens } from '@/lib/design/map-info-tokens';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { LucideIcon } from 'lucide-react';

interface QuickAction {
  id: string;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  variant?: 'default' | 'outline' | 'ghost';
  badge?: string | number;
}

interface QuickActionsBarProps {
  actions: QuickAction[];
  className?: string;
}

export function QuickActionsBar({ actions, className }: QuickActionsBarProps) {
  return (
    <div className={cn(
      tokens.colors.card.background,
      tokens.colors.card.border,
      tokens.shadows.card,
      'rounded-lg',
      tokens.spacing.card.padding,
      className
    )}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {actions.map((action) => {
          const Icon = action.icon;

          return (
            <Button
              key={action.id}
              variant={action.variant || 'outline'}
              className={cn(
                'flex flex-col items-center justify-center h-auto py-3 gap-2 relative min-h-[44px]',
                tokens.animation.card
              )}
              onClick={action.onClick}
              aria-label={action.badge ? `${action.label} (${action.badge} items)` : action.label}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              <span className="text-xs font-medium">{action.label}</span>
              {action.badge && (
                <span
                  className="absolute top-1 right-1 bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  aria-label={`${action.badge} notifications`}
                >
                  {action.badge}
                </span>
              )}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
