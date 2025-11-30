/**
 * Cloudflare R2 Storage for Map Screenshots
 *
 * IMPORTANT: R2 buckets require public access configuration!
 * See detailed setup guide: scripts/setup-r2-cors.md
 *
 * Quick Start:
 * 1. Create R2 bucket in Cloudflare dashboard
 * 2. Enable public access via custom domain or R2.dev subdomain
 * 3. Set R2_PUBLIC_URL environment variable
 * 4. If R2_PUBLIC_URL is not set, system falls back to base64 storage
 *
 * Environment variables needed:
 * - R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME
 * - R2_PUBLIC_URL (required for viewing screenshots, otherwise uses base64)
 */

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
  throw new Error("R2 credentials not configured - see lib/storage/r2.ts for setup instructions");
}

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

export async function uploadScreenshot(
  farmId: string,
  imageData: string,
  type: string
): Promise<string> {
  // Handle both data URL and raw base64
  let base64Data = imageData;
  if (imageData.startsWith('data:')) {
    // Remove data URL prefix (e.g., "data:image/png;base64,")
    const matches = imageData.match(/^data:image\/\w+;base64,(.+)$/);
    if (matches && matches[1]) {
      base64Data = matches[1];
    } else {
      console.error("Failed to parse data URL:", imageData.substring(0, 100));
      throw new Error("Invalid image data URL format");
    }
  }

  console.log("Base64 data info:", {
    originalLength: imageData.length,
    base64Length: base64Data.length,
    startsWithData: imageData.startsWith('data:'),
    preview: base64Data.substring(0, 50),
  });

  const buffer = Buffer.from(base64Data, "base64");

  if (buffer.length === 0) {
    throw new Error("Decoded image buffer is empty");
  }

  const key = `farms/${farmId}/snapshots/${Date.now()}-${type}.png`;

  console.log("Uploading to R2:", {
    bucket: process.env.R2_BUCKET_NAME,
    key,
    bufferSize: buffer.length,
    bufferPreview: buffer.slice(0, 20).toString('hex'),
  });

  await r2.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      Body: buffer,
      ContentType: "image/png",
      // Add cache control and CORS headers
      CacheControl: "public, max-age=31536000",
    })
  );

  // R2 public URL requires custom domain or public bucket configuration
  // Default .r2.cloudflarestorage.com URLs are NOT publicly accessible
  const publicUrl = process.env.R2_PUBLIC_URL
    ? `${process.env.R2_PUBLIC_URL}/${key}`
    : imageData; // Fallback to base64 if no public URL configured

  console.log("Screenshot uploaded to R2:", {
    key,
    publicUrl: publicUrl.substring(0, 100),
    usingCustomDomain: !!process.env.R2_PUBLIC_URL,
  });

  return publicUrl;
}
