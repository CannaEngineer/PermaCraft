// app/api/cart/[itemId]/route.ts
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { z } from 'zod';

const UpdateQuantitySchema = z.object({
  quantity: z.number().int(),
});

export async function PATCH(
  req: Request,
  context: { params: Promise<{ itemId: string }> }
) {
  const { itemId } = await context.params;
  const session = await getSession();
  if (!session) return new Response('Unauthorized', { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = UpdateQuantitySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { quantity } = parsed.data;

  // Verify the cart item exists and belongs to this user
  const existing = await db.execute({
    sql: 'SELECT id, user_id FROM cart_items WHERE id = ?',
    args: [itemId],
  });

  if (existing.rows.length === 0) {
    return Response.json({ error: 'Cart item not found' }, { status: 404 });
  }

  if (existing.rows[0].user_id !== session.user.id) {
    return new Response('Forbidden', { status: 403 });
  }

  // If quantity <= 0, delete the item
  if (quantity <= 0) {
    await db.execute({
      sql: 'DELETE FROM cart_items WHERE id = ?',
      args: [itemId],
    });
    return Response.json({ success: true, deleted: true });
  }

  // Update the quantity
  await db.execute({
    sql: 'UPDATE cart_items SET quantity = ? WHERE id = ?',
    args: [quantity, itemId],
  });

  const updated = await db.execute({
    sql: 'SELECT * FROM cart_items WHERE id = ?',
    args: [itemId],
  });

  return Response.json(updated.rows[0]);
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ itemId: string }> }
) {
  const { itemId } = await context.params;
  const session = await getSession();
  if (!session) return new Response('Unauthorized', { status: 401 });

  // Verify the cart item exists and belongs to this user
  const existing = await db.execute({
    sql: 'SELECT id, user_id FROM cart_items WHERE id = ?',
    args: [itemId],
  });

  if (existing.rows.length === 0) {
    return Response.json({ error: 'Cart item not found' }, { status: 404 });
  }

  if (existing.rows[0].user_id !== session.user.id) {
    return new Response('Forbidden', { status: 403 });
  }

  await db.execute({
    sql: 'DELETE FROM cart_items WHERE id = ?',
    args: [itemId],
  });

  return Response.json({ success: true });
}
