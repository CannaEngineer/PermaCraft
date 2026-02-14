import sharp from 'sharp';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

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

const TILE_SIZE = 256;

export async function generateTiles(
  sourceKey: string,
  farmId: string,
  imageryId: string
): Promise<string> {
  // Download source image from R2
  const getCommand = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: sourceKey,
  });

  const response = await getS3Client().send(getCommand);
  const stream = response.Body as Readable;

  // Convert stream to buffer
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk as Buffer);
  }
  const imageBuffer = Buffer.concat(chunks);

  // Get image metadata
  const metadata = await sharp(imageBuffer).metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error('Failed to read image dimensions');
  }

  // For MVP: create a single tile at zoom level 18
  const tileBuffer = await sharp(imageBuffer)
    .resize(TILE_SIZE, TILE_SIZE, { fit: 'cover' })
    .png()
    .toBuffer();

  // Upload tile to R2
  const tileKey = `farms/${farmId}/imagery/${imageryId}/tiles/18/0/0.png`;
  await getS3Client().send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: tileKey,
    Body: tileBuffer,
    ContentType: 'image/png',
  }));

  // Return tile URL template
  // Use custom domain if configured, otherwise use R2.dev subdomain
  const baseUrl = process.env.R2_PUBLIC_URL
    ? process.env.R2_PUBLIC_URL
    : `https://pub-${process.env.R2_ACCOUNT_ID}.r2.dev`;

  const tileUrlTemplate = `${baseUrl}/farms/${farmId}/imagery/${imageryId}/tiles/{z}/{x}/{y}.png`;

  return tileUrlTemplate;
}
