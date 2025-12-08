import { requireAuth } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { GlobalFeedClient } from '@/components/feed/global-feed-client';
import { UniversalSearch } from '@/components/search/universal-search';
import { PostTypeTabs } from '@/components/feed/post-type-tabs';
import { TrendingHashtags } from '@/components/feed/trending-hashtags';

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
}

interface FeedData {
  posts: Post[];
  next_cursor: string | null;
  has_more: boolean;
}

interface PageProps {
  searchParams: Promise<{ type?: string; hashtag?: string }>;
}

async function fetchInitialFeed(userId: string, type?: string, hashtag?: string): Promise<FeedData> {
  const limit = 20;
  const args: any[] = [userId];

  let sql = `
    SELECT p.*,
           u.name as author_name,
           u.image as author_image,
           f.name as farm_name,
           f.description as farm_description,
           ai.screenshot_data as ai_screenshot,
           (SELECT reaction_type FROM post_reactions
            WHERE post_id = p.id AND user_id = ?) as user_reaction
    FROM farm_posts p
    JOIN users u ON p.author_id = u.id
    JOIN farms f ON p.farm_id = f.id
    LEFT JOIN ai_analyses ai ON p.ai_analysis_id = ai.id
    WHERE f.is_public = 1 AND p.is_published = 1
  `;

  // Filter by post type
  if (type && type !== 'all') {
    sql += ` AND p.post_type = ?`;
    args.push(type);
  }

  // Filter by hashtag
  if (hashtag) {
    sql += ` AND EXISTS (
      SELECT 1 FROM json_each(p.hashtags)
      WHERE json_each.value = ?
    )`;
    args.push(hashtag);
  }

  sql += ` ORDER BY p.created_at DESC LIMIT ?`;
  args.push(limit + 1);

  const postsResult = await db.execute({ sql, args });
  const hasMore = postsResult.rows.length > limit;
  const posts = postsResult.rows.slice(0, limit);

  const formattedPosts = posts.map((post: any) => {
    // Parse ai_screenshot JSON array and get first URL
    let aiScreenshot = null;
    if (post.ai_screenshot) {
      try {
        const urls = JSON.parse(post.ai_screenshot);
        aiScreenshot = Array.isArray(urls) && urls.length > 0 ? urls[0] : null;
      } catch (e) {
        // If not JSON, use as-is (fallback for base64)
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
    };
  });

  return {
    posts: formattedPosts,
    next_cursor: hasMore ? formattedPosts[formattedPosts.length - 1].id : null,
    has_more: hasMore,
  };
}

export default async function GalleryPage({ searchParams }: PageProps) {
  const session = await requireAuth();
  const params = await searchParams;
  const type = params.type || 'all';
  const hashtag = params.hashtag;

  const initialData = await fetchInitialFeed(session.user.id, type, hashtag);

  return (
    <div className="container mx-auto py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold">Community Gallery</h1>
        <p className="text-muted-foreground mt-2">
          {hashtag ? `Posts tagged with #${hashtag}` : 'Discover farms and permaculture designs from the community'}
        </p>
      </div>

      {/* Two Column Layout: Feed + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
        {/* Main Feed Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Search Community Content */}
          <div>
            <UniversalSearch
              context="community"
              placeholder="Search public farms and posts..."
              className="w-full"
            />
          </div>

          {/* Post Type Filter Tabs */}
          <PostTypeTabs />

          {/* Feed */}
          <GlobalFeedClient initialData={initialData} filterType={type} filterHashtag={hashtag} />
        </div>

        {/* Sidebar Column */}
        <aside className="space-y-6">
          <TrendingHashtags />
        </aside>
      </div>
    </div>
  );
}
