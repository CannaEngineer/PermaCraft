import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';

// GET /api/learning/contextual-hints - Get contextual hints based on trigger
export async function GET(request: NextRequest) {
  const session = await getSession();

  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const triggerType = searchParams.get('trigger');

  if (!triggerType) {
    return Response.json({ error: 'Missing trigger parameter' }, { status: 400 });
  }

  try {
    // Get hint for this trigger type
    const hintResult = await db.execute({
      sql: 'SELECT * FROM contextual_hints WHERE trigger_type = ? ORDER BY priority LIMIT 1',
      args: [triggerType],
    });

    if (hintResult.rows.length === 0) {
      return Response.json({ hint: null });
    }

    const hint = hintResult.rows[0] as any;

    // Check if user has already dismissed this hint
    const dismissalResult = await db.execute({
      sql: 'SELECT * FROM user_hint_dismissals WHERE user_id = ? AND hint_id = ?',
      args: [session.user.id, hint.id],
    });

    if (dismissalResult.rows.length > 0) {
      // User has already dismissed this hint
      return Response.json({ hint: null });
    }

    // Get lesson info
    const lessonResult = await db.execute({
      sql: 'SELECT id, title, slug FROM lessons WHERE id = ?',
      args: [hint.lesson_id],
    });

    const lesson = lessonResult.rows[0] as any;

    return Response.json({
      hint: {
        ...hint,
        lesson,
      },
    });
  } catch (error: any) {
    console.error('Error fetching contextual hints:', error);
    return Response.json(
      { error: 'Failed to fetch hints', details: error.message },
      { status: 500 }
    );
  }
}

// POST /api/learning/contextual-hints/dismiss - Dismiss a hint
export async function POST(request: NextRequest) {
  const session = await getSession();

  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const body = await request.json();
    const { hint_id } = body;

    if (!hint_id) {
      return Response.json({ error: 'Missing hint_id' }, { status: 400 });
    }

    // Record dismissal
    const id = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);

    await db.execute({
      sql: `
        INSERT INTO user_hint_dismissals (id, user_id, hint_id, dismissed_at)
        VALUES (?, ?, ?, ?)
      `,
      args: [id, session.user.id, hint_id, now],
    });

    return Response.json({ success: true });
  } catch (error: any) {
    console.error('Error dismissing hint:', error);
    return Response.json(
      { error: 'Failed to dismiss hint', details: error.message },
      { status: 500 }
    );
  }
}
