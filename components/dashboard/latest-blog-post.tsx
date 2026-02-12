import { db } from '@/lib/db';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Calendar, Clock } from 'lucide-react';

async function fetchLatestBlogPost() {
  try {
    // Get the most recent blog post
    const result = await db.execute({
      sql: `
        SELECT
          id,
          slug,
          title,
          excerpt,
          read_time_minutes,
          published_at,
          author_name
        FROM blog_posts
        WHERE is_published = 1
        ORDER BY published_at DESC
        LIMIT 1
      `,
      args: [],
    });

    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error('Error fetching latest blog post:', error);
    return null;
  }
}

export async function LatestBlogPost() {
  const post = await fetchLatestBlogPost();

  if (!post) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-muted-foreground">No blog posts yet</p>
        </CardContent>
      </Card>
    );
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <Card className="overflow-hidden group hover:shadow-md transition-shadow">
      <div className="h-32 bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-background" />
      <CardHeader className="-mt-12 relative z-10">
        <div className="w-12 h-12 rounded-full bg-amber-500/10 border-4 border-card flex items-center justify-center mb-3">
          <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
        <CardTitle className="text-lg line-clamp-2 group-hover:text-primary transition-colors">
          {(post as any).title}
        </CardTitle>
        <CardDescription className="line-clamp-2">
          {(post as any).excerpt}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>{formatDate((post as any).published_at)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{(post as any).read_time_minutes} min read</span>
          </div>
        </div>
        <Button asChild variant="outline" size="sm" className="w-full">
          <Link href={`/learn/blog/${(post as any).slug}`}>
            Read Article
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
