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

  // Verify farm ownership
  const farm = await db.execute({
    sql: 'SELECT user_id FROM farms WHERE id = ?',
    args: [farmId]
  });

  if (farm.rows.length === 0) {
    return NextResponse.json({ error: 'Farm not found' }, { status: 404 });
  }

  if (farm.rows[0].user_id !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Get max display_order
  const maxOrder = await db.execute({
    sql: 'SELECT MAX(display_order) as max_order FROM design_layers WHERE farm_id = ?',
    args: [farmId]
  });

  const nextOrder = (Number(maxOrder.rows[0]?.max_order) || 0) + 1;

  // Create layer
  const layerId = crypto.randomUUID();
  await db.execute({
    sql: `INSERT INTO design_layers
          (id, farm_id, name, color, description, display_order)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [
      layerId,
      farmId,
      body.name,
      body.color || null,
      body.description || null,
      nextOrder
    ]
  });

  const result = await db.execute({
    sql: 'SELECT * FROM design_layers WHERE id = ?',
    args: [layerId]
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

  const result = await db.execute({
    sql: 'SELECT * FROM design_layers WHERE farm_id = ? ORDER BY display_order',
    args: [farmId]
  });

  return NextResponse.json({ layers: result.rows });
}
