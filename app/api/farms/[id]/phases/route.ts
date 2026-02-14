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

  if (!body.name) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 }
    );
  }

  // Get next display order
  const maxOrder = await db.execute({
    sql: 'SELECT MAX(display_order) as max_order FROM phases WHERE farm_id = ?',
    args: [farmId]
  });

  const nextOrder = (Number(maxOrder.rows[0]?.max_order) || 0) + 1;

  const phaseId = crypto.randomUUID();
  await db.execute({
    sql: `INSERT INTO phases
          (id, farm_id, name, description, start_date, end_date, color, display_order)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      phaseId,
      farmId,
      body.name,
      body.description || null,
      body.start_date || null,
      body.end_date || null,
      body.color || '#3b82f6',
      nextOrder
    ]
  });

  const result = await db.execute({
    sql: 'SELECT * FROM phases WHERE id = ?',
    args: [phaseId]
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
    sql: 'SELECT * FROM phases WHERE farm_id = ? ORDER BY display_order ASC',
    args: [farmId]
  });

  return NextResponse.json({ phases: result.rows });
}
