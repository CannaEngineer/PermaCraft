import { requireAuth, getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { NextRequest } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getSession();

    const result = await db.execute({
      sql: `
        SELECT c.*, u.name as curator_name, u.image as curator_image,
               COUNT(ci.id) as item_count
        FROM collections c
        JOIN users u ON c.curator_id = u.id
        LEFT JOIN collection_items ci ON c.id = ci.collection_id
        WHERE c.id = ?
        GROUP BY c.id
      `,
      args: [id],
    });

    if (result.rows.length === 0) {
      return Response.json({ error: 'Collection not found' }, { status: 404 });
    }

    const collection = result.rows[0] as any;

    // Check visibility
    if (!collection.is_public && collection.curator_id !== session?.user.id) {
      return Response.json({ error: 'Collection not found' }, { status: 404 });
    }

    // Get items with details
    const itemsResult = await db.execute({
      sql: `
        SELECT ci.*,
               f.name as farm_name, f.description as farm_description,
               p.content as post_content, p.post_type, p.media_urls,
               u.name as post_author_name, u.image as post_author_image
        FROM collection_items ci
        LEFT JOIN farms f ON ci.farm_id = f.id
        LEFT JOIN farm_posts p ON ci.post_id = p.id
        LEFT JOIN users u ON p.author_id = u.id
        WHERE ci.collection_id = ?
        ORDER BY ci.display_order ASC, ci.added_at DESC
      `,
      args: [id],
    });

    return Response.json({
      ...collection,
      items: itemsResult.rows,
    });
  } catch (error) {
    console.error('Get collection error:', error);
    return Response.json({ error: 'Failed to load collection' }, { status: 500 });
  }
}

export async function PATCH(
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

    const updates: string[] = [];
    const args: any[] = [];

    if (body.title !== undefined) {
      updates.push('title = ?');
      args.push(body.title);
    }
    if (body.description !== undefined) {
      updates.push('description = ?');
      args.push(body.description || null);
    }
    if (body.is_public !== undefined) {
      updates.push('is_public = ?');
      args.push(body.is_public ? 1 : 0);
    }
    if (body.cover_image_url !== undefined) {
      updates.push('cover_image_url = ?');
      args.push(body.cover_image_url || null);
    }

    if (updates.length === 0) {
      return Response.json({ error: 'No fields to update' }, { status: 400 });
    }

    updates.push('updated_at = ?');
    args.push(Math.floor(Date.now() / 1000));
    args.push(id);

    await db.execute({
      sql: `UPDATE collections SET ${updates.join(', ')} WHERE id = ?`,
      args,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Update collection error:', error);
    return Response.json({ error: 'Failed to update collection' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;

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

    await db.execute({
      sql: 'DELETE FROM collection_items WHERE collection_id = ?',
      args: [id],
    });
    await db.execute({
      sql: 'DELETE FROM collections WHERE id = ?',
      args: [id],
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Delete collection error:', error);
    return Response.json({ error: 'Failed to delete collection' }, { status: 500 });
  }
}
