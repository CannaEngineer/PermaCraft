import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth/session';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const annotationId = params.id;
  const formData = await request.formData();
  const file = formData.get('file') as File;
  const caption = formData.get('caption') as string | null;
  const displayOrder = parseInt(formData.get('display_order') as string || '0');

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  // Verify annotation exists
  const annotation = await db.execute({
    sql: 'SELECT * FROM annotations WHERE id = ?',
    args: [annotationId]
  });

  if (annotation.rows.length === 0) {
    return NextResponse.json({ error: 'Annotation not found' }, { status: 404 });
  }

  // Generate unique file path
  const mediaId = crypto.randomUUID();
  const fileExtension = file.name.split('.').pop();
  const fileName = `${mediaId}.${fileExtension}`;
  const farmId = annotation.rows[0].farm_id;
  const filePath = `farms/${farmId}/annotations/${annotationId}/${fileName}`;

  // Upload original file to R2
  const fileBuffer = Buffer.from(await file.arrayBuffer());
  await r2.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: filePath,
    Body: fileBuffer,
    ContentType: file.type,
  }));

  const fileUrl = `https://${process.env.R2_PUBLIC_URL}/${filePath}`;

  // Generate thumbnail for images
  let thumbnailUrl: string | null = null;

  if (file.type.startsWith('image/')) {
    try {
      const thumbnailBuffer = await sharp(fileBuffer)
        .resize(300, 300, { fit: 'cover', position: 'centre' })
        .jpeg({ quality: 80 })
        .toBuffer();

      const thumbPath = `farms/${farmId}/annotations/${annotationId}/${mediaId}_thumb.jpg`;

      await r2.send(new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: thumbPath,
        Body: thumbnailBuffer,
        ContentType: 'image/jpeg',
      }));

      thumbnailUrl = `https://${process.env.R2_PUBLIC_URL}/${thumbPath}`;
    } catch (thumbError) {
      console.error('Thumbnail generation failed, continuing without thumbnail:', thumbError);
    }
  }

  // Create media attachment record
  await db.execute({
    sql: `INSERT INTO media_attachments
          (id, annotation_id, type, file_url, thumbnail_url, caption, display_order)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
      mediaId,
      annotationId,
      file.type.startsWith('video/') ? 'video' : 'image',
      fileUrl,
      thumbnailUrl,
      caption,
      displayOrder
    ]
  });

  // Retrieve created media attachment
  const result = await db.execute({
    sql: 'SELECT * FROM media_attachments WHERE id = ?',
    args: [mediaId]
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

  const annotationId = params.id;

  const result = await db.execute({
    sql: 'SELECT * FROM media_attachments WHERE annotation_id = ? ORDER BY display_order',
    args: [annotationId]
  });

  return NextResponse.json({ media: result.rows });
}
