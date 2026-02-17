'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Award, Shield, Star } from 'lucide-react';

interface BadgeItem {
  id: string;
  name: string;
  description: string;
  icon_name: string;
  badge_type: string;
  tier: number;
  earned_at: number;
}

interface ProfileBadgesTabProps {
  badges: BadgeItem[];
}

const tierColors: Record<number, string> = {
  1: 'bg-amber-600/10 text-amber-700 border-amber-600/20',
  2: 'bg-slate-400/10 text-slate-500 border-slate-400/20',
  3: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
};

const badgeTypeIcons: Record<string, typeof Award> = {
  foundation: Shield,
  mastery: Star,
  path_completion: Award,
};

export function ProfileBadgesTab({ badges }: ProfileBadgesTabProps) {
  if (badges.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No badges earned yet.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {badges.map((badge) => {
        const Icon = badgeTypeIcons[badge.badge_type] || Award;
        const earnedDate = new Date(badge.earned_at * 1000).toLocaleDateString();

        return (
          <Card key={badge.id} className="text-center">
            <CardContent className="p-4">
              <div className="flex justify-center mb-2">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    tierColors[badge.tier] || tierColors[1]
                  }`}
                >
                  <Icon className="w-6 h-6" />
                </div>
              </div>
              <h4 className="font-medium text-sm">{badge.name}</h4>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {badge.description}
              </p>
              <Badge variant="outline" className="mt-2 text-[10px]">
                {earnedDate}
              </Badge>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
