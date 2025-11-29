import { requireAuth } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { uploadScreenshot } from "@/lib/storage/r2";
import { NextRequest } from "next/server";
import { z } from "zod";

const uploadSchema = z.object({
  farmId: z.string(),
  imageData: z.string(),
  snapshotType: z.enum(["satellite", "design", "overlay"]),
});

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const { farmId, imageData, snapshotType } = uploadSchema.parse(body);

    // Verify farm ownership
    const farmResult = await db.execute({
      sql: "SELECT id FROM farms WHERE id = ? AND user_id = ?",
      args: [farmId, session.user.id],
    });

    if (farmResult.rows.length === 0) {
      return Response.json({ error: "Farm not found" }, { status: 404 });
    }

    // Upload to R2
    const url = await uploadScreenshot(farmId, imageData, snapshotType);

    // Save to database
    const snapshotId = crypto.randomUUID();
    await db.execute({
      sql: `INSERT INTO map_snapshots (id, farm_id, snapshot_type, url)
            VALUES (?, ?, ?, ?)`,
      args: [snapshotId, farmId, snapshotType, url],
    });

    return Response.json({ id: snapshotId, url });
  } catch (error) {
    console.error("Upload error:", error);
    if (error instanceof z.ZodError) {
      return Response.json({ error: "Invalid input" }, { status: 400 });
    }
    return Response.json({ error: "Upload failed" }, { status: 500 });
  }
}
