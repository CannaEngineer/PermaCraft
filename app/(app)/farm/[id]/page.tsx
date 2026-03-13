import { requireAuth } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import type { Farm, Zone, FarmStorySection } from "@/lib/db/schema";
import { FarmPublicView } from "@/components/farm/farm-public-view";
import { FarmStoryPage } from "@/components/story/farm-story-page";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ refresh?: string }>;
}

export default async function FarmPage({ params, searchParams }: PageProps) {
  const session = await requireAuth();
  const { id } = await params;
  const { refresh } = await searchParams;

  // First try to fetch farm as owner
  let farmResult = await db.execute({
    sql: "SELECT * FROM farms WHERE id = ? AND user_id = ?",
    args: [id, session.user.id],
  });

  const isOwner = farmResult.rows.length > 0;

  // If owner, redirect to the unified canvas immediately
  if (isOwner) {
    redirect(`/canvas?farm=${id}&section=farm`);
  }

  // Not the owner — try fetching as public farm
  farmResult = await db.execute({
    sql: "SELECT * FROM farms WHERE id = ? AND is_public = 1",
    args: [id],
  });

  const farmRow = farmResult.rows[0] as any;
  if (!farmRow) {
    notFound();
  }

  // Convert to plain object for client component
  const farm: Farm = {
    id: farmRow.id,
    user_id: farmRow.user_id,
    name: farmRow.name,
    description: farmRow.description,
    acres: farmRow.acres,
    climate_zone: farmRow.climate_zone,
    rainfall_inches: farmRow.rainfall_inches,
    soil_type: farmRow.soil_type,
    center_lat: farmRow.center_lat,
    center_lng: farmRow.center_lng,
    zoom_level: farmRow.zoom_level,
    is_public: farmRow.is_public,
    created_at: farmRow.created_at,
    updated_at: farmRow.updated_at,
  };

  // Security note: Private farms are already restricted at this point
  // The SQL query above only fetches public farms (is_public = 1) for non-owners
  // This means private farms automatically return notFound() for visitors

  // Get farm owner information
  const ownerResult = await db.execute({
    sql: "SELECT name, image FROM users WHERE id = ?",
    args: [farm.user_id],
  });

  const ownerRow = ownerResult.rows[0] as any;
  if (!ownerRow) {
    notFound(); // Farm has no valid owner
  }

  const farmOwner = {
    name: ownerRow.name as string,
    image: ownerRow.image as string | null,
  };

  // Get zones
  const zonesResult = await db.execute({
    sql: "SELECT * FROM zones WHERE farm_id = ? ORDER BY created_at ASC",
    args: [id],
  });

  const zones = zonesResult.rows as unknown as Zone[];

  // Get feed posts
  const feedResult = await db.execute({
    sql: `SELECT p.*,
                 u.name as author_name,
                 u.image as author_image,
                 ai.screenshot_data as ai_screenshot,
                 (SELECT reaction_type FROM post_reactions
                  WHERE post_id = p.id AND user_id = ?) as user_reaction
          FROM farm_posts p
          JOIN users u ON p.author_id = u.id
          LEFT JOIN ai_analyses ai ON p.ai_analysis_id = ai.id
          WHERE p.farm_id = ? AND p.is_published = 1
          ORDER BY p.created_at DESC
          LIMIT 21`,
    args: [session.user.id, id],
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

  // Get latest screenshot for cover image
  const screenshotResult = await db.execute({
    sql: `SELECT screenshot_data FROM ai_analyses
          WHERE farm_id = ? AND screenshot_data IS NOT NULL
          ORDER BY created_at DESC LIMIT 1`,
    args: [id],
  });

  let latestScreenshot = null;
  if (screenshotResult.rows.length > 0) {
    const screenshotJson = (screenshotResult.rows[0] as any).screenshot_data;
    try {
      const urls = JSON.parse(screenshotJson);
      latestScreenshot = Array.isArray(urls) && urls.length > 0 ? urls[0] : null;
    } catch (e) {
      console.error('Failed to parse screenshot JSON:', e);
    }
  }

  const isShopEnabled = farmRow.is_shop_enabled as number | null;
  const storyPublished = farmRow.story_published as number | null;
  const storyTheme = (farmRow.story_theme as string) || 'earth';

  // Fetch published tours for visitors
  const toursResult = await db.execute({
    sql: `SELECT t.id, t.title, t.share_slug, t.estimated_duration_minutes,
                 (SELECT COUNT(*) FROM tour_stops WHERE tour_id = t.id) as stop_count
          FROM farm_tours t
          WHERE t.farm_id = ? AND t.status = 'published' AND t.access_type != 'password'
          ORDER BY t.updated_at DESC`,
    args: [id],
  });
  const publishedTours = toursResult.rows as any[];

  // Show story page (if published) or public view
  if (storyPublished === 1) {
    // Fetch story sections
    const storySectionsResult = await db.execute({
      sql: 'SELECT * FROM farm_story_sections WHERE farm_id = ? AND is_visible = 1 ORDER BY display_order ASC',
      args: [id],
    });
    const storySections = storySectionsResult.rows as unknown as FarmStorySection[];

    if (storySections.length > 0) {
      // Fetch species for "what we grow"
      const speciesResult = await db.execute({
        sql: `SELECT s.common_name, s.scientific_name, s.layer, s.is_native, COUNT(*) as count
              FROM plantings p JOIN species s ON p.species_id = s.id
              WHERE p.farm_id = ? GROUP BY s.id ORDER BY s.layer, s.common_name`,
        args: [id],
      });

      // Fetch featured products if shop enabled
      let featuredProducts: any[] = [];
      let fulfillment: any = {};
      if (isShopEnabled === 1) {
        const productsResult = await db.execute({
          sql: `SELECT * FROM shop_products WHERE farm_id = ? AND is_published = 1 AND is_featured = 1 ORDER BY sort_order ASC LIMIT 6`,
          args: [id],
        });
        featuredProducts = productsResult.rows as any[];
        fulfillment = {
          shipping: !!farmRow.accepts_shipping,
          pickup: !!farmRow.accepts_pickup,
          delivery: !!farmRow.accepts_delivery,
        };
      }

      return (
        <FarmStoryPage
          farm={farm}
          sections={storySections}
          farmOwner={farmOwner}
          latestScreenshot={latestScreenshot}
          featuredProducts={featuredProducts}
          isShopEnabled={isShopEnabled === 1}
          initialFeedData={initialFeedData}
          currentUserId={session.user.id}
          storyTheme={storyTheme}
          species={speciesResult.rows as any[]}
          fulfillment={fulfillment}
          publishedTours={publishedTours}
        />
      );
    }
  }

  return (
    <FarmPublicView
      farm={farm}
      farmOwner={farmOwner}
      latestScreenshot={latestScreenshot}
      initialFeedData={initialFeedData}
      currentUserId={session.user.id}
      isShopEnabled={isShopEnabled ?? 0}
      publishedTours={publishedTours}
    />
  );
}
