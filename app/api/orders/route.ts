// app/api/orders/route.ts
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const CreateOrderSchema = z.object({
  buyer_name: z.string().min(1).max(200).optional(),
  buyer_email: z.string().email().optional(),
  buyer_phone: z.string().max(30).optional(),
  shipping_address: z.string().max(500).optional(),
  order_notes: z.string().max(1000).optional(),
  fulfillment_type: z.enum(['shipping', 'pickup', 'delivery', 'digital', 'event']).optional(),
});

function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD-${timestamp}-${random}`;
}

interface CartItemWithProduct {
  id: string;
  product_id: string;
  variant_id: string | null;
  quantity: number;
  product_name: string;
  variant_name: string | null;
  price_cents: number;
  farm_id: string;
  quantity_in_stock: number;
  allow_backorder: number;
  is_published: number;
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return new Response('Unauthorized', { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    // Allow empty body -- order details are optional
    body = {};
  }

  const parsed = CreateOrderSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { buyer_name, buyer_email, buyer_phone, shipping_address, order_notes, fulfillment_type } = parsed.data;

  // Fetch all cart items joined with product details
  const cartResult = await db.execute({
    sql: `SELECT
            ci.id,
            ci.product_id,
            ci.variant_id,
            ci.quantity,
            sp.name AS product_name,
            sp.farm_id,
            sp.price_cents,
            sp.quantity_in_stock,
            sp.allow_backorder,
            sp.is_published,
            pv.name AS variant_name,
            pv.price_cents AS variant_price_cents
          FROM cart_items ci
          JOIN shop_products sp ON sp.id = ci.product_id
          LEFT JOIN product_variants pv ON pv.id = ci.variant_id
          WHERE ci.user_id = ?`,
    args: [session.user.id],
  });

  if (cartResult.rows.length === 0) {
    return Response.json({ error: 'Cart is empty' }, { status: 400 });
  }

  // Map rows and resolve variant pricing
  const cartItems: CartItemWithProduct[] = cartResult.rows.map((row) => ({
    id: row.id as string,
    product_id: row.product_id as string,
    variant_id: row.variant_id as string | null,
    quantity: row.quantity as number,
    product_name: row.product_name as string,
    variant_name: row.variant_name as string | null,
    price_cents: (row.variant_price_cents ?? row.price_cents) as number,
    farm_id: row.farm_id as string,
    quantity_in_stock: row.quantity_in_stock as number,
    allow_backorder: row.allow_backorder as number,
    is_published: row.is_published as number,
  }));

  // Validate all items are still purchasable
  for (const item of cartItems) {
    if (!item.is_published) {
      return Response.json(
        { error: `Product "${item.product_name}" is no longer available` },
        { status: 400 }
      );
    }
    if (!item.allow_backorder && item.quantity > item.quantity_in_stock) {
      return Response.json(
        { error: `Insufficient stock for "${item.product_name}". Available: ${item.quantity_in_stock}` },
        { status: 400 }
      );
    }
  }

  // Group cart items by farm_id (each farm gets its own order)
  const itemsByFarm = new Map<string, CartItemWithProduct[]>();
  for (const item of cartItems) {
    const existing = itemsByFarm.get(item.farm_id);
    if (existing) {
      existing.push(item);
    } else {
      itemsByFarm.set(item.farm_id, [item]);
    }
  }

  // TODO: Integrate Stripe payment - create PaymentIntent or Checkout Session here
  // before creating orders. The orders should be created with status='pending' and
  // updated to 'paid' upon successful Stripe webhook confirmation.

  const createdOrders: Array<Record<string, unknown>> = [];

  for (const [farmId, farmItems] of itemsByFarm) {
    const orderId = crypto.randomUUID();
    const orderNumber = generateOrderNumber();

    const subtotalCents = farmItems.reduce(
      (sum, item) => sum + item.price_cents * item.quantity,
      0
    );

    // Shipping and tax are stubbed at 0 for now
    const shippingCents = 0;
    const taxCents = 0;
    const totalCents = subtotalCents + shippingCents + taxCents;

    // Create the order
    await db.execute({
      sql: `INSERT INTO shop_orders
              (id, order_number, farm_id, buyer_id, status,
               subtotal_cents, shipping_cents, tax_cents, total_cents,
               fulfillment_type, shipping_address,
               buyer_name, buyer_email, buyer_phone, order_notes,
               created_at, updated_at)
            VALUES (?, ?, ?, ?, 'pending',
                    ?, ?, ?, ?,
                    ?, ?,
                    ?, ?, ?, ?,
                    unixepoch(), unixepoch())`,
      args: [
        orderId, orderNumber, farmId, session.user.id,
        subtotalCents, shippingCents, taxCents, totalCents,
        fulfillment_type ?? null, shipping_address ?? null,
        buyer_name ?? session.user.name ?? null,
        buyer_email ?? session.user.email ?? null,
        buyer_phone ?? null, order_notes ?? null,
      ],
    });

    // Create order_items for each cart item in this farm group
    for (const item of farmItems) {
      const orderItemId = crypto.randomUUID();
      const lineTotal = item.price_cents * item.quantity;

      await db.execute({
        sql: `INSERT INTO order_items
                (id, order_id, product_id, variant_id, product_name, variant_name,
                 quantity, unit_price_cents, total_cents, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, unixepoch())`,
        args: [
          orderItemId, orderId, item.product_id, item.variant_id,
          item.product_name, item.variant_name ?? null,
          item.quantity, item.price_cents, lineTotal,
        ],
      });
    }

    // Fetch the created order
    const orderResult = await db.execute({
      sql: 'SELECT * FROM shop_orders WHERE id = ?',
      args: [orderId],
    });

    // Fetch order items for this order
    const orderItemsResult = await db.execute({
      sql: 'SELECT * FROM order_items WHERE order_id = ?',
      args: [orderId],
    });

    createdOrders.push({
      ...orderResult.rows[0],
      items: orderItemsResult.rows,
    });
  }

  // Clear the user's cart after successful order creation
  await db.execute({
    sql: 'DELETE FROM cart_items WHERE user_id = ?',
    args: [session.user.id],
  });

  return Response.json({ orders: createdOrders }, { status: 201 });
}
