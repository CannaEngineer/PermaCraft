import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { DiscoverClient } from '@/components/discover/discover-client';

export const metadata = {
  title: 'Discover Farms | Permaculture.Studio',
  description: 'Explore farm tours, read farm stories, browse local products, and connect with permaculture farmers.',
};

async function fetchDiscoverData(userId: string | null) {
  try {
    const [featuredFarms, farms, tours, stories, updates, shops, stats] = await Promise.all([
      fetchFeaturedFarms(),
      fetchDiscoverableFarms(),
      fetchRecentTours(),
      fetchRecentStories(),
      fetchRecentUpdates(userId),
      fetchRecentShops(),
      fetchStats(),
    ]);

    return {
      featured_farms: featuredFarms,
      farms,
      tours,
      stories,
      updates,
      shops,
      stats,
    };
  } catch (error) {
    console.error('Failed to load discover data:', error);
    return {
      featured_farms: [],
      farms: [],
      tours: [],
      stories: [],
      updates: [],
      shops: [],
      stats: {},
    };
  }
}

async function fetchFeaturedFarms() {
  const result = await db.execute({
    sql: `
      SELECT f.id, f.name, f.description, f.acres, f.climate_zone,
             f.center_lat, f.center_lng, f.is_shop_enabled,
             u.name as owner_name, u.image as owner_image,
             (SELECT COUNT(*) FROM farm_tours WHERE farm_id = f.id AND status = 'published') as tour_count,
             (SELECT COUNT(*) FROM farm_story_sections WHERE farm_id = f.id) as story_section_count,
             (SELECT COUNT(*) FROM shop_products WHERE farm_id = f.id AND is_published = 1) as product_count,
             (SELECT COUNT(*) FROM farm_follows WHERE farm_id = f.id) as follower_count,
             (SELECT screenshot_url FROM map_snapshots WHERE farm_id = f.id ORDER BY created_at DESC LIMIT 1) as latest_screenshot
      FROM farms f
      JOIN users u ON f.user_id = u.id
      WHERE f.is_public = 1
      ORDER BY follower_count DESC, tour_count DESC, product_count DESC
      LIMIT 8
    `,
    args: [],
  });
  return result.rows;
}

async function fetchDiscoverableFarms() {
  const result = await db.execute({
    sql: `
      SELECT f.id, f.name, f.description, f.acres, f.climate_zone,
             f.center_lat, f.center_lng, f.is_shop_enabled,
             f.story_published,
             u.name as owner_name, u.image as owner_image,
             (SELECT COUNT(*) FROM farm_tours WHERE farm_id = f.id AND status = 'published') as tour_count,
             (SELECT COUNT(*) FROM farm_story_sections WHERE farm_id = f.id AND is_visible = 1) as story_section_count,
             (SELECT COUNT(*) FROM shop_products WHERE farm_id = f.id AND is_published = 1) as product_count,
             (SELECT COUNT(*) FROM farm_follows WHERE farm_id = f.id) as follower_count,
             (SELECT screenshot_url FROM map_snapshots WHERE farm_id = f.id ORDER BY created_at DESC LIMIT 1) as latest_screenshot,
             (SELECT title FROM farm_tours WHERE farm_id = f.id AND status = 'published' ORDER BY visitor_count DESC LIMIT 1) as top_tour_title,
             (SELECT SUM(visitor_count) FROM farm_tours WHERE farm_id = f.id AND status = 'published') as total_tour_visitors
      FROM farms f
      JOIN users u ON f.user_id = u.id
      WHERE f.is_public = 1
        AND (
          EXISTS (SELECT 1 FROM farm_tours WHERE farm_id = f.id AND status = 'published')
          OR f.story_published = 1
        )
      ORDER BY tour_count DESC, follower_count DESC, total_tour_visitors DESC
      LIMIT 6
    `,
    args: [],
  });
  return result.rows;
}

async function fetchRecentTours() {
  const result = await db.execute({
    sql: `
      SELECT t.id, t.title, t.description, t.cover_image_url, t.status,
             t.estimated_duration_minutes, t.difficulty, t.seasonal_notes,
             t.visitor_count, t.share_slug, t.published_at,
             f.id as farm_id, f.name as farm_name, f.description as farm_description,
             f.center_lat, f.center_lng, f.acres, f.climate_zone,
             u.name as owner_name, u.image as owner_image,
             (SELECT COUNT(*) FROM tour_stops WHERE tour_id = t.id) as stop_count,
             (SELECT screenshot_url FROM map_snapshots WHERE farm_id = f.id ORDER BY created_at DESC LIMIT 1) as farm_screenshot
      FROM farm_tours t
      JOIN farms f ON t.farm_id = f.id
      JOIN users u ON f.user_id = u.id
      WHERE t.status = 'published' AND f.is_public = 1
      ORDER BY t.visitor_count DESC, t.published_at DESC
      LIMIT 6
    `,
    args: [],
  });
  return result.rows;
}

