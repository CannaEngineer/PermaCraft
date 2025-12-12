import { requireAuth } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { GalleryLayoutWrapper } from '@/components/feed/gallery-layout-wrapper';
import { UniversalSearch } from '@/components/search/universal-search';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

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
  is_bookmarked?: boolean;
}

interface FeedData {
  posts: Post[];
  next_cursor: string | null;
  has_more: boolean;
}

async function fetchSavedPosts(userId: string): Promise<FeedData> {
  const limit = 20;
  const args: any[] = [userId, userId];

  let sql = `
    SELECT p.*,
           u.name as author_name,
           u.image as author_image,
           f.name as farm_name,
           f.description as farm_description,
           ai.screenshot_data as ai_screenshot,
           (SELECT reaction_type FROM post_reactions
            WHERE post_id = p.id AND user_id = ?) as user_reaction,
           1 as is_bookmarked,
           sp.created_at as bookmark_created_at
    FROM saved_posts sp
    JOIN farm_posts p ON sp.post_id = p.id
    JOIN users u ON p.author_id = u.id
    JOIN farms f ON p.farm_id = f.id
    LEFT JOIN ai_analyses ai ON p.ai_analysis_id = ai.id
    WHERE sp.user_id = ? AND p.is_published = 1
    ORDER BY sp.created_at DESC
    LIMIT ?
  `;

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
      is_bookmarked: true,
    };
  });

  return {
    posts: formattedPosts,
    next_cursor: hasMore ? formattedPosts[formattedPosts.length - 1].id : null,
    has_more: hasMore,
  };
}

export default async function SavedPostsPage() {
  const session = await requireAuth();
  const initialData = await fetchSavedPosts(session.user.id);

  return (
    <div className="container mx-auto py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/gallery"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Gallery
        </Link>
        <h1 className="text-3xl font-bold">Saved Posts</h1>
        <p className="text-muted-foreground mt-2">
          Your collection of bookmarked farms and designs
        </p>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Search Saved Content */}
        <div>
          <UniversalSearch
            context="community"
            placeholder="Search your saved posts..."
            className="w-full"
          />
        </div>

        {/* Feed with Layout Toggle */}
        <GalleryLayoutWrapper
          initialData={initialData}
          apiEndpoint="/api/feed/saved"
          currentUserId={session.user.id}
        />
      </div>
    </div>
  );
}
