import { requireAuth } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { uploadScreenshot } from "@/lib/storage/r2";
import { NextRequest } from "next/server";
import { z } from "zod";

const geotaggedPhotoSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  accuracy: z.number(),
  altitude: z.number().nullable(),
  heading: z.number().nullable(),
  image_data: z.string().min(1),
  caption: z.string(),
  compass_direction: z.string().nullable(),
  captured_at: z.string(),
});

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id: farmId } = await context.params;

    const farmResult = await db.execute({
      sql: "SELECT id, user_id, is_public FROM farms WHERE id = ?",
      args: [farmId],
    });

    if (farmResult.rows.length === 0) {
      return Response.json({ error: "Farm not found" }, { status: 404 });
    }

    const farm = farmResult.rows[0] as any;
    if (farm.user_id !== session.user.id && !farm.is_public) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Geotagged photos are stored as zone point features with marker_type='photo'
    const result = await db.execute({
      sql: `SELECT * FROM zones
            WHERE farm_id = ? AND zone_type = 'feature'
            AND json_extract(properties, '$.marker_type') = 'photo'
            ORDER BY created_at DESC`,
      args: [farmId],
    });

    return Response.json({ photos: result.rows });
  } catch (error) {
    console.error("Get geotagged photos error:", error);
    return Response.json({ error: "Failed to get photos" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id: farmId } = await context.params;
    const body = await request.json();
    const data = geotaggedPhotoSchema.parse(body);

    // Verify farm ownership
    const farmResult = await db.execute({
      sql: "SELECT id FROM farms WHERE id = ? AND user_id = ?",
      args: [farmId, session.user.id],
    });

    if (farmResult.rows.length === 0) {
      return Response.json({ error: "Farm not found" }, { status: 404 });
    }

    // Upload photo to R2
    const photoUrl = await uploadScreenshot(farmId, data.image_data, 'geotagged-photo');

    const zoneId = crypto.randomUUID();
    const geometry = JSON.stringify({
      type: 'Point',
      coordinates: [data.lng, data.lat],
    });

    const properties = JSON.stringify({
      name: data.caption || `Photo ${new Date(data.captured_at).toLocaleDateString()}`,
      zone_type: 'feature',
      marker_type: 'photo',
      gps_accuracy: data.accuracy,
      gps_altitude: data.altitude,
      gps_heading: data.heading,
      compass_direction: data.compass_direction,
      dropped_at: data.captured_at,
      photo_url: photoUrl,
      photo_caption: data.caption,
    });

    await db.execute({
      sql: `INSERT INTO zones (id, farm_id, zone_type, geometry, properties)
            VALUES (?, ?, 'feature', ?, ?)`,
      args: [zoneId, farmId, geometry, properties],
    });

    // Update farm timestamp
    await db.execute({
      sql: "UPDATE farms SET updated_at = unixepoch() WHERE id = ?",
      args: [farmId],
    });

    return Response.json({ success: true, id: zoneId, photoUrl });
  } catch (error) {
    console.error("Save geotagged photo error:", error);
    if (error instanceof z.ZodError) {
      return Response.json({ error: "Invalid input", details: error.errors }, { status: 400 });
    }
    return Response.json({ error: "Failed to save geotagged photo" }, { status: 500 });
  }
}