async function fetchRecentStories() {
  const result = await db.execute({
    sql: `
      SELECT f.id as farm_id, f.name as farm_name, f.description as farm_description,
             f.acres, f.climate_zone, f.center_lat, f.center_lng,
             f.is_shop_enabled,
             u.name as owner_name, u.image as owner_image,
             (SELECT COUNT(*) FROM farm_story_sections WHERE farm_id = f.id) as section_count,
             (SELECT title FROM farm_story_sections WHERE farm_id = f.id AND section_type = 'hero' LIMIT 1) as story_title,
             (SELECT content FROM farm_story_sections WHERE farm_id = f.id AND section_type = 'hero' LIMIT 1) as story_excerpt,
             (SELECT media_url FROM farm_story_sections WHERE farm_id = f.id AND section_type = 'hero' LIMIT 1) as story_cover,
             (SELECT COUNT(*) FROM farm_follows WHERE farm_id = f.id) as follower_count,
             (SELECT COUNT(*) FROM farm_tours WHERE farm_id = f.id AND status = 'published') as tour_count,
             (SELECT COUNT(*) FROM shop_products WHERE farm_id = f.id AND is_published = 1) as product_count,
             (SELECT screenshot_url FROM map_snapshots WHERE farm_id = f.id ORDER BY created_at DESC LIMIT 1) as farm_screenshot
      FROM farms f
      JOIN users u ON f.user_id = u.id
      WHERE f.is_public = 1
        AND f.story_published = 1
        AND EXISTS (SELECT 1 FROM farm_story_sections WHERE farm_id = f.id)
      ORDER BY follower_count DESC, section_count DESC
      LIMIT 4
    `,
    args: [],
  });
  return result.rows;
}

async function fetchRecentUpdates(userId: string | null) {
  const args: any[] = userId ? [userId] : [];
  const sql = userId
    ? `
    SELECT p.id, p.farm_id, p.post_type, p.content, p.media_urls,
           p.hashtags, p.reaction_count, p.comment_count, p.view_count,
           p.created_at,
           f.name as farm_name,
           u.name as author_name, u.image as author_image,
           (SELECT reaction_type FROM post_reactions WHERE post_id = p.id AND user_id = ?) as user_reaction,
           (SELECT screenshot_url FROM map_snapshots WHERE farm_id = f.id ORDER BY created_at DESC LIMIT 1) as farm_screenshot
    FROM farm_posts p
    JOIN farms f ON p.farm_id = f.id
    JOIN users u ON p.author_id = u.id
    WHERE f.is_public = 1 AND p.is_published = 1
    ORDER BY p.created_at DESC
    LIMIT 6
  `
    : `
    SELECT p.id, p.farm_id, p.post_type, p.content, p.media_urls,
           p.hashtags, p.reaction_count, p.comment_count, p.view_count,
           p.created_at,
           f.name as farm_name,
           u.name as author_name, u.image as author_image,
           NULL as user_reaction,
           (SELECT screenshot_url FROM map_snapshots WHERE farm_id = f.id ORDER BY created_at DESC LIMIT 1) as farm_screenshot
    FROM farm_posts p
    JOIN farms f ON p.farm_id = f.id
    JOIN users u ON p.author_id = u.id
    WHERE f.is_public = 1 AND p.is_published = 1
    ORDER BY p.created_at DESC
    LIMIT 6
  `;

  const result = await db.execute({ sql, args });
  return result.rows.map((row: any) => ({
    ...row,
    media_urls: row.media_urls ? JSON.parse(row.media_urls) : null,
    hashtags: row.hashtags ? JSON.parse(row.hashtags) : null,
  }));
}

async function fetchRecentShops() {
  const result = await db.execute({
    sql: `
      SELECT f.id, f.name, f.description, f.acres, f.climate_zone,
             f.center_lat, f.center_lng, f.shop_headline,
             u.name as owner_name, u.image as owner_image,
             f.accepts_pickup, f.accepts_shipping, f.accepts_delivery,
             (SELECT COUNT(*) FROM shop_products WHERE farm_id = f.id AND is_published = 1) as product_count,
             (SELECT AVG(rating_avg) FROM shop_products WHERE farm_id = f.id AND is_published = 1 AND rating_count > 0) as avg_rating,
             (SELECT screenshot_url FROM map_snapshots WHERE farm_id = f.id ORDER BY created_at DESC LIMIT 1) as farm_screenshot
      FROM farms f
      JOIN users u ON f.user_id = u.id
      WHERE f.is_public = 1 AND f.is_shop_enabled = 1
      ORDER BY product_count DESC
      LIMIT 6
    `,
    args: [],
  });
  return result.rows;
}

async function fetchStats() {
  const result = await db.execute({
    sql: `
      SELECT
        (SELECT COUNT(*) FROM farms WHERE is_public = 1) as total_farms,
        (SELECT COUNT(*) FROM farm_tours WHERE status = 'published') as total_tours,
        (SELECT COUNT(*) FROM farms WHERE is_public = 1 AND is_shop_enabled = 1) as total_shops,
        (SELECT COUNT(DISTINCT user_id) FROM farms WHERE is_public = 1) as total_farmers,
        (SELECT COUNT(*) FROM farm_posts WHERE is_published = 1) as total_updates
    `,
    args: [],
  });
  return result.rows[0] || {};
}

export default async function DiscoverPage() {
  const session = await getSession();
  const initialData = await fetchDiscoverData(session?.user?.id || null);

  return (
    <DiscoverClient
      isAuthenticated={!!session}
      initialData={initialData}
    />
  );
}
