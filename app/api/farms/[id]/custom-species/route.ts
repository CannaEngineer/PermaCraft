import { requireAuth } from '@/lib/auth/session';
import { db } from '@/lib/db';
import type { Species } from '@/lib/db/schema';

const VALID_LAYERS = new Set([
  'canopy', 'understory', 'shrub', 'herbaceous',
  'groundcover', 'vine', 'root', 'aquatic', 'herb',
]);

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id: farmId } = await context.params;

    const farmCheck = await db.execute({
      sql: 'SELECT id FROM farms WHERE id = ? AND user_id = ?',
      args: [farmId, session.user.id]
    });
    if (farmCheck.rows.length === 0) {
      return Response.json({ error: 'Farm not found' }, { status: 404 });
    }

    // Custom species are visible to the user that created them OR scoped to
    // this farm. Both buckets are surfaced here so the picker can show them.
    const result = await db.execute({
      sql: `SELECT * FROM species
            WHERE is_custom = 1
              AND (created_by_user_id = ? OR farm_id = ?)
            ORDER BY common_name ASC`,
      args: [session.user.id, farmId]
    });

    return Response.json({ species: result.rows as unknown as Species[] });
  } catch (error) {
    console.error('Get custom species error:', error);
    return Response.json({ error: 'Failed to fetch custom species' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id: farmId } = await context.params;

    const farmCheck = await db.execute({
      sql: 'SELECT id FROM farms WHERE id = ? AND user_id = ?',
      args: [farmId, session.user.id]
    });
    if (farmCheck.rows.length === 0) {
      return Response.json({ error: 'Farm not found' }, { status: 404 });
    }

    const body = await request.json();
    const { common_name, scientific_name, layer, description, is_native } = body as {
      common_name?: string;
      scientific_name?: string;
      layer?: string;
      description?: string;
      is_native?: boolean;
    };

    const trimmedCommon = common_name?.trim();
    if (!trimmedCommon) {
      return Response.json(
        { error: 'common_name is required' },
        { status: 400 }
      );
    }

    if (!layer || !VALID_LAYERS.has(layer)) {
      return Response.json(
        { error: `layer must be one of: ${Array.from(VALID_LAYERS).join(', ')}` },
        { status: 400 }
      );
    }

    const speciesId = crypto.randomUUID();

    // The species table has UNIQUE(scientific_name). For custom entries the
    // scientific name is often unknown or duplicated across users, so we
    // suffix the user's id to keep the constraint satisfied while preserving
    // the original input for display.
    const baseScientific = scientific_name?.trim() || `Custom: ${trimmedCommon}`;
    const uniqueScientific = `${baseScientific} [user:${session.user.id.slice(0, 8)}:${speciesId.slice(0, 8)}]`;

    await db.execute({
      sql: `INSERT INTO species
            (id, common_name, scientific_name, layer, is_native,
             description, contributed_by, ai_generated,
             is_custom, created_by_user_id, farm_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, 0, 1, ?, ?)`,
      args: [
        speciesId,
        trimmedCommon,
        uniqueScientific,
        layer,
        is_native ? 1 : 0,
        description?.trim() || null,
        session.user.id,
        session.user.id,
        farmId,
      ]
    });

    const result = await db.execute({
      sql: 'SELECT * FROM species WHERE id = ?',
      args: [speciesId]
    });

    return Response.json(
      { species: result.rows[0] as unknown as Species },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create custom species error:', error);
    return Response.json(
      { error: 'Failed to create custom species' },
      { status: 500 }
    );
  }
}
