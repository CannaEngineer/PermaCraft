import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { generateUploadUrl } from '@/lib/storage/imagery-upload';

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

  if (!body.filename || !body.label) {
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

  // Create imagery record
  const imageryId = crypto.randomUUID();

  // Generate signed upload URL
  const { uploadUrl, objectKey } = await generateUploadUrl(
    farmId,
    imageryId,
    body.filename
  );

  // Create database record
  await db.execute({
    sql: `INSERT INTO custom_imagery
          (id, farm_id, user_id, label, source_url, bounds, processing_status)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
      imageryId,
      farmId,
      session.user.id,
      body.label,
      objectKey,
      JSON.stringify(body.bounds || [[-180, -90], [180, 90]]), // Default bounds
      'pending'
    ]
  });

  return NextResponse.json({
    imageryId,
    uploadUrl,
    objectKey
  });
}
