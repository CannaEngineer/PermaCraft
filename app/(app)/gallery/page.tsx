import { requireAuth } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { GlobalFeedClient } from "@/components/feed/global-feed-client";

export default async function GalleryPage() {
  const session = await requireAuth();

  // Fetch initial global feed
  const feedResult = await db.execute({
    sql: `SELECT p.*,
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
          ORDER BY p.created_at DESC
          LIMIT 21`,
    args: [session.user.id],
  });

  const posts = feedResult.rows.map((post: any) => {
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

  const initialFeedData = {
    posts: posts.slice(0, 20),
    next_cursor: posts.length === 21 ? posts[19].id : null,
    has_more: posts.length === 21,
  };

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Community Gallery</h1>
          <p className="text-muted-foreground mt-2">
            Discover farms and permaculture designs from the community
          </p>
        </div>

        <GlobalFeedClient initialData={initialFeedData} />
      </div>
    </div>
  );
}
