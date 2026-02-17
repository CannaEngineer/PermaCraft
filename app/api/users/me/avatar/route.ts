import { requireAuth } from '@/lib/auth/session';
import { db } from '@/lib/db';
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

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return Response.json({ error: 'File must be an image' }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return Response.json({ error: 'File too large (max 5MB)' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.type.split('/')[1] || 'png';
    const key = `users/${session.user.id}/avatar-${Date.now()}.${ext}`;

    await getR2Client().send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: key,
        Body: buffer,
        ContentType: file.type,
        CacheControl: 'public, max-age=31536000',
      })
    );

    const publicUrl = process.env.R2_PUBLIC_URL
      ? `${process.env.R2_PUBLIC_URL}/${key}`
      : `/api/users/me/avatar`;

    await db.execute({
      sql: 'UPDATE users SET image = ? WHERE id = ?',
      args: [publicUrl, session.user.id],
    });

    return Response.json({ image: publicUrl });
  } catch (error) {
    console.error('Avatar upload error:', error);
    return Response.json({ error: 'Failed to upload avatar' }, { status: 500 });
  }
}
