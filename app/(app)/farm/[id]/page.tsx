import { requireAuth } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import type { Farm, Zone } from "@/lib/db/schema";
import { FarmEditorClient } from "./farm-editor-client";
import { FarmFeedClient } from "@/components/feed/farm-feed-client";
import { FarmPublicView } from "@/components/farm/farm-public-view";
import { ImmersiveMapEditor } from "@/components/immersive-map/immersive-map-editor";

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

  let isOwner = farmResult.rows.length > 0;

  // If not found as owner, try fetching as public farm
  if (!isOwner) {
    farmResult = await db.execute({
      sql: "SELECT * FROM farms WHERE id = ? AND is_public = 1",
      args: [id],
    });
  }

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

  // If visitor (not owner), show public view
  if (!isOwner) {
    return (
      <FarmPublicView
        farm={farm}
        farmOwner={farmOwner}
        latestScreenshot={latestScreenshot}
        initialFeedData={initialFeedData}
        currentUserId={session.user.id}
      />
    );
  }

  // Check feature flag
  const useImmersiveEditor = process.env.NEXT_PUBLIC_USE_IMMERSIVE_EDITOR === 'true';

  // If owner, show editor (immersive or classic based on flag)
  if (useImmersiveEditor) {
    return (
      <ImmersiveMapEditor
        farm={farm}
        initialZones={zones}
        isOwner={isOwner}
        initialIsPublic={!!farm.is_public}
      />
    );
  } else {
    return (
      <div>
        <FarmEditorClient
          farm={farm}
          initialZones={zones}
          isOwner={isOwner}
          initialIsPublic={!!farm.is_public}
        />
        <div className="mt-8 px-4 pb-8">
          <h2 className="text-2xl font-bold mb-4 text-center">Farm Feed</h2>
          <FarmFeedClient
            farmId={id}
            initialData={initialFeedData}
            currentUserId={session.user.id}
          />
        </div>
      </div>
    );
  }
}
