import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; plantingId: string } }
) {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: farmId, plantingId } = params;
  const body = await request.json();

  if (!Array.isArray(body.layer_ids)) {
    return NextResponse.json(
      { error: 'layer_ids must be an array' },
      { status: 400 }
    );
  }

  await db.execute({
    sql: 'UPDATE plantings SET layer_ids = ? WHERE id = ? AND farm_id = ?',
    args: [JSON.stringify(body.layer_ids), plantingId, farmId]
  });

  const result = await db.execute({
    sql: 'SELECT * FROM plantings WHERE id = ?',
    args: [plantingId]
  });

  return NextResponse.json(result.rows[0]);
}
