import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const result = await db.execute({
      sql: `SELECT c.*, COUNT(ci.id) as item_count
            FROM collections c
            LEFT JOIN collection_items ci ON c.id = ci.collection_id
            WHERE c.is_public = 1
            GROUP BY c.id
            ORDER BY c.is_featured DESC, c.created_at DESC
            LIMIT 20`,
      args: []
    });
    return Response.json(result.rows);
  } catch (error) {
    return new Response('Internal server error', { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();

    const { title, description, is_public } = body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return Response.json({ error: 'Title is required' }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);

    await db.execute({
      sql: `INSERT INTO collections (id, title, description, curator_id, is_featured, is_public, created_at, updated_at)
            VALUES (?, ?, ?, ?, 0, ?, ?, ?)`,
      args: [id, title.trim(), description?.trim() || null, session.user.id, is_public ? 1 : 0, now, now],
    });

    const result = await db.execute({
      sql: 'SELECT * FROM collections WHERE id = ?',
      args: [id],
    });

    return Response.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error('Create collection error:', error);
    return Response.json({ error: 'Failed to create collection' }, { status: 500 });
  }
}
