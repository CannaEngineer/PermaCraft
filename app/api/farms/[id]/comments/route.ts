import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth/session';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const farmId = params.id;
  const body = await request.json();

  if (!body.content) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 }
    );
  }

  // Check collaborator permissions (must be commenter or above)
  const collaborator = await db.execute({
    sql: `SELECT role FROM farm_collaborators
          WHERE farm_id = ? AND user_id = ?`,
    args: [farmId, session.user.id]
  });

  if (collaborator.rows.length === 0) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Create comment
  const commentId = crypto.randomUUID();
  await db.execute({
    sql: `INSERT INTO comments
          (id, farm_id, user_id, feature_id, feature_type, content, parent_comment_id)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
      commentId,
      farmId,
      session.user.id,
      body.feature_id || null,
      body.feature_type || 'general',
      body.content,
      body.parent_comment_id || null
    ]
  });

  const result = await db.execute({
    sql: 'SELECT * FROM comments WHERE id = ?',
    args: [commentId]
  });

  return NextResponse.json(result.rows[0], { status: 201 });
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const farmId = params.id;
  const { searchParams } = new URL(request.url);
  const featureId = searchParams.get('feature_id');
  const includeResolved = searchParams.get('include_resolved') === 'true';

  let sql = `SELECT c.*, u.name as user_name, u.email as user_email
             FROM comments c
             JOIN users u ON c.user_id = u.id
             WHERE c.farm_id = ?`;
  const args: any[] = [farmId];

  if (featureId) {
    sql += ' AND c.feature_id = ?';
    args.push(featureId);
  }

  if (!includeResolved) {
    sql += ' AND c.resolved = 0';
  }

  sql += ' ORDER BY c.created_at ASC';

  const result = await db.execute({ sql, args });

  return NextResponse.json({ comments: result.rows });
}
