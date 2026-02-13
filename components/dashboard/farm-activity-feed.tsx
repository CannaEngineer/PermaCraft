import { db } from '@/lib/db';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, Sprout, MessageCircle } from 'lucide-react';
import { ExpandableText } from '@/components/shared/expandable-text';

interface FarmActivityFeedProps {
  userId: string;
}

async function fetchFarmActivity(userId: string) {
  try {
    // Get recent AI analyses
    const aiAnalyses = await db.execute({
      sql: `
        SELECT
          'ai_analysis' as type,
          a.id,
          a.farm_id,
          a.user_query,
          a.ai_response,
          a.created_at,
          f.name as farm_name
        FROM ai_analyses a
        JOIN farms f ON a.farm_id = f.id
        WHERE f.user_id = ?
        ORDER BY a.created_at DESC
        LIMIT 5
      `,
      args: [userId],
    });

    // Get recent plantings
    const plantings = await db.execute({
      sql: `
        SELECT
          'planting' as type,
          p.id,
          p.farm_id,
          p.created_at,
          s.common_name,
          f.name as farm_name
        FROM plantings p
        JOIN species s ON p.species_id = s.id
        JOIN farms f ON p.farm_id = f.id
        WHERE f.user_id = ?
        ORDER BY p.created_at DESC
        LIMIT 5
      `,
      args: [userId],
    });

    // Combine and sort by created_at
    const activities = [
      ...aiAnalyses.rows.map(row => row as any),
      ...plantings.rows.map(row => row as any),
    ].sort((a, b) => b.created_at - a.created_at).slice(0, 5);

    return activities;
  } catch (error) {
    console.error('Error fetching farm activity:', error);
    return [];
  }
}

export async function FarmActivityFeed({ userId }: FarmActivityFeedProps) {
  const activities = await fetchFarmActivity(userId);

  if (activities.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-muted-foreground">No recent activity</p>
          <p className="text-xs text-muted-foreground mt-1">
            Start designing your farm to see activity here
          </p>
        </CardContent>
      </Card>
    );
  }

  const formatRelativeTime = (timestamp: number) => {
    const seconds = Math.floor(Date.now() / 1000 - timestamp);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div className="space-y-3">
      {activities.map((activity: any) => (
        <Link key={`${activity.type}-${activity.id}`} href={`/farm/${activity.farm_id}`}>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                {activity.type === 'ai_analysis' ? (
                  <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-5 h-5 text-purple-500" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                    <Sprout className="w-5 h-5 text-green-500" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-semibold text-sm">
                      {activity.type === 'ai_analysis' ? 'AI Analysis' : 'New Planting'}
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeTime(activity.created_at)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{activity.farm_name}</p>
                  {activity.type === 'ai_analysis' ? (
                    <ExpandableText
                      text={activity.user_query}
                      maxLength={200}
                      expandLabel="More"
                      showCollapseButton={false}
                      className="text-sm"
                    />
                  ) : (
                    <p className="text-sm">
                      Added <span className="font-medium">{activity.common_name}</span>
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
