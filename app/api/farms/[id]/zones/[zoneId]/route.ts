import { requireAuth } from '@/lib/auth/session';
import { db } from '@/lib/db';

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string; zoneId: string }> }
) {
  try {
    const session = await requireAuth();
    const { id: farmId, zoneId } = await context.params;

    // Verify farm ownership and zone exists
    const checkResult = await db.execute({
      sql: `SELECT z.id
            FROM zones z
            JOIN farms f ON z.farm_id = f.id
            WHERE z.id = ? AND z.farm_id = ? AND f.user_id = ?`,
      args: [zoneId, farmId, session.user.id]
    });

    if (checkResult.rows.length === 0) {
      return Response.json(
        { error: 'Zone not found or access denied' },
        { status: 404 }
      );
    }

    // Unlink any plantings in this zone (set zone_id to null)
    await db.execute({
      sql: 'UPDATE plantings SET zone_id = NULL WHERE zone_id = ?',
      args: [zoneId]
    });

    // Delete the zone
    await db.execute({
      sql: 'DELETE FROM zones WHERE id = ?',
      args: [zoneId]
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Delete zone error:', error);
    return Response.json(
      { error: 'Failed to delete zone' },
      { status: 500 }
    );
  }
}
