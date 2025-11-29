import { requireAuth } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";
import { z } from "zod";

const createFarmSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().nullable(),
  acres: z.number().positive().nullable(),
  center_lat: z.number().min(-90).max(90),
  center_lng: z.number().min(-180).max(180),
  zoom_level: z.number().min(0).max(20),
});

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const data = createFarmSchema.parse(body);

    const farmId = crypto.randomUUID();

    await db.execute({
      sql: `INSERT INTO farms (id, user_id, name, description, acres, center_lat, center_lng, zoom_level)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        farmId,
        session.user.id,
        data.name,
        data.description,
        data.acres,
        data.center_lat,
        data.center_lng,
        data.zoom_level,
      ],
    });

    return Response.json({ id: farmId });
  } catch (error) {
    console.error("Create farm error:", error);
    if (error instanceof z.ZodError) {
      return Response.json({ error: "Invalid input" }, { status: 400 });
    }
    return Response.json({ error: "Failed to create farm" }, { status: 500 });
  }
}
