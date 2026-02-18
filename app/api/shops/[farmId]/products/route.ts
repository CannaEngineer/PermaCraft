// app/api/shops/[farmId]/products/route.ts
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { headers } from 'next/headers';
import { z } from 'zod';

const CATEGORIES = ['nursery_stock','seeds','vegetable_box','cut_flowers',
  'teas_herbs','value_added','tour','event','digital','other'] as const;

const ProductSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional().nullable(),
  category: z.enum(CATEGORIES),
  price_cents: z.number().int().positive(),
  compare_at_price_cents: z.number().int().positive().optional().nullable(),
  quantity_in_stock: z.number().int().min(0).default(0),
  image_url: z.string().url().optional().nullable(),
  tags: z.string().optional().nullable(),
  is_published: z.number().int().min(0).max(1).default(1),
});

async function verifyOwnership(farmId: string, userId: string) {
  const result = await db.execute({
    sql: 'SELECT id FROM farms WHERE id = ? AND user_id = ?',
    args: [farmId, userId],
  });
  return result.rows.length > 0;
}

function generateSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 80);
}

export async function GET(
  _req: Request,
  { params }: { params: { farmId: string } }
) {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) return new Response('Unauthorized', { status: 401 });

  const owned = await verifyOwnership(params.farmId, session.user.id);
  if (!owned) return new Response('Forbidden', { status: 403 });

  const result = await db.execute({
    sql: 'SELECT * FROM shop_products WHERE farm_id = ? ORDER BY sort_order ASC, created_at DESC',
    args: [params.farmId],
  });
  return Response.json(result.rows);
}

export async function POST(
  req: Request,
  { params }: { params: { farmId: string } }
) {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) return new Response('Unauthorized', { status: 401 });

  const owned = await verifyOwnership(params.farmId, session.user.id);
  if (!owned) return new Response('Forbidden', { status: 403 });

  const body = await req.json();
  const parsed = ProductSchema.safeParse(body);
  if (!parsed.success) return Response.json(parsed.error, { status: 400 });

  const { name, description, category, price_cents, compare_at_price_cents,
          quantity_in_stock, image_url, tags, is_published } = parsed.data;

  const id = crypto.randomUUID();
  let slug = generateSlug(name);

  // Ensure slug uniqueness within farm
  const existing = await db.execute({
    sql: 'SELECT slug FROM shop_products WHERE farm_id = ? AND slug LIKE ?',
    args: [params.farmId, `${slug}%`],
  });
  if (existing.rows.length > 0) slug = `${slug}-${Date.now()}`;

  await db.execute({
    sql: `INSERT INTO shop_products
            (id, farm_id, name, slug, description, category, price_cents,
             compare_at_price_cents, quantity_in_stock, image_url, tags, is_published)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [id, params.farmId, name, slug, description ?? null, category, price_cents,
           compare_at_price_cents ?? null, quantity_in_stock, image_url ?? null,
           tags ?? null, is_published],
  });

  const product = await db.execute({
    sql: 'SELECT * FROM shop_products WHERE id = ?',
    args: [id],
  });
  return Response.json(product.rows[0], { status: 201 });
}
