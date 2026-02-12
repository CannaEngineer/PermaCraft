import { db } from '@/lib/db';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, MessageCircle, Heart, Bookmark } from 'lucide-react';

interface ActivityItem {
  id: string;
  type: 'post' | 'comment' | 'reaction';
  user_name: string;
  user_image: string | null;
  post_id: string;
  post_excerpt: string | null;
  created_at: number;
}

async function fetchRecentActivity(): Promise<ActivityItem[]> {
  try {
    // Get recent posts
    const recentPosts = await db.execute({
      sql: `
        SELECT
          'post' as type,
          p.id,
          u.name as user_name,
          u.image as user_image,
          p.id as post_id,
          COALESCE(p.content, p.ai_response_excerpt) as post_excerpt,
          p.created_at
        FROM farm_posts p
        JOIN users u ON p.author_id = u.id
        WHERE p.is_published = 1
        ORDER BY p.created_at DESC
        LIMIT 5
      `,
      args: [],
    });

    // Get recent comments
    const recentComments = await db.execute({
      sql: `
        SELECT
          'comment' as type,
          c.id,
          u.name as user_name,
          u.image as user_image,
          c.post_id,
          c.content as post_excerpt,
          c.created_at
        FROM post_comments c
        JOIN users u ON c.author_id = u.id
        WHERE c.is_deleted = 0
        ORDER BY c.created_at DESC
        LIMIT 5
      `,
      args: [],
    });

    // Combine and sort activities
    const allActivities = [
      ...recentPosts.rows.map(row => row as unknown as ActivityItem),
      ...recentComments.rows.map(row => row as unknown as ActivityItem),
    ].sort((a, b) => b.created_at - a.created_at).slice(0, 8);

    return allActivities;
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    return [];
  }
}

export async function RecentActivity() {
  const activities = await fetchRecentActivity();

  if (activities.length === 0) {
    return null;
  }

  const formatRelativeTime = (timestamp: number) => {
    const seconds = Math.floor(Date.now() / 1000 - timestamp);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
    return `${Math.floor(seconds / 604800)}w`;
  };

  const getActivityIcon = (type: string) => {
    if (type === 'comment') return <MessageCircle className="w-3 h-3" />;
    if (type === 'reaction') return <Heart className="w-3 h-3" />;
    return <Activity className="w-3 h-3" />;
  };

  const getActivityText = (activity: ActivityItem) => {
    if (activity.type === 'comment') return 'commented';
    if (activity.type === 'reaction') return 'reacted';
    return 'posted';
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {activities.map((activity) => (
          <Link
            key={activity.id}
            href={`/gallery?post=${activity.post_id}`}
            className="flex items-start gap-3 hover:bg-accent/50 -mx-2 px-2 py-1.5 rounded-lg transition-colors"
          >
            <Avatar className="w-8 h-8">
              <AvatarImage src={activity.user_image || undefined} />
              <AvatarFallback>{activity.user_name[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm">
                <span className="font-medium">{activity.user_name}</span>{' '}
                <span className="text-muted-foreground">{getActivityText(activity)}</span>
              </p>
              {activity.post_excerpt && (
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                  {activity.post_excerpt}
                </p>
              )}
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground">
                  {formatRelativeTime(activity.created_at)}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
