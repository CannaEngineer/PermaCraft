import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; layerId: string } }
) {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: farmId, layerId } = params;
  const body = await request.json();

  // Build update query
  const updates: string[] = [];
  const args: any[] = [];

  if (body.name !== undefined) {
    updates.push('name = ?');
    args.push(body.name);
  }

  if (body.color !== undefined) {
    updates.push('color = ?');
    args.push(body.color);
  }

  if (body.description !== undefined) {
    updates.push('description = ?');
    args.push(body.description);
  }

  if (body.visible !== undefined) {
    updates.push('visible = ?');
    args.push(body.visible ? 1 : 0);
  }

  if (body.locked !== undefined) {
    updates.push('locked = ?');
    args.push(body.locked ? 1 : 0);
  }

  if (body.display_order !== undefined) {
    updates.push('display_order = ?');
    args.push(body.display_order);
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
  }

  args.push(layerId);

  await db.execute({
    sql: `UPDATE design_layers SET ${updates.join(', ')} WHERE id = ?`,
    args
  });

  const result = await db.execute({
    sql: 'SELECT * FROM design_layers WHERE id = ?',
    args: [layerId]
  });

  return NextResponse.json(result.rows[0]);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; layerId: string } }
) {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: farmId, layerId } = params;

  await db.execute({
    sql: 'DELETE FROM design_layers WHERE id = ? AND farm_id = ?',
    args: [layerId, farmId]
  });

  return NextResponse.json({ success: true });
}
