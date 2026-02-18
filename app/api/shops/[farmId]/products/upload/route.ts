// app/api/shops/[farmId]/products/upload/route.ts
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { headers } from 'next/headers';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

let r2: S3Client | null = null;

function getR2Client(): S3Client {
  if (!r2) {
    r2 = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });
  }
  return r2;
}

async function verifyOwnership(farmId: string, userId: string) {
  const result = await db.execute({
    sql: 'SELECT id FROM farms WHERE id = ? AND user_id = ?',
    args: [farmId, userId],
  });
  return result.rows.length > 0;
}

export async function POST(
  req: Request,
  { params }: { params: { farmId: string } }
) {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) return new Response('Unauthorized', { status: 401 });

  const owned = await verifyOwnership(params.farmId, session.user.id);
  if (!owned) return new Response('Forbidden', { status: 403 });

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file) return Response.json({ error: 'No file provided' }, { status: 400 });
  if (!file.type.startsWith('image/')) return Response.json({ error: 'File must be an image' }, { status: 400 });
  if (file.size > 5 * 1024 * 1024) return Response.json({ error: 'File too large (max 5MB)' }, { status: 400 });

  const ext = file.type.split('/')[1] || 'jpg';
  const key = `shops/${params.farmId}/products/${crypto.randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  await getR2Client().send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
    Body: buffer,
    ContentType: file.type,
    CacheControl: 'public, max-age=31536000',
  }));

  const url = process.env.R2_PUBLIC_URL
    ? `${process.env.R2_PUBLIC_URL}/${key}`
    : `/api/shops/${params.farmId}/products/upload`;

  return Response.json({ url });
}
