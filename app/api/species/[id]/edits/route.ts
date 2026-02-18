import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const result = await db.execute({
      sql: `SELECT e.*, u.name as user_name
            FROM species_content_edits e
            LEFT JOIN users u ON u.id = e.user_id
            WHERE e.species_id = ?
            ORDER BY e.created_at DESC
            LIMIT 50`,
      args: [params.id],
    });

    return Response.json({ edits: result.rows });
  } catch (error) {
    console.error('Species edits GET error:', error);
    return Response.json({ edits: [] });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const body = await request.json();
    const { field_name, original_value, proposed_value, reason } = body;

    if (!field_name || !proposed_value) {
      return Response.json({ error: 'field_name and proposed_value required' }, { status: 400 });
    }

    const id = crypto.randomUUID();
    await db.execute({
      sql: `INSERT INTO species_content_edits (id, species_id, user_id, field_name, original_value, proposed_value, reason)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [id, params.id, session.user.id, field_name, original_value || null, proposed_value, reason || null],
    });

    return Response.json({ id, message: 'Edit suggestion submitted for review' }, { status: 201 });
  } catch (error) {
    console.error('Species edit POST error:', error);
    return Response.json({ error: 'Failed to submit edit' }, { status: 500 });
  }
}
