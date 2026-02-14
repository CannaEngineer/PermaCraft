import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { getLineTypeConfig } from '@/lib/map/line-types';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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

  return NextResponse.json(result.rows[0], { status: 201 });
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const farmId = params.id;
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

  // Parse JSON fields
  const lines = result.rows.map(row => ({
    ...row,
    style: row.style ? JSON.parse(row.style as string) : null,
    layer_ids: row.layer_ids ? JSON.parse(row.layer_ids as string) : []
  }));

  return NextResponse.json({ lines });
}
