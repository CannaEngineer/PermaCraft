'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import * as Icons from 'lucide-react';
import { Badge } from '@/lib/db/schema';

interface BadgeCelebrationDialogProps {
  open: boolean;
  onClose: () => void;
  badgeIds: string[];
}

function getIconComponent(iconName: string) {
  const Icon = (Icons as any)[iconName] || Icons.Award;
  return Icon;
}

export function BadgeCelebrationDialog({
  open,
  onClose,
  badgeIds,
}: BadgeCelebrationDialogProps) {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && badgeIds.length > 0) {
      // Fetch badge details
      fetch('/api/learning/badges')
        .then(res => res.json())
        .then(allBadges => {
          const earnedBadges = allBadges.filter((b: any) =>
            badgeIds.includes(b.id)
          );
          setBadges(earnedBadges);
          setLoading(false);
        });
    }
  }, [open, badgeIds]);

  if (badgeIds.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl text-center">
            🎉 Badge{badges.length > 1 ? 's' : ''} Earned!
          </DialogTitle>
          <DialogDescription className="text-center">
            Congratulations! You've unlocked {badges.length} new badge{badges.length > 1 ? 's' : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {loading ? (
            <div className="text-center text-muted-foreground">Loading...</div>
          ) : (
            badges.map((badge) => {
              const Icon = getIconComponent(badge.icon_name);
              return (
                <div
                  key={badge.id}
                  className="flex items-center gap-4 p-4 rounded-lg bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-950 dark:to-amber-950 border-2 border-yellow-400"
                >
                  <div className="rounded-full p-3 bg-yellow-100 dark:bg-yellow-900">
                    <Icon className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg">{badge.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {badge.description}
                    </p>
                    <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                      Tier {badge.tier} • {badge.badge_type.replace('_', ' ')}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="flex justify-center">
          <Button onClick={onClose} size="lg">
            Awesome!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
