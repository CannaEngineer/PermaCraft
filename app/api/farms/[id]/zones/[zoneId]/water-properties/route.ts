import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { db } from '@/lib/db';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; zoneId: string } }
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
    const { catchment_properties, swale_properties } = body;

    // Build UPDATE query dynamically
    const updates: string[] = [];
    const args: any[] = [];

    if (catchment_properties !== undefined) {
      updates.push('catchment_properties = ?');
      args.push(catchment_properties);
    }

    if (swale_properties !== undefined) {
      updates.push('swale_properties = ?');
      args.push(swale_properties);
    }

    if (updates.length === 0) {
      return new Response('No properties to update', { status: 400 });
    }

    // Add updated_at
    updates.push('updated_at = unixepoch()');

    // Add zone ID to args
    args.push(params.zoneId);

    // Execute update
    await db.execute({
      sql: `UPDATE zones SET ${updates.join(', ')} WHERE id = ?`,
      args
    });

    // Fetch updated zone
    const zoneResult = await db.execute({
      sql: 'SELECT * FROM zones WHERE id = ?',
      args: [params.zoneId]
    });

    return Response.json(zoneResult.rows[0]);

  } catch (error) {
    console.error('Water properties update failed:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
