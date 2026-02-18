import { requireAuth } from '@/lib/auth/session';
import { db } from '@/lib/db';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string; plantingId: string }> }
) {
  try {
    const session = await requireAuth();
    const { id: farmId, plantingId } = await context.params;

    // Verify farm ownership and planting exists
    const checkResult = await db.execute({
      sql: `SELECT p.id
            FROM plantings p
            JOIN farms f ON p.farm_id = f.id
            WHERE p.id = ? AND p.farm_id = ? AND f.user_id = ?`,
      args: [plantingId, farmId, session.user.id]
    });

    if (checkResult.rows.length === 0) {
      return Response.json(
        { error: 'Planting not found or access denied' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const updates: string[] = [];
    const args: any[] = [];

    if (body.planted_year !== undefined) {
      updates.push('planted_year = ?');
      args.push(body.planted_year);
    }
    if (body.notes !== undefined) {
      updates.push('notes = ?');
      args.push(body.notes);
    }
    if (body.name !== undefined) {
      updates.push('name = ?');
      args.push(body.name);
    }
    if (body.zone_id !== undefined) {
      updates.push('zone_id = ?');
      args.push(body.zone_id);
    }

    if (updates.length === 0) {
      return Response.json({ error: 'No fields to update' }, { status: 400 });
    }

    args.push(plantingId);
    await db.execute({
      sql: `UPDATE plantings SET ${updates.join(', ')} WHERE id = ?`,
      args,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Update planting error:', error);
    return Response.json(
      { error: 'Failed to update planting' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string; plantingId: string }> }
) {
  try {
    const session = await requireAuth();
    const { id: farmId, plantingId } = await context.params;

    // Verify farm ownership and planting exists
    const checkResult = await db.execute({
      sql: `SELECT p.id
            FROM plantings p
            JOIN farms f ON p.farm_id = f.id
            WHERE p.id = ? AND p.farm_id = ? AND f.user_id = ?`,
      args: [plantingId, farmId, session.user.id]
    });

    if (checkResult.rows.length === 0) {
      return Response.json(
        { error: 'Planting not found or access denied' },
        { status: 404 }
      );
    }

    // Delete the planting
    await db.execute({
      sql: 'DELETE FROM plantings WHERE id = ?',
      args: [plantingId]
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Delete planting error:', error);
    return Response.json(
      { error: 'Failed to delete planting' },
      { status: 500 }
    );
  }
}
