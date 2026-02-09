import { requireAdmin } from '@/lib/auth/admin';
import { db } from '@/lib/db';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, TrendingUp, Eye, Zap, Plus } from 'lucide-react';
import { BlogPostActions } from '@/components/admin/blog-post-actions';
import { GenerateBlogButton } from '@/components/admin/generate-blog-button';

export default async function AdminBlogPage() {
  await requireAdmin();

  // Get blog stats
  const statsResult = await db.execute(`
    SELECT
      COUNT(*) as total_posts,
      SUM(CASE WHEN is_published = 1 THEN 1 ELSE 0 END) as published_posts,
      SUM(CASE WHEN is_ai_generated = 1 THEN 1 ELSE 0 END) as ai_generated,
      SUM(view_count) as total_views,
      SUM(read_count) as total_reads
    FROM blog_posts
  `);
  const stats = statsResult.rows[0] as any;

  // Get recent posts
  const postsResult = await db.execute(`
    SELECT
      bp.*,
      u.name as author_name,
      GROUP_CONCAT(bt.name) as tags
    FROM blog_posts bp
    LEFT JOIN users u ON bp.author_id = u.id
    LEFT JOIN blog_post_tags bpt ON bp.id = bpt.blog_post_id
    LEFT JOIN blog_tags bt ON bpt.tag_id = bt.id
    GROUP BY bp.id
    ORDER BY bp.created_at DESC
    LIMIT 50
  `);
  const posts = postsResult.rows as any[];

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Blog Management</h1>
          <p className="text-muted-foreground">
            AI-powered content system • 3 posts/day automated
          </p>
        </div>
        <div className="flex gap-2">
          <GenerateBlogButton />
          <Link href="/admin/blog/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Post
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_posts}</div>
            <p className="text-xs text-muted-foreground">
              {stats.published_posts} published
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Generated</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.ai_generated}</div>
            <p className="text-xs text-muted-foreground">Automated content</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_views || 0}</div>
            <p className="text-xs text-muted-foreground">Pageviews</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Reads</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_reads || 0}</div>
            <p className="text-xs text-muted-foreground">Full reads</p>
          </CardContent>
        </Card>
      </div>

      {/* Posts Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Blog Posts ({posts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {posts.map((post) => (
              <div
                key={post.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/learn/blog/${post.slug}`}
                      className="font-medium hover:underline"
                      target="_blank"
                    >
                      {post.title}
                    </Link>
                    {post.is_published === 1 ? (
                      <Badge variant="default">Published</Badge>
                    ) : (
                      <Badge variant="secondary">Draft</Badge>
                    )}
                    {post.is_ai_generated === 1 && (
                      <Badge variant="outline">
                        <Zap className="h-3 w-3 mr-1" />
                        AI
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                    <span>{post.read_time_minutes} min read</span>
                    <span>{post.view_count || 0} views</span>
                    <span>{post.read_count || 0} reads</span>
                    {post.tags && (
                      <span className="text-xs">
                        Tags: {post.tags.split(',').slice(0, 3).join(', ')}
                      </span>
                    )}
                  </div>
                </div>
                <BlogPostActions postId={post.id} slug={post.slug} />
              </div>
            ))}
            {posts.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                No blog posts yet. Generate your first post!
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Automation Info */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Automated Content System
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <strong>Schedule:</strong> 3 posts per day (every 6 hours)
          </p>
          <p>
            <strong>Next Generation:</strong> Automatic via cron job
          </p>
          <p>
            <strong>AI Model:</strong> Claude Opus 4 (Premium)
          </p>
          <p>
            <strong>Features:</strong> SEO optimization, trending topics, auto-tagging
          </p>
          <p className="text-xs text-muted-foreground mt-4">
            Set up cron job: POST /api/blog/auto-generate every 6 hours
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
