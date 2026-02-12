import { db } from '@/lib/db';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, TrendingUp } from 'lucide-react';

interface TopContributor {
  id: string;
  name: string;
  image: string | null;
  total_posts: number;
  total_reactions: number;
  total_comments: number;
}

async function fetchTopContributors(): Promise<TopContributor[]> {
  try {
    const result = await db.execute({
      sql: `
        SELECT
          u.id,
          u.name,
          u.image,
          COUNT(DISTINCT p.id) as total_posts,
          COALESCE(SUM(p.reaction_count), 0) as total_reactions,
          COALESCE(SUM(p.comment_count), 0) as total_comments
        FROM users u
        JOIN farm_posts p ON p.author_id = u.id
        WHERE p.is_published = 1
        GROUP BY u.id, u.name, u.image
        ORDER BY (total_posts + (total_reactions * 2) + total_comments) DESC
        LIMIT 5
      `,
      args: [],
    });

    return result.rows as unknown as TopContributor[];
  } catch (error) {
    console.error('Error fetching top contributors:', error);
    return [];
  }
}

export async function TopContributors() {
  const contributors = await fetchTopContributors();

  if (contributors.length === 0) {
    return null;
  }

  const getRankIcon = (index: number) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `#${index + 1}`;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-500" />
          Top Contributors
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {contributors.map((contributor, index) => (
          <div key={contributor.id} className="flex items-center gap-3">
            <div className="w-6 text-center text-sm font-bold">
              {getRankIcon(index)}
            </div>
            <Link href={`/profile/${contributor.id}`}>
              <Avatar className="w-9 h-9">
                <AvatarImage src={contributor.image || undefined} />
                <AvatarFallback>{contributor.name[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
            </Link>
            <div className="flex-1 min-w-0">
              <Link
                href={`/profile/${contributor.id}`}
                className="font-medium text-sm hover:underline line-clamp-1"
              >
                {contributor.name}
              </Link>
              <p className="text-xs text-muted-foreground">
                {contributor.total_posts} posts · {contributor.total_reactions} reactions
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
