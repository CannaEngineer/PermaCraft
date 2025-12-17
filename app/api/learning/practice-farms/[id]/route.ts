import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';

// GET /api/learning/practice-farms/[id] - Get practice farm with zones and plantings
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();

  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  const practiceFarmId = params.id;

  // Get practice farm
  const farmResult = await db.execute({
    sql: 'SELECT * FROM practice_farms WHERE id = ? AND user_id = ?',
    args: [practiceFarmId, session.user.id],
  });

  if (farmResult.rows.length === 0) {
    return new Response('Practice farm not found', { status: 404 });
  }

  const farm = farmResult.rows[0];

  // Get zones
  const zonesResult = await db.execute({
    sql: 'SELECT * FROM practice_zones WHERE practice_farm_id = ?',
    args: [practiceFarmId],
  });

  // Get plantings with species info
  const plantingsResult = await db.execute({
    sql: `
      SELECT pp.*, s.common_name, s.scientific_name, s.is_native
      FROM practice_plantings pp
      LEFT JOIN species s ON pp.species_id = s.id
      WHERE pp.practice_farm_id = ?
    `,
    args: [practiceFarmId],
  });

  return Response.json({
    ...farm,
    zones: zonesResult.rows,
    plantings: plantingsResult.rows,
  });
}

// DELETE /api/learning/practice-farms/[id] - Delete practice farm
export async function DELETE(
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

  // Delete zones and plantings first (foreign key cascade should handle this, but being explicit)
  await db.execute({
    sql: 'DELETE FROM practice_zones WHERE practice_farm_id = ?',
    args: [practiceFarmId],
  });

  await db.execute({
    sql: 'DELETE FROM practice_plantings WHERE practice_farm_id = ?',
    args: [practiceFarmId],
  });

  // Delete practice farm
  await db.execute({
    sql: 'DELETE FROM practice_farms WHERE id = ?',
    args: [practiceFarmId],
  });

  return Response.json({ success: true });
}
