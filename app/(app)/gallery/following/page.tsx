import { requireAuth } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { GalleryLayoutWrapper } from '@/components/feed/gallery-layout-wrapper';
import Link from 'next/link';
import { ChevronLeft, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
  author: { id: string; name: string; image: string | null };
  reaction_count: number;
  comment_count: number;
  view_count: number;
  created_at: number;
  user_reaction: string | null;
  is_bookmarked?: boolean;
}

interface FeedData {
  posts: Post[];
  next_cursor: string | null;
  has_more: boolean;
}

async function fetchFollowingFeed(userId: string): Promise<FeedData> {
  const limit = 20;
  const args: any[] = [userId, userId, userId, userId, limit + 1];

  const sql = `
    SELECT p.*,
           u.name as author_name,
           u.image as author_image,
           f.name as farm_name,
           f.description as farm_description,
           ai.screenshot_data as ai_screenshot,
           (SELECT reaction_type FROM post_reactions
            WHERE post_id = p.id AND user_id = ?) as user_reaction,
           (SELECT 1 FROM saved_posts
            WHERE post_id = p.id AND user_id = ?) as is_bookmarked
    FROM farm_posts p
    JOIN users u ON p.author_id = u.id
    JOIN farms f ON p.farm_id = f.id
    LEFT JOIN ai_analyses ai ON p.ai_analysis_id = ai.id
    WHERE f.is_public = 1 AND p.is_published = 1
      AND (
        EXISTS (SELECT 1 FROM user_follows uf WHERE uf.follower_id = ? AND uf.followed_id = p.author_id)
        OR EXISTS (SELECT 1 FROM farm_follows ff WHERE ff.follower_user_id = ? AND ff.followed_farm_id = p.farm_id)
      )
    ORDER BY p.created_at DESC
    LIMIT ?
  `;

  const postsResult = await db.execute({ sql, args });
  const hasMore = postsResult.rows.length > limit;
  const posts = postsResult.rows.slice(0, limit);

  const formattedPosts = posts.map((post: any) => {
    let aiScreenshot = null;
    if (post.ai_screenshot) {
      try {
        const urls = JSON.parse(post.ai_screenshot);
        aiScreenshot = Array.isArray(urls) && urls.length > 0 ? urls[0] : null;
      } catch {
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
    };
  });

  return {
    posts: formattedPosts,
    next_cursor: hasMore ? formattedPosts[formattedPosts.length - 1].id : null,
    has_more: hasMore,
  };
}

export default async function FollowingFeedPage() {
  const session = await requireAuth();
  const initialData = await fetchFollowingFeed(session.user.id);

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <Link
          href="/gallery"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Community
        </Link>
        <h1 className="text-3xl font-bold">Following Feed</h1>
        <p className="text-muted-foreground mt-2">
          Posts from people and farms you follow
        </p>
      </div>

      <div className="max-w-2xl mx-auto space-y-6">
        {initialData.posts.length === 0 ? (
          <div className="text-center py-16">
            <UserPlus className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Your feed is empty</h2>
            <p className="text-muted-foreground mb-4">
              Follow users and farms to see their posts here.
            </p>
            <Link href="/gallery">
              <Button>Explore Community</Button>
            </Link>
          </div>
        ) : (
          <GalleryLayoutWrapper
            initialData={initialData}
            apiEndpoint="/api/feed/following"
            currentUserId={session.user.id}
          />
        )}
      </div>
    </div>
  );
}
