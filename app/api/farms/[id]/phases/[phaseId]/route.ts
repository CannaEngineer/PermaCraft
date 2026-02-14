import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth/session';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; phaseId: string } }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { phaseId } = params;
  const body = await request.json();

  const updates: string[] = [];
  const args: any[] = [];

  if (body.name !== undefined) {
    updates.push('name = ?');
    args.push(body.name);
  }

  if (body.description !== undefined) {
    updates.push('description = ?');
    args.push(body.description);
  }

  if (body.start_date !== undefined) {
    updates.push('start_date = ?');
    args.push(body.start_date);
  }

  if (body.end_date !== undefined) {
    updates.push('end_date = ?');
    args.push(body.end_date);
  }

  if (body.color !== undefined) {
    updates.push('color = ?');
    args.push(body.color);
  }

  if (body.display_order !== undefined) {
    updates.push('display_order = ?');
    args.push(body.display_order);
  }

  updates.push('updated_at = unixepoch()');

  if (updates.length === 1) {
    return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
  }

  args.push(phaseId);

  await db.execute({
    sql: `UPDATE phases SET ${updates.join(', ')} WHERE id = ?`,
    args
  });

  const result = await db.execute({
    sql: 'SELECT * FROM phases WHERE id = ?',
    args: [phaseId]
  });

  return NextResponse.json(result.rows[0]);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; phaseId: string } }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { phaseId } = params;

  // Unassign features from this phase
  await db.execute({
    sql: 'UPDATE zones SET phase_id = NULL WHERE phase_id = ?',
    args: [phaseId]
  });

  await db.execute({
    sql: 'UPDATE plantings SET phase_id = NULL WHERE phase_id = ?',
    args: [phaseId]
  });

  // Note: lines table from Track 2 not yet merged
  // When Track 2 is merged, add: UPDATE lines SET phase_id = NULL WHERE phase_id = ?

  await db.execute({
    sql: 'DELETE FROM phases WHERE id = ?',
    args: [phaseId]
  });

  return NextResponse.json({ success: true });
}
