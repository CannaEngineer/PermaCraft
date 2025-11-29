import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
  throw new Error("R2 credentials not configured");
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
  const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(base64Data, "base64");

  const key = `farms/${farmId}/snapshots/${Date.now()}-${type}.png`;

  await r2.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      Body: buffer,
      ContentType: "image/png",
    })
  );

  // Return public URL (configure R2 bucket to allow public access)
  return `https://pub-${process.env.R2_ACCOUNT_ID}.r2.dev/${key}`;
}
