// app/api/shops/[farmId]/settings/route.ts
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { z } from 'zod';

const SettingsSchema = z.object({
  is_shop_enabled: z.number().int().min(0).max(1).optional(),
  shop_headline: z.string().max(200).optional().nullable(),
  shop_banner_url: z.string().url().optional().nullable(),
  shop_policy: z.string().optional().nullable(),
  accepts_pickup: z.number().int().min(0).max(1).optional(),
  accepts_shipping: z.number().int().min(0).max(1).optional(),
  accepts_delivery: z.number().int().min(0).max(1).optional(),
  delivery_radius_miles: z.number().positive().optional().nullable(),
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
  { params }: { params: { farmId: string } }
) {
  const session = await getSession();
  if (!session) return new Response('Unauthorized', { status: 401 });

  const owned = await verifyOwnership(params.farmId, session.user.id);
  if (!owned) return new Response('Forbidden', { status: 403 });

  const result = await db.execute({
    sql: `SELECT id, name, is_shop_enabled, shop_headline, shop_banner_url,
                 shop_policy, accepts_pickup, accepts_shipping, accepts_delivery,
                 delivery_radius_miles
          FROM farms WHERE id = ?`,
    args: [params.farmId],
  });

  if (!result.rows[0]) return new Response('Not found', { status: 404 });
  return Response.json(result.rows[0]);
}

export async function PATCH(
  req: Request,
  { params }: { params: { farmId: string } }
) {
  const session = await getSession();
  if (!session) return new Response('Unauthorized', { status: 401 });

  const owned = await verifyOwnership(params.farmId, session.user.id);
  if (!owned) return new Response('Forbidden', { status: 403 });

  const body = await req.json();
  const parsed = SettingsSchema.safeParse(body);
  if (!parsed.success) return Response.json(parsed.error, { status: 400 });

  const data = parsed.data;
  const fields = (Object.keys(data) as (keyof typeof data)[]).filter(
    (k) => data[k] !== undefined
  );
  if (fields.length === 0) return new Response('No fields to update', { status: 400 });

  const setClauses = fields.map((f) => `${f} = ?`).join(', ');
  const values = fields.map((f) => data[f] ?? null);

  await db.execute({
    sql: `UPDATE farms SET ${setClauses}, updated_at = unixepoch() WHERE id = ?`,
    args: [...values, params.farmId],
  });

  return Response.json({ ok: true });
}
