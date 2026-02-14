import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
      throw new Error('R2 credentials not configured');
    }

    s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    });
  }
  return s3Client;
}

export async function generateUploadUrl(
  farmId: string,
  imageryId: string,
  filename: string
): Promise<{ uploadUrl: string; objectKey: string }> {
  const objectKey = `farms/${farmId}/imagery/${imageryId}/${filename}`;

  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: objectKey,
    ContentType: 'image/jpeg', // or detect from filename
  });

  const uploadUrl = await getSignedUrl(getS3Client(), command, { expiresIn: 3600 });

  return { uploadUrl, objectKey };
}

export function getPublicUrl(objectKey: string): string {
  // Use custom domain if configured, otherwise use R2.dev subdomain
  if (process.env.R2_PUBLIC_URL) {
    return `${process.env.R2_PUBLIC_URL}/${objectKey}`;
  }
  // Fallback to R2.dev subdomain (requires public access to be enabled)
  return `https://pub-${process.env.R2_ACCOUNT_ID}.r2.dev/${objectKey}`;
}
