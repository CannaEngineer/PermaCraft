import { db } from '@/lib/db';
import { getSession, requireAuth } from '@/lib/auth/session';
import type { FarmTour } from '@/lib/db/schema';

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) + '-' + crypto.randomUUID().slice(0, 8);
}

// GET /api/farms/[id]/tours — list tours (owner sees all, visitors see published)
export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: farmId } = await context.params;
  const session = await getSession();
  const userId = session?.user?.id;

  const farmResult = await db.execute({
    sql: 'SELECT id, user_id, is_public FROM farms WHERE id = ?',
    args: [farmId],
  });
  const farm = farmResult.rows[0] as any;
  if (!farm) return new Response('Farm not found', { status: 404 });

  const isOwner = userId === farm.user_id;

  if (!isOwner && farm.is_public !== 1) {
    return Response.json({ tours: [] });
  }

  const sql = isOwner
    ? `SELECT t.*, (SELECT COUNT(*) FROM tour_stops WHERE tour_id = t.id) as stop_count
       FROM farm_tours t WHERE t.farm_id = ? ORDER BY t.updated_at DESC`
    : `SELECT t.*, (SELECT COUNT(*) FROM tour_stops WHERE tour_id = t.id) as stop_count
       FROM farm_tours t WHERE t.farm_id = ? AND t.status = 'published' ORDER BY t.updated_at DESC`;

  const result = await db.execute({ sql, args: [farmId] });

  return Response.json({ tours: result.rows as unknown as (FarmTour & { stop_count: number })[] });
}

// POST /api/farms/[id]/tours — create a new tour
export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth();
  const { id: farmId } = await context.params;

  const farmResult = await db.execute({
    sql: 'SELECT user_id FROM farms WHERE id = ?',
    args: [farmId],
  });
  const farm = farmResult.rows[0] as any;
  if (!farm || farm.user_id !== session.user.id) {
    return new Response('Forbidden', { status: 403 });
  }

  const body = await req.json();
  const {
    title,
    description,
    cover_image_url,
    access_type = 'public',
    access_password,
    estimated_duration_minutes,
    difficulty = 'easy',
    seasonal_notes,
    welcome_message,
    completion_message,
    show_map = 1,
    allow_comments = 1,
  } = body;

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return new Response('Title is required', { status: 400 });
  }

  const id = crypto.randomUUID();
  const shareSlug = generateSlug(title);

  await db.execute({
    sql: `INSERT INTO farm_tours (id, farm_id, title, description, cover_image_url, status, access_type, access_password,
          estimated_duration_minutes, difficulty, seasonal_notes, welcome_message, completion_message, show_map, allow_comments, share_slug)
          VALUES (?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id, farmId, title.trim(), description || null, cover_image_url || null,
      access_type, access_password || null,
      estimated_duration_minutes || null, difficulty,
      seasonal_notes || null, welcome_message || null, completion_message || null,
      show_map, allow_comments, shareSlug,
    ],
  });

  const tourResult = await db.execute({
    sql: 'SELECT * FROM farm_tours WHERE id = ?',
    args: [id],
  });

  return Response.json(tourResult.rows[0], { status: 201 });
}
