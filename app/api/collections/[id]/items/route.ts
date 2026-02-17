import { requireAuth } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { NextRequest } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = await request.json();

    // Verify ownership
    const check = await db.execute({
      sql: 'SELECT curator_id FROM collections WHERE id = ?',
      args: [id],
    });
    if (check.rows.length === 0) {
      return Response.json({ error: 'Collection not found' }, { status: 404 });
    }
    if ((check.rows[0] as any).curator_id !== session.user.id) {
      return Response.json({ error: 'Not authorized' }, { status: 403 });
    }

    const { post_id, farm_id, curator_note } = body;

    if (!post_id && !farm_id) {
      return Response.json({ error: 'post_id or farm_id is required' }, { status: 400 });
    }

    // Check for duplicate
    if (post_id) {
      const existing = await db.execute({
        sql: 'SELECT id FROM collection_items WHERE collection_id = ? AND post_id = ?',
        args: [id, post_id],
      });
      if (existing.rows.length > 0) {
        return Response.json({ error: 'Post already in collection' }, { status: 409 });
      }
    }

    // Get max display order
    const orderResult = await db.execute({
      sql: 'SELECT COALESCE(MAX(display_order), 0) + 1 as next_order FROM collection_items WHERE collection_id = ?',
      args: [id],
    });
    const nextOrder = (orderResult.rows[0] as any).next_order;

    const itemId = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);

    await db.execute({
      sql: `INSERT INTO collection_items (id, collection_id, farm_id, post_id, display_order, curator_note, added_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [itemId, id, farm_id || null, post_id || null, nextOrder, curator_note || null, now],
    });

    // Update collection timestamp
    await db.execute({
      sql: 'UPDATE collections SET updated_at = ? WHERE id = ?',
      args: [now, id],
    });

    return Response.json({ id: itemId }, { status: 201 });
  } catch (error) {
    console.error('Add collection item error:', error);
    return Response.json({ error: 'Failed to add item' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('item_id');
    const postId = searchParams.get('post_id');

    // Verify ownership
    const check = await db.execute({
      sql: 'SELECT curator_id FROM collections WHERE id = ?',
      args: [id],
    });
    if (check.rows.length === 0) {
      return Response.json({ error: 'Collection not found' }, { status: 404 });
    }
    if ((check.rows[0] as any).curator_id !== session.user.id) {
      return Response.json({ error: 'Not authorized' }, { status: 403 });
    }

    if (itemId) {
      await db.execute({
        sql: 'DELETE FROM collection_items WHERE id = ? AND collection_id = ?',
        args: [itemId, id],
      });
    } else if (postId) {
      await db.execute({
        sql: 'DELETE FROM collection_items WHERE post_id = ? AND collection_id = ?',
        args: [postId, id],
      });
    } else {
      return Response.json({ error: 'item_id or post_id is required' }, { status: 400 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Remove collection item error:', error);
    return Response.json({ error: 'Failed to remove item' }, { status: 500 });
  }
}
