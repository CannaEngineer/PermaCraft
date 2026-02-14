import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth/session';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; commentId: string } }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { commentId } = params;
  const body = await request.json();

  const updates: string[] = [];
  const args: any[] = [];

  if (body.content !== undefined) {
    updates.push('content = ?');
    args.push(body.content);
  }

  if (body.resolved !== undefined) {
    updates.push('resolved = ?');
    args.push(body.resolved ? 1 : 0);
  }

  updates.push('updated_at = unixepoch()');

  if (updates.length === 1) {
    return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
  }

  args.push(commentId);

  await db.execute({
    sql: `UPDATE comments SET ${updates.join(', ')} WHERE id = ?`,
    args
  });

  const result = await db.execute({
    sql: 'SELECT * FROM comments WHERE id = ?',
    args: [commentId]
  });

  return NextResponse.json(result.rows[0]);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; commentId: string } }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { commentId } = params;

  // Check ownership
  const comment = await db.execute({
    sql: 'SELECT user_id FROM comments WHERE id = ?',
    args: [commentId]
  });

  if (comment.rows.length === 0) {
    return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
  }

  if (comment.rows[0].user_id !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await db.execute({
    sql: 'DELETE FROM comments WHERE id = ?',
    args: [commentId]
  });

  return NextResponse.json({ success: true });
}
