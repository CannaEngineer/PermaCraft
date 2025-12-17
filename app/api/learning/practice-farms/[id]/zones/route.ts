import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { z } from 'zod';

const saveZonesSchema = z.object({
  zones: z.array(
    z.object({
      id: z.string().optional(),
      type: z.literal('Feature'),
      geometry: z.any(),
      properties: z.record(z.any()).optional(),
    })
  ),
});

// POST /api/learning/practice-farms/[id]/zones - Batch save zones for practice farm
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();

  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  const practiceFarmId = params.id;

  try {
    const body = await request.json();
    const { zones } = saveZonesSchema.parse(body);

    // Verify practice farm ownership
    const farmResult = await db.execute({
      sql: 'SELECT id FROM practice_farms WHERE id = ? AND user_id = ?',
      args: [practiceFarmId, session.user.id],
    });

    if (farmResult.rows.length === 0) {
      return Response.json({ error: 'Practice farm not found' }, { status: 404 });
    }

    // Delete all existing zones for this practice farm
    await db.execute({
      sql: 'DELETE FROM practice_zones WHERE practice_farm_id = ?',
      args: [practiceFarmId],
    });

    // Insert new zones using batch transaction
    if (zones.length > 0) {
      const now = Math.floor(Date.now() / 1000);
      const statements = zones.map((zone) => {
        const zoneId = zone.id || crypto.randomUUID();
        const geometry = JSON.stringify(zone.geometry);
        const properties = JSON.stringify(zone.properties || {});
        const zoneType = zone.properties?.user_zone_type || 'other';
        const name = zone.properties?.name || null;

        return {
          sql: `INSERT INTO practice_zones (id, practice_farm_id, name, zone_type, geometry, properties, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [zoneId, practiceFarmId, name, zoneType, geometry, properties, now, now],
        };
      });

      await db.batch(statements);
    }

    // Update practice farm timestamp
    await db.execute({
      sql: 'UPDATE practice_farms SET updated_at = ? WHERE id = ?',
      args: [Math.floor(Date.now() / 1000), practiceFarmId],
    });

    return Response.json({ success: true });
  } catch (error: any) {
    console.error('Save practice farm zones error:', error);
    if (error instanceof z.ZodError) {
      return Response.json({ error: 'Invalid input' }, { status: 400 });
    }
    return Response.json(
      { error: 'Failed to save zones', details: error.message },
      { status: 500 }
    );
  }
}

// GET /api/learning/practice-farms/[id]/zones - Get all zones for practice farm
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();

  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  const practiceFarmId = params.id;

  try {
    // Verify practice farm ownership
    const farmResult = await db.execute({
      sql: 'SELECT id FROM practice_farms WHERE id = ? AND user_id = ?',
      args: [practiceFarmId, session.user.id],
    });

    if (farmResult.rows.length === 0) {
      return Response.json({ error: 'Practice farm not found' }, { status: 404 });
    }

    // Get all zones for this practice farm
    const zonesResult = await db.execute({
      sql: 'SELECT * FROM practice_zones WHERE practice_farm_id = ? ORDER BY created_at',
      args: [practiceFarmId],
    });

    const zones = zonesResult.rows.map((zone: any) => ({
      id: zone.id,
      type: 'Feature',
      geometry: JSON.parse(zone.geometry),
      properties: {
        ...JSON.parse(zone.properties || '{}'),
        user_zone_type: zone.zone_type,
        name: zone.name,
      },
    }));

    return Response.json({ zones });
  } catch (error: any) {
    console.error('Get practice farm zones error:', error);
    return Response.json(
      { error: 'Failed to get zones', details: error.message },
      { status: 500 }
    );
  }
}
