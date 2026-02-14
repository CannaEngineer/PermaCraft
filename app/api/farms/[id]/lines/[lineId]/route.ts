import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth/session';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; lineId: string } }
) {
  const session = await requireAuth();

  const { id: farmId, lineId } = params;
  const body = await request.json();

  const updates: string[] = [];
  const args: any[] = [];

  if (body.geometry !== undefined) {
    updates.push('geometry = ?');
    args.push(typeof body.geometry === 'string' ? body.geometry : JSON.stringify(body.geometry));
  }

  if (body.line_type !== undefined) {
    updates.push('line_type = ?');
    args.push(body.line_type);
  }

  if (body.label !== undefined) {
    updates.push('label = ?');
    args.push(body.label);
  }

  if (body.style !== undefined) {
    updates.push('style = ?');
    args.push(JSON.stringify(body.style));
  }

  if (body.layer_ids !== undefined) {
    updates.push('layer_ids = ?');
    args.push(JSON.stringify(body.layer_ids));
  }

  updates.push('updated_at = unixepoch()');

  if (updates.length === 1) {
    return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
  }

  args.push(lineId);

  await db.execute({
    sql: `UPDATE lines SET ${updates.join(', ')} WHERE id = ?`,
    args
  });

  const result = await db.execute({
    sql: 'SELECT * FROM lines WHERE id = ?',
    args: [lineId]
  });

  return NextResponse.json(result.rows[0]);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; lineId: string } }
) {
  const session = await requireAuth();

  const { id: farmId, lineId } = params;

  await db.execute({
    sql: 'DELETE FROM lines WHERE id = ? AND farm_id = ?',
    args: [lineId, farmId]
  });

  return NextResponse.json({ success: true });
}
