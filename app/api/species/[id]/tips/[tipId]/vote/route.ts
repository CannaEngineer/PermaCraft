import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';

export async function POST(
  request: Request,
  { params }: { params: { id: string; tipId: string } }
) {
  const session = await getSession();
  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const body = await request.json();
    const voteType = body.vote_type;

    if (voteType !== 'upvote' && voteType !== 'report') {
      return Response.json({ error: 'vote_type must be upvote or report' }, { status: 400 });
    }

    // Check for existing vote
    const existing = await db.execute({
      sql: 'SELECT id FROM species_tip_votes WHERE tip_id = ? AND user_id = ?',
      args: [params.tipId, session.user.id],
    });

    if (existing.rows.length > 0) {
      return Response.json({ error: 'Already voted' }, { status: 409 });
    }

    const id = crypto.randomUUID();
    await db.execute({
      sql: 'INSERT INTO species_tip_votes (id, tip_id, user_id, vote_type) VALUES (?, ?, ?, ?)',
      args: [id, params.tipId, session.user.id, voteType],
    });

    // Update count on tip
    const countField = voteType === 'upvote' ? 'upvote_count' : 'report_count';
    await db.execute({
      sql: `UPDATE species_tips SET ${countField} = ${countField} + 1 WHERE id = ?`,
      args: [params.tipId],
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Tip vote error:', error);
    return Response.json({ error: 'Failed to vote' }, { status: 500 });
  }
}
