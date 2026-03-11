// app/api/cart/route.ts
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const AddToCartSchema = z.object({
  product_id: z.string().min(1),
  variant_id: z.string().optional().nullable(),
  quantity: z.number().int().positive().default(1),
});

export async function GET() {
  const session = await getSession();
  if (!session) return new Response('Unauthorized', { status: 401 });

  const result = await db.execute({
    sql: `SELECT
            ci.id,
            ci.product_id,
            ci.variant_id,
            ci.quantity,
            ci.added_at,
            sp.name AS product_name,
            sp.price_cents,
            sp.image_url,
            sp.farm_id,
            sp.quantity_in_stock,
            sp.allow_backorder,
            sp.is_published,
            pv.name AS variant_name,
            pv.price_cents AS variant_price_cents
          FROM cart_items ci
          JOIN shop_products sp ON sp.id = ci.product_id
          LEFT JOIN product_variants pv ON pv.id = ci.variant_id
          WHERE ci.user_id = ?
          ORDER BY ci.added_at DESC`,
    args: [session.user.id],
  });

  const items = result.rows.map((row) => ({
    id: row.id,
    product_id: row.product_id,
    variant_id: row.variant_id,
    quantity: row.quantity,
    added_at: row.added_at,
    product_name: row.product_name,
    price_cents: row.variant_price_cents ?? row.price_cents,
    image_url: row.image_url,
    farm_id: row.farm_id,
    quantity_in_stock: row.quantity_in_stock,
    allow_backorder: row.allow_backorder,
    is_published: row.is_published,
    variant_name: row.variant_name,
  }));

  const total_cents = items.reduce(
    (sum, item) => sum + (item.price_cents as number) * (item.quantity as number),
    0
  );

  return Response.json({ items, total_cents });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return new Response('Unauthorized', { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = AddToCartSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { product_id, variant_id, quantity } = parsed.data;

  // Verify the product exists and is published
  const productResult = await db.execute({
    sql: 'SELECT id, is_published FROM shop_products WHERE id = ?',
    args: [product_id],
  });
  if (productResult.rows.length === 0) {
    return Response.json({ error: 'Product not found' }, { status: 404 });
  }
  if (!productResult.rows[0].is_published) {
    return Response.json({ error: 'Product is not available' }, { status: 400 });
  }

  // If variant_id supplied, verify it belongs to this product
  if (variant_id) {
    const variantResult = await db.execute({
      sql: 'SELECT id FROM product_variants WHERE id = ? AND product_id = ?',
      args: [variant_id, product_id],
    });
    if (variantResult.rows.length === 0) {
      return Response.json({ error: 'Variant not found for this product' }, { status: 404 });
    }
  }

  // Check if this product+variant already exists in cart (upsert)
  const existingResult = await db.execute({
    sql: `SELECT id, quantity FROM cart_items
          WHERE user_id = ? AND product_id = ? AND (variant_id = ? OR (variant_id IS NULL AND ? IS NULL))`,
    args: [session.user.id, product_id, variant_id ?? null, variant_id ?? null],
  });

  let itemId: string;

  if (existingResult.rows.length > 0) {
    // Update: add to existing quantity
    const existing = existingResult.rows[0];
    itemId = existing.id as string;
    const newQuantity = (existing.quantity as number) + quantity;

    await db.execute({
      sql: 'UPDATE cart_items SET quantity = ? WHERE id = ?',
      args: [newQuantity, itemId],
    });
  } else {
    // Insert new cart item
    itemId = crypto.randomUUID();
    await db.execute({
      sql: `INSERT INTO cart_items (id, user_id, product_id, variant_id, quantity, added_at)
            VALUES (?, ?, ?, ?, ?, unixepoch())`,
      args: [itemId, session.user.id, product_id, variant_id ?? null, quantity],
    });
  }

  // Fetch the upserted item
  const itemResult = await db.execute({
    sql: 'SELECT * FROM cart_items WHERE id = ?',
    args: [itemId],
  });

  // Count total items in cart
  const countResult = await db.execute({
    sql: 'SELECT COALESCE(SUM(quantity), 0) AS cart_count FROM cart_items WHERE user_id = ?',
    args: [session.user.id],
  });

  return Response.json({
    item: itemResult.rows[0],
    cart_count: countResult.rows[0].cart_count,
  }, { status: 201 });
}

export async function DELETE() {
  const session = await getSession();
  if (!session) return new Response('Unauthorized', { status: 401 });

  await db.execute({
    sql: 'DELETE FROM cart_items WHERE user_id = ?',
    args: [session.user.id],
  });

  return Response.json({ success: true });
}
