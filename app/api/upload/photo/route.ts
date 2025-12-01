import { requireAuth } from "@/lib/auth/session";
import { uploadScreenshot } from "@/lib/storage/r2";
import { NextRequest } from "next/server";
import { z } from "zod";

/**
 * Photo Upload API Route
 *
 * POST /api/upload/photo
 *
 * Uploads a photo to R2 storage and returns the public URL.
 * Used for farm post photos.
 *
 * Request Body:
 * {
 *   farmId: "farm_123",
 *   imageData: "data:image/png;base64,..." or raw base64 string
 * }
 *
 * Response:
 * {
 *   url: "https://r2.../farms/farm_123/photos/timestamp.png"
 * }
 *
 * Note: If R2 is not configured, falls back to returning base64 data URI.
 */

const uploadSchema = z.object({
  farmId: z.string(),
  imageData: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();

    // Parse and validate request body
    const body = await request.json();
    const { farmId, imageData } = uploadSchema.parse(body);

    // Verify farm ownership or access
    const { db } = await import("@/lib/db");
    const farmResult = await db.execute({
      sql: "SELECT * FROM farms WHERE id = ? AND user_id = ?",
      args: [farmId, session.user.id],
    });

    if (farmResult.rows.length === 0) {
      return Response.json(
        { error: "Farm not found or you don't have permission" },
        { status: 404 }
      );
    }

    // Upload to R2 using existing utility
    // Note: uploadScreenshot handles both data URLs and raw base64
    const url = await uploadScreenshot(farmId, imageData, 'photo');

    return Response.json({
      url,
      success: true,
    });
  } catch (error) {
    console.error("Photo upload error:", error);

    if (error instanceof z.ZodError) {
      return Response.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }

    return Response.json(
      {
        error: "Failed to upload photo",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
