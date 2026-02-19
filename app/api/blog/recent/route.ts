import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await db.execute({
      sql: `SELECT
              bp.id, bp.title, bp.slug, bp.excerpt, bp.read_time_minutes,
              bp.xp_reward, bp.published_at, bp.view_count,
              GROUP_CONCAT(bt.name) as tags
            FROM blog_posts bp
            LEFT JOIN blog_post_tags bpt ON bp.id = bpt.blog_post_id
            LEFT JOIN blog_tags bt ON bpt.tag_id = bt.id
            WHERE bp.is_published = 1
            GROUP BY bp.id
            ORDER BY bp.published_at DESC
            LIMIT 5`,
      args: [],
    });

    const posts = result.rows.map((row: any) => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      excerpt: row.excerpt,
      read_time_minutes: row.read_time_minutes,
      xp_reward: row.xp_reward,
      published_at: row.published_at,
      view_count: row.view_count,
      tags: row.tags ? row.tags.split(',') : [],
    }));

    return Response.json(posts);
  } catch (error) {
    console.error('Failed to fetch recent blog posts:', error);
    return Response.json([]);
  }
}
