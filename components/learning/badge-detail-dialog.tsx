'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge as BadgeUI } from '@/components/ui/badge';
import * as Icons from 'lucide-react';
import { Badge } from '@/lib/db/schema';

interface BadgeDetailDialogProps {
  badge: Badge & { earned: boolean; unlock_criteria: any } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getIconComponent(iconName: string) {
  const Icon = (Icons as any)[iconName] || Icons.Award;
  return Icon;
}

function getCriteriaDescription(criteria: any): string {
  switch (criteria.type) {
    case 'topic_complete':
      return `Complete all lessons in a specific topic`;
    case 'lesson_count':
      return `Complete ${criteria.count} lesson${criteria.count > 1 ? 's' : ''}`;
    case 'xp_threshold':
      return `Earn ${criteria.xp} total XP`;
    case 'path_complete':
      return `Complete an entire learning path`;
    default:
      return 'Unknown criteria';
  }
}

export function BadgeDetailDialog({
  badge,
  open,
  onOpenChange,
}: BadgeDetailDialogProps) {
  if (!badge) return null;

  const Icon = getIconComponent(badge.icon_name);
  const isEarned = badge.earned;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <div
              className={`rounded-full p-6 ${
                isEarned
                  ? 'bg-gradient-to-br from-yellow-100 to-amber-100 dark:from-yellow-900 dark:to-amber-900'
                  : 'bg-muted'
              }`}
            >
              <Icon
                className={`h-16 w-16 ${
                  isEarned
                    ? 'text-yellow-600 dark:text-yellow-400'
                    : 'text-muted-foreground'
                }`}
              />
            </div>
          </div>
          <DialogTitle className="text-2xl text-center">{badge.name}</DialogTitle>
          <DialogDescription className="text-center text-base">
            {badge.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex justify-center gap-2">
            <BadgeUI variant="secondary">Tier {badge.tier}</BadgeUI>
            <BadgeUI variant="outline">
              {badge.badge_type.replace('_', ' ')}
            </BadgeUI>
            {isEarned ? (
              <BadgeUI className="bg-green-600 text-white">Earned ✓</BadgeUI>
            ) : (
              <BadgeUI variant="secondary">Locked 🔒</BadgeUI>
            )}
          </div>

          <div className="border-t pt-4">
            <h4 className="font-semibold mb-2">How to unlock:</h4>
            <p className="text-sm text-muted-foreground">
              {getCriteriaDescription(badge.unlock_criteria)}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
