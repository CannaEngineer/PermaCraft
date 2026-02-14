import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

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
  if (!body.feature_id || !body.feature_type || !body.design_rationale) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 }
    );
  }

  // Verify farm ownership or collaboration
  const farm = await db.execute({
    sql: 'SELECT user_id FROM farms WHERE id = ?',
    args: [farmId]
  });

  if (farm.rows.length === 0) {
    return NextResponse.json({ error: 'Farm not found' }, { status: 404 });
  }

  if (farm.rows[0].user_id !== session.user.id) {
    // TODO: Check collaboration permissions when Track 3 is implemented
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Create annotation
  const annotationId = crypto.randomUUID();
  await db.execute({
    sql: `INSERT INTO annotations
          (id, farm_id, feature_id, feature_type, design_rationale, rich_notes, tags, created_by)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      annotationId,
      farmId,
      body.feature_id,
      body.feature_type,
      body.design_rationale,
      body.rich_notes || null,
      body.tags ? JSON.stringify(body.tags) : null,
      session.user.id
    ]
  });

  // Retrieve created annotation
  const result = await db.execute({
    sql: 'SELECT * FROM annotations WHERE id = ?',
    args: [annotationId]
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
  const featureId = searchParams.get('feature_id');
  const featureType = searchParams.get('feature_type');

  let sql = 'SELECT * FROM annotations WHERE farm_id = ?';
  const args: any[] = [farmId];

  if (featureId) {
    sql += ' AND feature_id = ?';
    args.push(featureId);
  }

  if (featureType) {
    sql += ' AND feature_type = ?';
    args.push(featureType);
  }

  sql += ' ORDER BY created_at DESC';

  const result = await db.execute({ sql, args });

  // Parse tags JSON
  const annotations = result.rows.map(row => ({
    ...row,
    tags: row.tags ? JSON.parse(row.tags as string) : []
  }));

  return NextResponse.json({ annotations });
}
