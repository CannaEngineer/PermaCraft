import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';

// GET /api/learning/practice-farms/[id]/plantings - Get all plantings for practice farm
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
    const farmCheck = await db.execute({
      sql: 'SELECT id FROM practice_farms WHERE id = ? AND user_id = ?',
      args: [practiceFarmId, session.user.id],
    });

    if (farmCheck.rows.length === 0) {
      return Response.json({ error: 'Practice farm not found' }, { status: 404 });
    }

    // Get all plantings with species data
    const result = await db.execute({
      sql: `
        SELECT pp.*, s.common_name, s.scientific_name, s.layer,
               s.mature_width_ft, s.mature_height_ft, s.years_to_maturity,
               s.permaculture_functions, s.is_native
        FROM practice_plantings pp
        LEFT JOIN species s ON pp.species_id = s.id
        WHERE pp.practice_farm_id = ?
        ORDER BY pp.created_at DESC
      `,
      args: [practiceFarmId],
    });

    return Response.json({ plantings: result.rows });
  } catch (error: any) {
    console.error('Get practice farm plantings error:', error);
    return Response.json(
      { error: 'Failed to fetch plantings', details: error.message },
      { status: 500 }
    );
  }
}

// POST /api/learning/practice-farms/[id]/plantings - Create planting on practice farm
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();

  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  const practiceFarmId = params.id;

  // Verify ownership
  const farmResult = await db.execute({
    sql: 'SELECT * FROM practice_farms WHERE id = ? AND user_id = ?',
    args: [practiceFarmId, session.user.id],
  });

  if (farmResult.rows.length === 0) {
    return new Response('Practice farm not found', { status: 404 });
  }

  try {
    const body = await request.json();
    const { species_id, name, lat, lng, planted_year, current_year, notes } = body;

    if (!species_id || lat === undefined || lng === undefined) {
      return Response.json(
        { error: 'Missing required fields: species_id, lat, lng' },
        { status: 400 }
      );
    }

    const plantingId = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);

    await db.execute({
      sql: `
        INSERT INTO practice_plantings (
          id, practice_farm_id, species_id, name,
          lat, lng, planted_year, current_year, notes,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        plantingId,
        practiceFarmId,
        species_id,
        name || null,
        lat,
        lng,
        planted_year || null,
        current_year || new Date().getFullYear(),
        notes || null,
        now,
        now,
      ],
    });

    // Update practice farm's updated_at
    await db.execute({
      sql: 'UPDATE practice_farms SET updated_at = ? WHERE id = ?',
      args: [now, practiceFarmId],
    });

    // Get planting with species info
    const result = await db.execute({
      sql: `
        SELECT pp.*, s.common_name, s.scientific_name, s.is_native
        FROM practice_plantings pp
        LEFT JOIN species s ON pp.species_id = s.id
        WHERE pp.id = ?
      `,
      args: [plantingId],
    });

    return Response.json(result.rows[0], { status: 201 });
  } catch (error: any) {
    console.error('Error creating planting:', error);
    return Response.json({ error: 'Failed to create planting' }, { status: 500 });
  }
}
