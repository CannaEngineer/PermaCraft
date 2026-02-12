import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

// Function to generate public URL for audio files in R2
export const getAudioUrl = (audioKey: string): string => {
  // Using the same environment variables as screenshots
  const { R2_PUBLIC_URL } = process.env;

  if (!R2_PUBLIC_URL) {
    throw new Error('R2_PUBLIC_URL environment variable not configured for audio');
  }

  return `${R2_PUBLIC_URL}/${audioKey}`;
};

// Function to upload audio file to R2 (for admin use)
export const uploadAudio = async (audioKey: string, audioBuffer: Buffer, contentType: string = 'audio/mpeg'): Promise<void> => {
  if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY || !process.env.R2_BUCKET_NAME) {
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

  try {
    await r2.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: audioKey,
        Body: audioBuffer,
        ContentType: contentType,
        // Add cache control for audio files
        CacheControl: "public, max-age=31536000",
      })
    );
  } catch (error) {
    console.error('Error uploading audio to R2:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
};

// Function to delete audio file from R2 (for admin use)
export const deleteAudio = async (audioKey: string): Promise<void> => {
  if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY || !process.env.R2_BUCKET_NAME) {
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

  try {
    await r2.send(
      new DeleteObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: audioKey,
      })
    );
  } catch (error) {
    console.error('Error deleting audio from R2:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
};