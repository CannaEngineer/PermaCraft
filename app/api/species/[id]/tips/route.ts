import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const result = await db.execute({
      sql: `SELECT t.*, u.name as user_name
            FROM species_tips t
            LEFT JOIN users u ON u.id = t.user_id
            WHERE t.species_id = ? AND t.is_approved = 1
            ORDER BY t.upvote_count DESC, t.created_at DESC
            LIMIT 20`,
      args: [params.id],
    });

    return Response.json({ tips: result.rows });
  } catch (error) {
    console.error('Species tips GET error:', error);
    return Response.json({ tips: [] });
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
    const content = body.content?.trim();

    if (!content || content.length < 5 || content.length > 500) {
      return Response.json({ error: 'Tip must be 5-500 characters' }, { status: 400 });
    }

    const id = crypto.randomUUID();
    await db.execute({
      sql: `INSERT INTO species_tips (id, species_id, user_id, content)
            VALUES (?, ?, ?, ?)`,
      args: [id, params.id, session.user.id, content],
    });

    return Response.json({
      id,
      species_id: params.id,
      user_id: session.user.id,
      content,
      upvote_count: 0,
      report_count: 0,
      is_approved: 1,
      created_at: Math.floor(Date.now() / 1000),
      updated_at: Math.floor(Date.now() / 1000),
    }, { status: 201 });
  } catch (error) {
    console.error('Species tip POST error:', error);
    return Response.json({ error: 'Failed to create tip' }, { status: 500 });
  }
}
