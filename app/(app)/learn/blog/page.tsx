import { db } from '@/lib/db';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen, Clock, TrendingUp, Zap, Eye } from 'lucide-react';

export const metadata = {
  title: 'Blog - Permaculture.Studio',
  description: 'Learn permaculture through expert articles and guides',
};

export default async function BlogPage() {
  // Get published blog posts with tags
  const postsResult = await db.execute(`
    SELECT
      bp.*,
      u.name as author_name,
      GROUP_CONCAT(bt.name) as tags
    FROM blog_posts bp
    LEFT JOIN users u ON bp.author_id = u.id
    LEFT JOIN blog_post_tags bpt ON bp.id = bpt.blog_post_id
    LEFT JOIN blog_tags bt ON bpt.tag_id = bt.id
    WHERE bp.is_published = 1
    GROUP BY bp.id
    ORDER BY bp.published_at DESC
    LIMIT 50
  `);
  const posts = postsResult.rows as any[];

  // Get popular tags
  const tagsResult = await db.execute(`
    SELECT
      bt.*,
      COUNT(bpt.blog_post_id) as post_count
    FROM blog_tags bt
    LEFT JOIN blog_post_tags bpt ON bt.id = bpt.tag_id
    LEFT JOIN blog_posts bp ON bpt.blog_post_id = bp.id AND bp.is_published = 1
    GROUP BY bt.id
    HAVING post_count > 0
    ORDER BY post_count DESC
    LIMIT 10
  `);
  const tags = tagsResult.rows as any[];

  // Get blog stats
  const statsResult = await db.execute(`
    SELECT
      COUNT(*) as total_posts,
      SUM(view_count) as total_views,
      AVG(read_time_minutes) as avg_read_time
    FROM blog_posts
    WHERE is_published = 1
  `);
  const stats = statsResult.rows[0] as any;

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-2">
          <BookOpen className="h-8 w-8 text-primary" />
          <h1 className="text-4xl font-bold">Permaculture.Studio Blog</h1>
        </div>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Expert permaculture guides, seasonal tips, and sustainable living insights.
          Earn XP by reading articles!
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3 max-w-3xl mx-auto">
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold">{stats.total_posts || 0}</div>
            <p className="text-sm text-muted-foreground">Articles</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold">{stats.total_views || 0}</div>
            <p className="text-sm text-muted-foreground">Total Reads</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold">
              {Math.round(stats.avg_read_time || 0)} min
            </div>
            <p className="text-sm text-muted-foreground">Avg Read Time</p>
          </CardContent>
        </Card>
      </div>

      {/* Popular Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center">
          {tags.map((tag: any) => (
            <Badge key={tag.id} variant="secondary" className="text-sm">
              {tag.name} ({tag.post_count})
            </Badge>
          ))}
        </div>
      )}

      {/* Blog Posts */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <Link key={post.id} href={`/learn/blog/${post.slug}`}>
            <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer overflow-hidden">
              {post.cover_image_url && (
                <div className="w-full h-48 overflow-hidden bg-muted">
                  <img
                    src={post.cover_image_url}
                    alt={post.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg line-clamp-2">
                    {post.title}
                  </CardTitle>
                  {post.is_ai_generated === 1 && (
                    <Badge variant="outline" className="shrink-0">
                      <Zap className="h-3 w-3" />
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {post.excerpt}
                </p>

                <div className="flex flex-wrap gap-1">
                  {post.tags &&
                    post.tags
                      .split(',')
                      .slice(0, 3)
                      .map((tag: string, i: number) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {post.read_time_minutes} min
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {post.view_count || 0}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    +{post.xp_reward} XP
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {posts.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">No blog posts yet</h3>
          <p className="text-muted-foreground">Check back soon for new content!</p>
        </div>
      )}
    </div>
  );
}
