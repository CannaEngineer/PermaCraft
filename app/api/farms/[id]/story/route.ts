import { db } from '@/lib/db';
import { getSession, requireAuth } from '@/lib/auth/session';
import type { FarmStorySection } from '@/lib/db/schema';

// GET /api/farms/[id]/story — public read (if published) or owner read (all sections)
export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: farmId } = await context.params;
  const session = await getSession();
  const userId = session?.user?.id;

  // Fetch farm
  const farmResult = await db.execute({
    sql: 'SELECT id, user_id, is_public, story_published, story_theme FROM farms WHERE id = ?',
    args: [farmId],
  });
  const farm = farmResult.rows[0] as any;
  if (!farm) return new Response('Farm not found', { status: 404 });

  const isOwner = userId === farm.user_id;

  // Non-owners can only see published stories on public farms
  if (!isOwner && (farm.is_public !== 1 || farm.story_published !== 1)) {
    return Response.json({ sections: [], storyPublished: false, storyTheme: 'earth' });
  }

  // Owner sees all sections; visitors see only visible ones
  const sql = isOwner
    ? 'SELECT * FROM farm_story_sections WHERE farm_id = ? ORDER BY display_order ASC'
    : 'SELECT * FROM farm_story_sections WHERE farm_id = ? AND is_visible = 1 ORDER BY display_order ASC';

  const sectionsResult = await db.execute({ sql, args: [farmId] });

  return Response.json({
    sections: sectionsResult.rows as unknown as FarmStorySection[],
    storyPublished: farm.story_published === 1,
    storyTheme: farm.story_theme || 'earth',
  });
}

// POST /api/farms/[id]/story — owner creates a new section
export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth();
  const { id: farmId } = await context.params;

  // Verify ownership
  const farmResult = await db.execute({
    sql: 'SELECT user_id FROM farms WHERE id = ?',
    args: [farmId],
  });
  const farm = farmResult.rows[0] as any;
  if (!farm || farm.user_id !== session.user.id) {
    return new Response('Forbidden', { status: 403 });
  }

  const body = await req.json();
  const { section_type, title, content, media_url, is_visible, display_order, metadata } = body;

  if (!section_type || !title) {
    return new Response('section_type and title are required', { status: 400 });
  }

  const validTypes = ['hero', 'origin', 'values', 'the_land', 'what_we_grow', 'seasons', 'visit_us', 'custom'];
  if (!validTypes.includes(section_type)) {
    return new Response('Invalid section_type', { status: 400 });
  }

  const id = crypto.randomUUID();

  // Get max display_order if not provided
  let order = display_order;
  if (order == null) {
    const maxResult = await db.execute({
      sql: 'SELECT MAX(display_order) as max_order FROM farm_story_sections WHERE farm_id = ?',
      args: [farmId],
    });
    const maxRow = maxResult.rows[0] as any;
    order = (maxRow?.max_order ?? -1) + 1;
  }

  await db.execute({
    sql: `INSERT INTO farm_story_sections (id, farm_id, section_type, title, content, media_url, is_visible, display_order, metadata)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      farmId,
      section_type,
      title,
      content || null,
      media_url || null,
      is_visible ?? 1,
      order,
      metadata ? JSON.stringify(metadata) : null,
    ],
  });

  const newSection = await db.execute({
    sql: 'SELECT * FROM farm_story_sections WHERE id = ?',
    args: [id],
  });

  return Response.json(newSection.rows[0], { status: 201 });
}
