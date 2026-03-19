import { db } from '@/lib/db';
import { getSession } from '@/lib/auth/session';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const session = await getSession();
  const userId = session?.user?.id || null;
  const { searchParams } = new URL(request.url);
  const section = searchParams.get('section'); // tours, stories, farms, updates, shops
  const q = searchParams.get('q') || '';
  const category = searchParams.get('category') || '';
  const limit = Math.min(parseInt(searchParams.get('limit') || '12'), 50);
  const offset = parseInt(searchParams.get('offset') || '0');

  try {
    if (section === 'farms') {
      return Response.json(await fetchFarms(q, limit, offset));
    }
    if (section === 'tours') {
      return Response.json(await fetchTours(q, category, limit, offset));
    }
    if (section === 'stories') {
      return Response.json(await fetchStories(q, limit, offset));
    }
    if (section === 'updates') {
      return Response.json(await fetchUpdates(userId, q, limit, offset));
    }
    if (section === 'shops') {
      return Response.json(await fetchShops(q, category, limit, offset));
    }

    // Default: return overview data for the discover page
    const [featuredFarms, recentFarms, recentTours, recentStories, recentUpdates, topShops, stats] =
      await Promise.all([
        fetchFeaturedFarms(),
        fetchFarms('', 6, 0),
        fetchTours('', '', 6, 0),
        fetchStories('', 4, 0),
        fetchUpdates(userId, '', 6, 0),
        fetchShops('', '', 6, 0),
        fetchDiscoverStats(),
      ]);

    return Response.json({
      featured_farms: featuredFarms,
      farms: recentFarms,
      tours: recentTours,
      stories: recentStories,
      updates: recentUpdates,
      shops: topShops,
      stats,
    });
  } catch (error) {
    console.error('Discover API error:', error);
    return Response.json({ error: 'Failed to load discover data' }, { status: 500 });
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

async function fetchFarms(q: string, limit: number, offset: number) {
  let sql = `
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
  `;
  const args: any[] = [];

  if (q) {
    sql += ` AND (f.name LIKE ? OR f.description LIKE ? OR f.climate_zone LIKE ?)`;
    const searchQ = `%${q}%`;
    args.push(searchQ, searchQ, searchQ);
  }

  sql += ` ORDER BY tour_count DESC, follower_count DESC, total_tour_visitors DESC LIMIT ? OFFSET ?`;
  args.push(limit, offset);

  const result = await db.execute({ sql, args });
  return result.rows;
}

async function fetchTours(q: string, category: string, limit: number, offset: number) {
  let sql = `
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
  `;
  const args: any[] = [];

  if (q) {
    sql += ` AND (t.title LIKE ? OR t.description LIKE ? OR f.name LIKE ?)`;
    const searchQ = `%${q}%`;
    args.push(searchQ, searchQ, searchQ);
  }

  if (category === 'easy' || category === 'moderate' || category === 'challenging') {
    sql += ` AND t.difficulty = ?`;
    args.push(category);
  }

  sql += ` ORDER BY t.visitor_count DESC, t.published_at DESC LIMIT ? OFFSET ?`;
  args.push(limit, offset);

  const result = await db.execute({ sql, args });
  return result.rows;
}

async function fetchStories(q: string, limit: number, offset: number) {
  let sql = `
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
  `;
  const args: any[] = [];

  if (q) {
    sql += ` AND (f.name LIKE ? OR f.description LIKE ?)`;
    const searchQ = `%${q}%`;
    args.push(searchQ, searchQ);
  }

  sql += ` ORDER BY follower_count DESC, section_count DESC LIMIT ? OFFSET ?`;
  args.push(limit, offset);

  const result = await db.execute({ sql, args });
  return result.rows;
}

async function fetchUpdates(userId: string | null, q: string, limit: number, offset: number) {
  const args: any[] = userId ? [userId] : [];
  let sql = userId
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
  `;

  if (q) {
    sql += ` AND (p.content LIKE ? OR f.name LIKE ?)`;
    const searchQ = `%${q}%`;
    args.push(searchQ, searchQ);
  }

  sql += ` ORDER BY p.created_at DESC LIMIT ? OFFSET ?`;
  args.push(limit, offset);

  const result = await db.execute({ sql, args });
  return result.rows.map((row: any) => ({
    ...row,
    media_urls: row.media_urls ? JSON.parse(row.media_urls) : null,
    hashtags: row.hashtags ? JSON.parse(row.hashtags) : null,
  }));
}

async function fetchShops(q: string, category: string, limit: number, offset: number) {
  let sql = `
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
  `;
  const args: any[] = [];

  if (q) {
    sql += ` AND (f.name LIKE ? OR f.description LIKE ? OR f.shop_headline LIKE ?)`;
    const searchQ = `%${q}%`;
    args.push(searchQ, searchQ, searchQ);
  }

  if (category) {
    sql += ` AND EXISTS (SELECT 1 FROM shop_products WHERE farm_id = f.id AND is_published = 1 AND category = ?)`;
    args.push(category);
  }

  sql += ` ORDER BY product_count DESC LIMIT ? OFFSET ?`;
  args.push(limit, offset);

  const result = await db.execute({ sql, args });
  return result.rows;
}

async function fetchDiscoverStats() {
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
