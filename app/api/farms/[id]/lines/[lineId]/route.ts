import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth/session';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; lineId: string } }
) {
  const session = await requireAuth();

  const { id: farmId, lineId } = params;

  const lineCheck = await db.execute({
    sql: `SELECT l.id FROM lines l
          JOIN farms f ON l.farm_id = f.id
          WHERE l.id = ? AND l.farm_id = ? AND f.user_id = ?`,
    args: [lineId, farmId, session.user.id]
  });

  if (lineCheck.rows.length === 0) {
    return NextResponse.json({ error: 'Line not found or access denied' }, { status: 404 });
  }

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

  const row = result.rows[0];
  let parsedStyle = null;
  let parsedLayerIds: string[] = [];
  try {
    if (row.style) parsedStyle = JSON.parse(row.style as string);
  } catch { /* use null */ }
  try {
    if (row.layer_ids) parsedLayerIds = JSON.parse(row.layer_ids as string);
  } catch { /* use [] */ }

  return NextResponse.json({ ...row, style: parsedStyle, layer_ids: parsedLayerIds });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; lineId: string } }
) {
  const session = await requireAuth();

  const { id: farmId, lineId } = params;

  const lineCheck = await db.execute({
    sql: `SELECT l.id FROM lines l
          JOIN farms f ON l.farm_id = f.id
          WHERE l.id = ? AND l.farm_id = ? AND f.user_id = ?`,
    args: [lineId, farmId, session.user.id]
  });

  if (lineCheck.rows.length === 0) {
    return NextResponse.json({ error: 'Line not found or access denied' }, { status: 404 });
  }

  await db.execute({
    sql: 'DELETE FROM lines WHERE id = ?',
    args: [lineId]
  });

  return NextResponse.json({ success: true });
}
