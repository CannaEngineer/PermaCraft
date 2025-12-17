'use client';

import { useState } from 'react';
import { Badge } from '@/lib/db/schema';
import { Card, CardContent } from '@/components/ui/card';
import { Badge as BadgeUI } from '@/components/ui/badge';
import * as Icons from 'lucide-react';
import { cn } from '@/lib/utils';
import { BadgeDetailDialog } from './badge-detail-dialog';

interface BadgeWithStatus extends Badge {
  unlock_criteria: any;
  earned: boolean;
  earned_at?: number;
}

interface BadgeGridProps {
  badges: BadgeWithStatus[];
  showOnlyEarned?: boolean;
}

function getIconComponent(iconName: string) {
  const Icon = (Icons as any)[iconName] || Icons.Award;
  return Icon;
}

export function BadgeGrid({ badges, showOnlyEarned = false }: BadgeGridProps) {
  const [selectedBadge, setSelectedBadge] = useState<BadgeWithStatus | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const displayBadges = showOnlyEarned
    ? badges.filter(b => b.earned)
    : badges;

  const handleBadgeClick = (badge: BadgeWithStatus) => {
    setSelectedBadge(badge);
    setDialogOpen(true);
  };

  if (displayBadges.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Icons.Award className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>
          {showOnlyEarned
            ? 'No badges earned yet. Complete lessons to earn your first badge!'
            : 'No badges available'}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {displayBadges.map((badge) => {
          const Icon = getIconComponent(badge.icon_name);
          const isEarned = badge.earned;

          return (
            <Card
              key={badge.id}
              className={cn(
                'relative overflow-hidden transition-all cursor-pointer hover:scale-105',
                isEarned
                  ? 'border-yellow-500 bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-950 dark:to-amber-950'
                  : 'opacity-60 grayscale hover:opacity-80'
              )}
              onClick={() => handleBadgeClick(badge)}
            >
              <CardContent className="p-4 flex flex-col items-center text-center">
                <div
                  className={cn(
                    'rounded-full p-3 mb-2',
                    isEarned
                      ? 'bg-yellow-100 dark:bg-yellow-900'
                      : 'bg-muted'
                  )}
                >
                  <Icon
                    className={cn(
                      'h-6 w-6',
                      isEarned ? 'text-yellow-600 dark:text-yellow-400' : 'text-muted-foreground'
                    )}
                  />
                </div>
                <h3 className="font-semibold text-sm mb-1">{badge.name}</h3>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {badge.description}
                </p>
                {isEarned && (
                  <BadgeUI variant="secondary" className="mt-2 text-xs">
                    Tier {badge.tier}
                  </BadgeUI>
                )}
                {!isEarned && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    🔒 Locked
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <BadgeDetailDialog
        badge={selectedBadge}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  );
}
