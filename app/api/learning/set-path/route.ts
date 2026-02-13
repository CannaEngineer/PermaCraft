import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { learning_path_id } = body;

    // Allow null to reset path (for "Switch Path" action)
    // Only validate if learning_path_id is provided and not null
    if (learning_path_id !== null && learning_path_id !== undefined) {
      // Validate that the learning path exists
      const pathResult = await db.execute({
        sql: 'SELECT id FROM learning_paths WHERE id = ?',
        args: [learning_path_id],
      });

      if (pathResult.rows.length === 0) {
        return NextResponse.json(
          { error: 'Invalid learning path' },
          { status: 400 }
        );
      }
    }

    // Check if user_progress record exists
    const existingProgress = await db.execute({
      sql: 'SELECT * FROM user_progress WHERE user_id = ?',
      args: [session.user.id],
    });

    if (existingProgress.rows.length > 0) {
      // Update existing record
      await db.execute({
        sql: `
          UPDATE user_progress
          SET learning_path_id = ?, updated_at = unixepoch()
          WHERE user_id = ?
        `,
        args: [learning_path_id, session.user.id],
      });
    } else {
      // Create new record
      await db.execute({
        sql: `
          INSERT INTO user_progress (id, user_id, learning_path_id, current_level, total_xp, created_at, updated_at)
          VALUES (?, ?, ?, 0, 0, unixepoch(), unixepoch())
        `,
        args: [crypto.randomUUID(), session.user.id, learning_path_id],
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error setting learning path:', error);
    return NextResponse.json(
      { error: 'Failed to set learning path' },
      { status: 500 }
    );
  }
}
