import { db } from '@/lib/db';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UserPlus } from 'lucide-react';
import { FollowUserButton } from '@/components/profile/follow-user-button';

interface SuggestedUser {
  id: string;
  name: string;
  image: string | null;
  farm_count: number;
  post_count: number;
  climate_zone: string | null;
}

async function fetchSuggestedUsers(currentUserId: string): Promise<SuggestedUser[]> {
  try {
    // Get users with public farms, excluding current user and already-followed users
    const result = await db.execute({
      sql: `
        SELECT
          u.id,
          u.name,
          u.image,
          COUNT(DISTINCT f.id) as farm_count,
          COUNT(DISTINCT p.id) as post_count,
          f.climate_zone
        FROM users u
        JOIN farms f ON f.user_id = u.id
        LEFT JOIN farm_posts p ON p.farm_id = f.id AND p.is_published = 1
        WHERE f.is_public = 1
          AND u.id != ?
          AND u.id NOT IN (SELECT followed_id FROM user_follows WHERE follower_id = ?)
        GROUP BY u.id, u.name, u.image, f.climate_zone
        HAVING post_count > 0
        ORDER BY post_count DESC, farm_count DESC
        LIMIT 5
      `,
      args: [currentUserId, currentUserId],
    });

    return result.rows as unknown as SuggestedUser[];
  } catch (error) {
    console.error('Error fetching suggested users:', error);
    return [];
  }
}

export async function WhoToFollow({ currentUserId }: { currentUserId: string }) {
  const users = await fetchSuggestedUsers(currentUserId);

  if (users.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <UserPlus className="w-4 h-4" />
          Who to Follow
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {users.map((user) => (
          <div key={user.id} className="flex items-start gap-3">
            <Link href={`/profile/${user.id}`}>
              <Avatar className="w-10 h-10">
                <AvatarImage src={user.image || undefined} />
                <AvatarFallback>{user.name[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
            </Link>
            <div className="flex-1 min-w-0">
              <Link
                href={`/profile/${user.id}`}
                className="font-medium text-sm hover:underline line-clamp-1"
              >
                {user.name}
              </Link>
              <div className="flex items-center gap-2 mt-1">
                {user.climate_zone && (
                  <Badge variant="secondary" className="text-xs">
                    {user.climate_zone}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {user.farm_count} farm{user.farm_count !== 1 ? 's' : ''} · {user.post_count} posts
              </p>
            </div>
            <FollowUserButton
              userId={user.id}
              initialFollowing={false}
              size="sm"
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
