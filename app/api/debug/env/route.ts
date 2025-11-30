import { NextRequest } from "next/server";

// Debug endpoint to verify environment variables
export async function GET(request: NextRequest) {
  return Response.json({
    hasR2PublicUrl: !!process.env.R2_PUBLIC_URL,
    r2PublicUrl: process.env.R2_PUBLIC_URL || "(not set)",
    r2AccountId: process.env.R2_ACCOUNT_ID ? "set" : "not set",
    r2BucketName: process.env.R2_BUCKET_NAME || "(not set)",
  });
}
