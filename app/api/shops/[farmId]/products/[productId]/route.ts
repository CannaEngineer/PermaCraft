// app/api/shops/[farmId]/products/[productId]/route.ts
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { z } from 'zod';

const CATEGORIES = ['nursery_stock','seeds','vegetable_box','cut_flowers',
  'teas_herbs','value_added','tour','event','digital','other'] as const;

const UpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional().nullable(),
  category: z.enum(CATEGORIES).optional(),
  price_cents: z.number().int().positive().optional(),
  compare_at_price_cents: z.number().int().positive().optional().nullable(),
  quantity_in_stock: z.number().int().min(0).optional(),
  image_url: z.string().url().optional().nullable(),
  tags: z.string().optional().nullable(),
  is_published: z.number().int().min(0).max(1).optional(),
  is_featured: z.number().int().min(0).max(1).optional(),
  sort_order: z.number().int().optional(),
});

async function verifyOwnership(farmId: string, userId: string) {
  const result = await db.execute({
    sql: 'SELECT id FROM farms WHERE id = ? AND user_id = ?',
    args: [farmId, userId],
  });
  return result.rows.length > 0;
}

export async function GET(
  _req: Request,
  { params }: { params: { farmId: string; productId: string } }
) {
  // Public endpoint — no auth required
  const result = await db.execute({
    sql: `SELECT p.*, f.name as farm_name, f.is_shop_enabled
          FROM shop_products p
          JOIN farms f ON f.id = p.farm_id
          WHERE p.id = ? AND p.farm_id = ? AND p.is_published = 1 AND f.is_shop_enabled = 1`,
    args: [params.productId, params.farmId],
  });
  if (!result.rows[0]) return new Response('Not found', { status: 404 });

  // Increment view count
  await db.execute({
    sql: 'UPDATE shop_products SET view_count = view_count + 1 WHERE id = ?',
    args: [params.productId],
  });
  return Response.json(result.rows[0]);
}

export async function PATCH(
  req: Request,
  { params }: { params: { farmId: string; productId: string } }
) {
  const session = await getSession();
  if (!session) return new Response('Unauthorized', { status: 401 });

  const owned = await verifyOwnership(params.farmId, session.user.id);
  if (!owned) return new Response('Forbidden', { status: 403 });

  const body = await req.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return Response.json(parsed.error, { status: 400 });

  const data = parsed.data;
  const fields = (Object.keys(data) as (keyof typeof data)[]).filter(
    (k) => data[k] !== undefined
  );
  if (fields.length === 0) return new Response('No fields to update', { status: 400 });

  const setClauses = fields.map((f) => `${f} = ?`).join(', ');
  const values = fields.map((f) => data[f] ?? null);

  await db.execute({
    sql: `UPDATE shop_products SET ${setClauses}, updated_at = unixepoch()
          WHERE id = ? AND farm_id = ?`,
    args: [...values, params.productId, params.farmId],
  });

  const updated = await db.execute({
    sql: 'SELECT * FROM shop_products WHERE id = ?',
    args: [params.productId],
  });
  return Response.json(updated.rows[0]);
}

export async function DELETE(
  _req: Request,
  { params }: { params: { farmId: string; productId: string } }
) {
  const session = await getSession();
  if (!session) return new Response('Unauthorized', { status: 401 });

  const owned = await verifyOwnership(params.farmId, session.user.id);
  if (!owned) return new Response('Forbidden', { status: 403 });

  await db.execute({
    sql: 'DELETE FROM shop_products WHERE id = ? AND farm_id = ?',
    args: [params.productId, params.farmId],
  });
  return new Response(null, { status: 204 });
}
