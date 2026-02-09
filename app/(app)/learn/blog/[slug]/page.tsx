import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  Clock,
  Eye,
  User,
  Calendar,
  Zap,
  Award,
  TrendingUp,
} from 'lucide-react';
import { BlogReadTracker } from '@/components/blog/blog-read-tracker';
import ReactMarkdown from 'react-markdown';

interface PageProps {
  params: { slug: string };
}

export async function generateMetadata({ params }: PageProps) {
  const postResult = await db.execute({
    sql: 'SELECT title, meta_description FROM blog_posts WHERE slug = ? AND is_published = 1',
    args: [params.slug],
  });

  const post = postResult.rows[0] as any;
  if (!post) return { title: 'Post Not Found' };

  return {
    title: `${post.title} - PermaCraft Blog`,
    description: post.meta_description,
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  // Get current user (optional - can read without login)
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const userId = session?.user?.id;

  // Get blog post with author info
  const postResult = await db.execute({
    sql: `
      SELECT
        bp.*,
        u.name as author_name,
        GROUP_CONCAT(bt.name) as tags
      FROM blog_posts bp
      LEFT JOIN users u ON bp.author_id = u.id
      LEFT JOIN blog_post_tags bpt ON bp.id = bpt.blog_post_id
      LEFT JOIN blog_tags bt ON bpt.tag_id = bt.id
      WHERE bp.slug = ? AND bp.is_published = 1
      GROUP BY bp.id
    `,
    args: [params.slug],
  });

  if (postResult.rows.length === 0) {
    notFound();
  }

  const post = postResult.rows[0] as any;

  // Increment view count
  await db.execute({
    sql: 'UPDATE blog_posts SET view_count = view_count + 1 WHERE id = ?',
    args: [post.id],
  });

  // Check if user already read this (for XP eligibility)
  let alreadyRead = false;
  if (userId) {
    const readResult = await db.execute({
      sql: 'SELECT completed_at FROM blog_post_reads WHERE user_id = ? AND blog_post_id = ?',
      args: [userId, post.id],
    });
    alreadyRead = readResult.rows.length > 0 && readResult.rows[0].completed_at != null;
  }

  // Get related posts (same tags)
  const relatedResult = await db.execute({
    sql: `
      SELECT DISTINCT bp.*, COUNT(*) as relevance
      FROM blog_posts bp
      JOIN blog_post_tags bpt ON bp.id = bpt.blog_post_id
      JOIN blog_tags bt ON bpt.tag_id = bt.id
      WHERE bt.name IN (${post.tags ? post.tags.split(',').map(() => '?').join(',') : "''"})
        AND bp.id != ?
        AND bp.is_published = 1
      GROUP BY bp.id
      ORDER BY relevance DESC, bp.published_at DESC
      LIMIT 3
    `,
    args: [...(post.tags ? post.tags.split(',') : []), post.id],
  });
  const relatedPosts = relatedResult.rows as any[];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-muted/30">
        <div className="container mx-auto py-6">
          <Link href="/learn/blog">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Blog
            </Button>
          </Link>

          <div className="space-y-4 max-w-4xl">
            <h1 className="text-4xl font-bold leading-tight">{post.title}</h1>

            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <User className="h-4 w-4" />
                <span>{post.author_name || 'PermaCraft Team'}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>
                  {new Date(post.published_at * 1000).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{post.read_time_minutes} min read</span>
              </div>
              <div className="flex items-center gap-1">
                <Eye className="h-4 w-4" />
                <span>{post.view_count} views</span>
              </div>
              {post.is_ai_generated === 1 && (
                <Badge variant="outline">
                  <Zap className="h-3 w-3 mr-1" />
                  AI-Generated
                </Badge>
              )}
            </div>

            {/* XP Reward Badge */}
            {userId && !alreadyRead && (
              <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                <Award className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">
                  Complete this article to earn <strong>+{post.xp_reward} XP</strong>
                </span>
              </div>
            )}

            {alreadyRead && (
              <div className="flex items-center gap-2 p-3 bg-muted border rounded-lg">
                <TrendingUp className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  You've already earned XP for this article
                </span>
              </div>
            )}

            {/* Tags */}
            {post.tags && (
              <div className="flex flex-wrap gap-2">
                {post.tags.split(',').map((tag: string, i: number) => (
                  <Badge key={i} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto py-8">
        <div className="grid lg:grid-cols-[1fr_300px] gap-8">
          {/* Main Content */}
          <article className="max-w-4xl">
            {post.excerpt && (
              <div className="text-xl text-muted-foreground mb-8 leading-relaxed">
                {post.excerpt}
              </div>
            )}

            <Separator className="mb-8" />

            <div className="prose prose-slate dark:prose-invert max-w-none">
              <ReactMarkdown>{post.content}</ReactMarkdown>
            </div>

            <Separator className="my-8" />

            {/* Author Card */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{post.author_name || 'PermaCraft Team'}</p>
                    <p className="text-sm text-muted-foreground">
                      Expert in permaculture and sustainable living
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </article>

          {/* Sidebar */}
          <aside className="space-y-6">
            {/* Related Posts */}
            {relatedPosts.length > 0 && (
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <h3 className="font-semibold">Related Articles</h3>
                  <div className="space-y-3">
                    {relatedPosts.map((related: any) => (
                      <Link
                        key={related.id}
                        href={`/learn/blog/${related.slug}`}
                        className="block group"
                      >
                        <p className="font-medium text-sm group-hover:text-primary transition-colors line-clamp-2">
                          {related.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {related.read_time_minutes} min read • +{related.xp_reward} XP
                        </p>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* CTA Card */}
            {!userId && (
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="pt-6 space-y-3">
                  <h3 className="font-semibold">Earn XP While Learning</h3>
                  <p className="text-sm text-muted-foreground">
                    Create an account to earn experience points and badges for reading
                    articles!
                  </p>
                  <Link href="/register">
                    <Button className="w-full">
                      <Award className="h-4 w-4 mr-2" />
                      Sign Up Free
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </aside>
        </div>
      </div>

      {/* Read Tracker - tracks scroll and awards XP */}
      {userId && !alreadyRead && (
        <BlogReadTracker
          userId={userId}
          postId={post.id}
          xpReward={post.xp_reward}
          readTimeMinutes={post.read_time_minutes}
        />
      )}
    </div>
  );
}
