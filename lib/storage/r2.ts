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

let r2: S3Client | null = null;

function getR2Client(): S3Client {
  if (!r2) {
    if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
      throw new Error("R2 credentials not configured - see lib/storage/r2.ts for setup instructions");
    }

    r2 = new S3Client({
      region: "auto",
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    });
  }
  return r2;
}

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

  await getR2Client().send(
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

/**
 * Download an image from a URL and upload it to R2
 * Used for blog cover images from AI generation services
 */
export async function uploadImageFromUrl(
  url: string,
  folder: string,
  filename: string
): Promise<string> {
  console.log(`Downloading image from URL: ${url.substring(0, 100)}...`);

  try {
    // Download the image
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length === 0) {
      throw new Error('Downloaded image is empty');
    }

    // Determine content type from response or default to image/png
    const contentType = response.headers.get('content-type') || 'image/png';

    const key = `${folder}/${Date.now()}-${filename}`;

    console.log('Uploading downloaded image to R2:', {
      bucket: process.env.R2_BUCKET_NAME,
      key,
      bufferSize: buffer.length,
      contentType,
    });

    await getR2Client().send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000',
      })
    );

    const publicUrl = process.env.R2_PUBLIC_URL
      ? `${process.env.R2_PUBLIC_URL}/${key}`
      : url; // Fallback to original URL if no R2 public URL configured

    console.log('Image uploaded to R2:', {
      key,
      publicUrl: publicUrl.substring(0, 100),
      usingCustomDomain: !!process.env.R2_PUBLIC_URL,
    });

    return publicUrl;
  } catch (error: any) {
    console.error('Failed to upload image from URL:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    // Return original URL as fallback
    return url;
  }
}
