import { db } from '@/lib/db';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Heart, MessageCircle, Sparkles } from 'lucide-react';

interface RecentCommunityPostsProps {
  currentUserId: string;
}

async function fetchRecentPosts(currentUserId: string) {
  try {
    const result = await db.execute({
      sql: `
        SELECT
          p.id,
          p.post_type,
          p.content,
          p.ai_response_excerpt,
          p.reaction_count,
          p.comment_count,
          p.created_at,
          u.name as author_name,
          u.image as author_image,
          f.name as farm_name
        FROM farm_posts p
        JOIN users u ON p.author_id = u.id
        JOIN farms f ON p.farm_id = f.id
        WHERE p.is_published = 1
          AND f.is_public = 1
          AND p.author_id != ?
        ORDER BY p.created_at DESC
        LIMIT 3
      `,
      args: [currentUserId],
    });

    return result.rows;
  } catch (error) {
    console.error('Error fetching recent posts:', error);
    return [];
  }
}

export async function RecentCommunityPosts({ currentUserId }: RecentCommunityPostsProps) {
  const posts = await fetchRecentPosts(currentUserId);

  if (posts.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <p className="text-sm">No recent community posts</p>
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
      {posts.map((post: any) => (
        <Link key={post.id} href={`/gallery?post=${post.id}`}>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={post.author_image || undefined} />
                  <AvatarFallback>{post.author_name[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-sm">{post.author_name}</p>
                    {post.post_type === 'ai_insight' && (
                      <Badge variant="secondary" className="gap-1 text-xs bg-purple-500/10 text-purple-600">
                        <Sparkles className="w-3 h-3" />
                        AI
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    {post.farm_name} · {formatRelativeTime(post.created_at)}
                  </p>
                  <p className="text-sm line-clamp-2">
                    {post.content || post.ai_response_excerpt || 'Shared a post'}
                  </p>
                  <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Heart className="w-3 h-3" />
                      <span>{post.reaction_count}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageCircle className="w-3 h-3" />
                      <span>{post.comment_count}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
