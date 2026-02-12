import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { GalleryLayoutWrapper } from '@/components/feed/gallery-layout-wrapper';
import { UniversalSearch } from '@/components/search/universal-search';
import { TrendingHashtags } from '@/components/feed/trending-hashtags';
import { TopContributors } from '@/components/feed/top-contributors';
import Link from 'next/link';
import { ArrowLeft, TrendingUp, Flame } from 'lucide-react';

interface Post {
  id: string;
  farm_id: string;
  farm_name: string;
  farm_description: string | null;
  type: 'text' | 'photo' | 'ai_insight';
  content: string | null;
  media_urls: string[] | null;
  ai_response_excerpt: string | null;
  ai_screenshot: string | null;
  tagged_zones: string[] | null;
  hashtags: string[] | null;
  author: {
    id: string;
    name: string;
    image: string | null;
  };
  reaction_count: number;
  comment_count: number;
  view_count: number;
  created_at: number;
  user_reaction: string | null;
  trending_score: number;
}

interface FeedData {
  posts: Post[];
  next_cursor: string | null;
  has_more: boolean;
}

async function fetchTrendingPosts(userId: string | null): Promise<FeedData> {
  const limit = 20;
  const args: any[] = userId ? [userId, userId] : [];

  // Calculate trending score based on recent engagement
  // Posts from last 7 days, weighted by reactions, comments, and views
  let sql = userId
    ? `
    SELECT p.*,
           u.name as author_name,
           u.image as author_image,
           f.name as farm_name,
           f.description as farm_description,
           ai.screenshot_data as ai_screenshot,
           (SELECT reaction_type FROM post_reactions
            WHERE post_id = p.id AND user_id = ?) as user_reaction,
           (SELECT 1 FROM saved_posts
            WHERE post_id = p.id AND user_id = ?) as is_bookmarked,
           (p.reaction_count * 10 + p.comment_count * 5 + p.view_count) as trending_score
    FROM farm_posts p
    JOIN users u ON p.author_id = u.id
    JOIN farms f ON p.farm_id = f.id
    LEFT JOIN ai_analyses ai ON p.ai_analysis_id = ai.id
    WHERE f.is_public = 1
      AND p.is_published = 1
      AND p.created_at > (unixepoch() - 604800)
  `
    : `
    SELECT p.*,
           u.name as author_name,
           u.image as author_image,
           f.name as farm_name,
           f.description as farm_description,
           ai.screenshot_data as ai_screenshot,
           NULL as user_reaction,
           NULL as is_bookmarked,
           (p.reaction_count * 10 + p.comment_count * 5 + p.view_count) as trending_score
    FROM farm_posts p
    JOIN users u ON p.author_id = u.id
    JOIN farms f ON p.farm_id = f.id
    LEFT JOIN ai_analyses ai ON p.ai_analysis_id = ai.id
    WHERE f.is_public = 1
      AND p.is_published = 1
      AND p.created_at > (unixepoch() - 604800)
  `;

  sql += ` ORDER BY trending_score DESC, p.created_at DESC LIMIT ?`;
  args.push(limit + 1);

  const postsResult = await db.execute({ sql, args });
  const hasMore = postsResult.rows.length > limit;
  const posts = postsResult.rows.slice(0, limit);

  const formattedPosts = posts.map((post: any) => {
    let aiScreenshot = null;
    if (post.ai_screenshot) {
      try {
        const urls = JSON.parse(post.ai_screenshot);
        aiScreenshot = Array.isArray(urls) && urls.length > 0 ? urls[0] : null;
      } catch (e) {
        aiScreenshot = post.ai_screenshot;
      }
    }

    return {
      id: post.id,
      farm_id: post.farm_id,
      farm_name: post.farm_name,
      farm_description: post.farm_description,
      type: post.post_type,
      content: post.content,
      media_urls: post.media_urls ? JSON.parse(post.media_urls) : null,
      ai_response_excerpt: post.ai_response_excerpt,
      ai_screenshot: aiScreenshot,
      tagged_zones: post.tagged_zones ? JSON.parse(post.tagged_zones) : null,
      hashtags: post.hashtags ? JSON.parse(post.hashtags) : null,
      author: {
        id: post.author_id,
        name: post.author_name,
        image: post.author_image,
      },
      reaction_count: post.reaction_count,
      comment_count: post.comment_count,
      view_count: post.view_count,
      created_at: post.created_at,
      user_reaction: post.user_reaction,
      is_bookmarked: post.is_bookmarked === 1,
      trending_score: post.trending_score,
    };
  });

  return {
    posts: formattedPosts,
    next_cursor: hasMore ? formattedPosts[formattedPosts.length - 1].id : null,
    has_more: hasMore,
  };
}

export default async function TrendingPage() {
  const session = await getSession();
  const initialData = await fetchTrendingPosts(session?.user.id || null);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto py-8">
          <div className="flex items-center gap-4 mb-6">
            <Link
              href="/gallery"
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Link>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center">
              <Flame className="w-6 h-6 text-orange-500" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                Trending Now
              </h1>
              <p className="text-muted-foreground mt-1">
                Most popular posts from the last 7 days
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {/* Main Feed */}
          <main className="lg:col-span-2 space-y-6">
            <div className="bg-card rounded-lg border p-4">
              <UniversalSearch
                context="community"
                placeholder="Search trending content..."
                className="w-full"
              />
            </div>

            <GalleryLayoutWrapper
              initialData={initialData}
              currentUserId={session?.user.id}
            />
          </main>

          {/* Sidebar */}
          <aside className="space-y-6">
            <div className="sticky top-6 space-y-6">
              <TopContributors />
              <TrendingHashtags />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
