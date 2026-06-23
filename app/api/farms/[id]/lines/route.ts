import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth/session';
import { getLineTypeConfig } from '@/lib/map/line-types';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await requireAuth();

  const farmId = params.id;
  const body = await request.json();

  // Validate required fields
  if (!body.geometry || !body.line_type) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 }
    );
  }

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

  // Get default style if not provided
  const lineTypeConfig = getLineTypeConfig(body.line_type);
  const style = body.style || lineTypeConfig.defaultStyle;

  // Create line
  const lineId = crypto.randomUUID();
  await db.execute({
    sql: `INSERT INTO lines
          (id, farm_id, user_id, geometry, line_type, label, style, layer_ids)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      lineId,
      farmId,
      session.user.id,
      typeof body.geometry === 'string' ? body.geometry : JSON.stringify(body.geometry),
      body.line_type,
      body.label || null,
      JSON.stringify(style),
      body.layer_ids ? JSON.stringify(body.layer_ids) : null
    ]
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

  return NextResponse.json({ ...row, style: parsedStyle, layer_ids: parsedLayerIds }, { status: 201 });
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await requireAuth();

  const farmId = params.id;

  const farmCheck = await db.execute({
    sql: 'SELECT id, user_id, is_public FROM farms WHERE id = ?',
    args: [farmId]
  });
  if (farmCheck.rows.length === 0) {
    return NextResponse.json({ error: 'Farm not found' }, { status: 404 });
  }
  const farm = farmCheck.rows[0];
  if (farm.user_id !== session.user.id && !farm.is_public) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const lineType = searchParams.get('line_type');

  let sql = 'SELECT * FROM lines WHERE farm_id = ?';
  const args: any[] = [farmId];

  if (lineType) {
    sql += ' AND line_type = ?';
    args.push(lineType);
  }

  sql += ' ORDER BY created_at DESC';

  const result = await db.execute({ sql, args });

  const lines = result.rows.map(row => {
    let style = null;
    let layer_ids: string[] = [];
    try {
      if (row.style) style = JSON.parse(row.style as string);
    } catch {
      console.error(`Corrupted style JSON for line ${row.id}`);
    }
    try {
      if (row.layer_ids) layer_ids = JSON.parse(row.layer_ids as string);
    } catch {
      console.error(`Corrupted layer_ids JSON for line ${row.id}`);
    }
    return { ...row, style, layer_ids };
  });

  return NextResponse.json({ lines });
}
