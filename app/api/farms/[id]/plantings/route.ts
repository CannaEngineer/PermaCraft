import { requireAuth } from '@/lib/auth/session';
import { db } from '@/lib/db';

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

    // Get all plantings with species + variety data
    const result = await db.execute({
      sql: `SELECT p.*, s.common_name, s.scientific_name, s.layer,
                   s.mature_width_ft, s.mature_height_ft, s.years_to_maturity,
                   s.permaculture_functions, s.is_custom AS species_is_custom,
                   v.variety_name, v.variety_type, v.image_url AS variety_image_url,
                   v.parent_variety_id,
                   pv.variety_name AS parent_variety_name
            FROM plantings p
            JOIN species s ON p.species_id = s.id
            LEFT JOIN plant_varieties v ON p.variety_id = v.id
            LEFT JOIN plant_varieties pv ON v.parent_variety_id = pv.id
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
    const {
      species_id,
      variety_id,
      lat,
      lng,
      planted_year,
      zone_id,
      notes,
      custom_name,
      placement_accuracy_meters,
      placement_altitude_meters,
      placement_method,
      placement_recorded_at,
    } = body;

    if (!species_id || typeof lat !== 'number' || typeof lng !== 'number') {
      return Response.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // If a variety is supplied, verify it belongs to the same species. This
    // prevents the API from accepting a mismatched (species_id, variety_id)
    // pair that would render incorrectly in the planting list.
    if (variety_id) {
      const varietyCheck = await db.execute({
        sql: 'SELECT id FROM plant_varieties WHERE id = ? AND species_id = ?',
        args: [variety_id, species_id]
      });
      if (varietyCheck.rows.length === 0) {
        return Response.json(
          { error: 'variety_id does not belong to species_id' },
          { status: 400 }
        );
      }
    }

    const plantingId = crypto.randomUUID();
    const currentYear = new Date().getFullYear();
    const recordedAt =
      typeof placement_recorded_at === 'number'
        ? placement_recorded_at
        : Math.floor(Date.now() / 1000);

    await db.execute({
      sql: `INSERT INTO plantings
            (id, farm_id, species_id, variety_id, lat, lng, planted_year,
             current_year, zone_id, notes, name,
             placement_accuracy_meters, placement_altitude_meters,
             placement_method, placement_recorded_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        plantingId,
        farmId,
        species_id,
        variety_id || null,
        lat,
        lng,
        planted_year || currentYear,
        currentYear,
        zone_id || null,
        notes || null,
        custom_name || null,
        typeof placement_accuracy_meters === 'number' ? placement_accuracy_meters : null,
        typeof placement_altitude_meters === 'number' ? placement_altitude_meters : null,
        placement_method || null,
        recordedAt,
      ]
    });

    // Fetch created planting joined with species + variety
    const result = await db.execute({
      sql: `SELECT p.*, s.common_name, s.scientific_name, s.layer,
                   s.mature_width_ft, s.mature_height_ft, s.years_to_maturity,
                   s.permaculture_functions, s.is_custom AS species_is_custom,
                   v.variety_name, v.variety_type, v.image_url AS variety_image_url,
                   v.parent_variety_id,
                   pv.variety_name AS parent_variety_name
            FROM plantings p
            JOIN species s ON p.species_id = s.id
            LEFT JOIN plant_varieties v ON p.variety_id = v.id
            LEFT JOIN plant_varieties pv ON v.parent_variety_id = pv.id
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
