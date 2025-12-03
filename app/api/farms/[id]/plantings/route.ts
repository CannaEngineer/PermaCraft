import { requireAuth } from '@/lib/auth/session';
import { db } from '@/lib/db';
import type { Planting } from '@/lib/db/schema';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id: farmId } = await context.params;

    // Verify farm ownership
    const farmCheck = await db.execute({
      sql: 'SELECT id FROM farms WHERE id = ? AND user_id = ?',
      args: [farmId, session.user.id]
    });

    if (farmCheck.rows.length === 0) {
      return Response.json({ error: 'Farm not found' }, { status: 404 });
    }

    // Get all plantings with species data
    const result = await db.execute({
      sql: `SELECT p.*, s.common_name, s.scientific_name, s.layer,
                   s.mature_width_ft, s.mature_height_ft, s.years_to_maturity
            FROM plantings p
            JOIN species s ON p.species_id = s.id
            WHERE p.farm_id = ?
            ORDER BY p.created_at DESC`,
      args: [farmId]
    });

    return Response.json({ plantings: result.rows });
  } catch (error) {
    console.error('Get plantings error:', error);
    return Response.json(
      { error: 'Failed to fetch plantings' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id: farmId } = await context.params;

    // Verify farm ownership
    const farmCheck = await db.execute({
      sql: 'SELECT id FROM farms WHERE id = ? AND user_id = ?',
      args: [farmId, session.user.id]
    });

    if (farmCheck.rows.length === 0) {
      return Response.json({ error: 'Farm not found' }, { status: 404 });
    }

    const body = await request.json();
    const { species_id, lat, lng, planted_year, zone_id, notes, custom_name } = body;

    // Validate required fields
    if (!species_id || !lat || !lng) {
      return Response.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const plantingId = crypto.randomUUID();
    const currentYear = new Date().getFullYear();

    await db.execute({
      sql: `INSERT INTO plantings
            (id, farm_id, species_id, lat, lng, planted_year, current_year, zone_id, notes, name)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        plantingId,
        farmId,
        species_id,
        lat,
        lng,
        planted_year || currentYear,
        currentYear,
        zone_id || null,
        notes || null,
        custom_name || null
      ]
    });

    // Fetch created planting with species data
    const result = await db.execute({
      sql: `SELECT p.*, s.common_name, s.scientific_name, s.layer,
                   s.mature_width_ft, s.mature_height_ft, s.years_to_maturity
            FROM plantings p
            JOIN species s ON p.species_id = s.id
            WHERE p.id = ?`,
      args: [plantingId]
    });

    return Response.json({ planting: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Create planting error:', error);
    return Response.json(
      { error: 'Failed to create planting' },
      { status: 500 }
    );
  }
}
