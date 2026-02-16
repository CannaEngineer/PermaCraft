import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { db } from '@/lib/db';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; lineId: string } }
) {
  try {
    const session = await requireAuth();

    // Verify farm ownership
    const farmResult = await db.execute({
      sql: 'SELECT id FROM farms WHERE id = ? AND user_id = ?',
      args: [params.id, session.user.id]
    });

    if (farmResult.rows.length === 0) {
      return new Response('Farm not found or access denied', { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { water_properties } = body;

    if (water_properties === undefined) {
      return new Response('No properties to update', { status: 400 });
    }

    // Execute update
    await db.execute({
      sql: `UPDATE lines SET water_properties = ?, updated_at = unixepoch() WHERE id = ?`,
      args: [water_properties, params.lineId]
    });

    // Fetch updated line
    const lineResult = await db.execute({
      sql: 'SELECT * FROM lines WHERE id = ?',
      args: [params.lineId]
    });

    return Response.json(lineResult.rows[0]);

  } catch (error) {
    console.error('Water properties update failed:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
