import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; annotationId: string } }
) {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: farmId, annotationId } = params;
  const body = await request.json();

  // Verify annotation exists and user has permission
  const annotation = await db.execute({
    sql: 'SELECT * FROM annotations WHERE id = ? AND farm_id = ?',
    args: [annotationId, farmId]
  });

  if (annotation.rows.length === 0) {
    return NextResponse.json({ error: 'Annotation not found' }, { status: 404 });
  }

  // Build update query dynamically
  const updates: string[] = [];
  const args: any[] = [];

  if (body.design_rationale !== undefined) {
    updates.push('design_rationale = ?');
    args.push(body.design_rationale);
  }

  if (body.rich_notes !== undefined) {
    updates.push('rich_notes = ?');
    args.push(body.rich_notes);
  }

  if (body.tags !== undefined) {
    updates.push('tags = ?');
    args.push(JSON.stringify(body.tags));
  }

  updates.push('updated_at = unixepoch()');

  if (updates.length === 1) {
    // Only updated_at, nothing to update
    return NextResponse.json(annotation.rows[0]);
  }

  args.push(annotationId);

  await db.execute({
    sql: `UPDATE annotations SET ${updates.join(', ')} WHERE id = ?`,
    args
  });

  // Retrieve updated annotation
  const result = await db.execute({
    sql: 'SELECT * FROM annotations WHERE id = ?',
    args: [annotationId]
  });

  return NextResponse.json(result.rows[0]);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; annotationId: string } }
) {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: farmId, annotationId } = params;

  // Delete annotation (CASCADE will handle media_attachments and external_links)
  const result = await db.execute({
    sql: 'DELETE FROM annotations WHERE id = ? AND farm_id = ?',
    args: [annotationId, farmId]
  });

  if (result.rowsAffected === 0) {
    return NextResponse.json({ error: 'Annotation not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
