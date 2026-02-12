import { db } from '@/lib/db';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen, Clock, TrendingUp, Zap, Eye, FileText, BarChart3, Timer, Sparkles } from 'lucide-react';

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
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Hero Section */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-30">
        <div className="container mx-auto p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500/20 via-purple-500/10 to-background flex items-center justify-center border-2 border-purple-500/20">
                <BookOpen className="w-8 h-8 text-purple-500" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-serif font-bold">
                  Permaculture Blog
                </h1>
                <p className="text-sm text-muted-foreground">
                  {posts.length} articles • Earn XP by reading
                </p>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-3 mt-6">
            <Card className="border-2 hover:border-purple-500/30 transition-all">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-purple-500" />
                  </div>
                  <div>
                    <div className="text-xl md:text-2xl font-bold">{stats.total_posts || 0}</div>
                    <p className="text-xs text-muted-foreground">Articles</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-blue-500/30 transition-all">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Eye className="w-4 h-4 text-blue-500" />
                  </div>
                  <div>
                    <div className="text-xl md:text-2xl font-bold">{stats.total_views || 0}</div>
                    <p className="text-xs text-muted-foreground">Reads</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-amber-500/30 transition-all">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-amber-500" />
                  </div>
                  <div>
                    <div className="text-xl md:text-2xl font-bold">
                      {Math.round(stats.avg_read_time || 0)}m
                    </div>
                    <p className="text-xs text-muted-foreground">Avg Time</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Popular Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {tags.map((tag: any) => (
                <Badge key={tag.id} variant="secondary" className="text-xs hover:bg-primary/10 cursor-pointer transition-colors">
                  {tag.name} ({tag.post_count})
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto p-4 md:p-6">
        {posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-purple-500/10 flex items-center justify-center mb-4">
              <BookOpen className="w-8 h-8 text-purple-500" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No blog posts yet</h3>
            <p className="text-muted-foreground">Check back soon for new content!</p>
          </div>
        ) : (
          <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <Link key={post.id} href={`/learn/blog/${post.slug}`}>
                <Card className="h-full hover:shadow-xl transition-all duration-300 cursor-pointer group hover:scale-[1.02] border-2 hover:border-primary/50 overflow-hidden">
                  {/* Cover Image or Gradient Header */}
                  {post.cover_image_url ? (
                    <div className="w-full h-48 overflow-hidden bg-muted relative">
                      <img
                        src={post.cover_image_url}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {post.is_ai_generated === 1 && (
                        <div className="absolute top-3 right-3">
                          <Badge className="bg-purple-600 hover:bg-purple-700 shadow-lg">
                            <Zap className="h-3 w-3 mr-1" />
                            AI
                          </Badge>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="h-32 bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-background relative overflow-hidden border-b-2">
                      <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent" />
                      {post.is_ai_generated === 1 && (
                        <div className="absolute top-3 right-3">
                          <Badge className="bg-purple-600 hover:bg-purple-700 shadow-lg">
                            <Zap className="h-3 w-3 mr-1" />
                            AI
                          </Badge>
                        </div>
                      )}
                      <div className="absolute bottom-3 left-3 text-3xl">
                        📚
                      </div>
                    </div>
                  )}

                  <CardHeader className="pb-3">
                    <CardTitle className="text-base line-clamp-2 group-hover:text-primary transition-colors">
                      {post.title}
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {post.excerpt}
                    </p>

                    {/* Tags */}
                    {post.tags && (
                      <div className="flex flex-wrap gap-1">
                        {post.tags
                          .split(',')
                          .slice(0, 3)
                          .map((tag: string, i: number) => (
                            <Badge key={i} variant="outline" className="text-xs bg-muted/50">
                              {tag}
                            </Badge>
                          ))}
                      </div>
                    )}

                    {/* Footer Stats */}
                    <div className="pt-2 border-t">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {post.read_time_minutes}m
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {post.view_count || 0}
                          </span>
                        </div>
                        <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-600 border-green-500/20">
                          <Sparkles className="h-3 w-3 mr-1" />
                          +{post.xp_reward} XP
                        </Badge>
                      </div>
                    </div>

                    {/* Read hint */}
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground group-hover:text-primary transition-colors">
                        Tap to read →
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
