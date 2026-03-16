/**
 * Farm Sync API
 *
 * GET /api/sync/farm/:farmId?since=<timestamp>
 * Returns all entities modified since the given timestamp.
 * Used by the sync engine to pull incremental updates.
 *
 * POST /api/sync/farm/:farmId
 * Accepts a batch of changes to apply. Returns results with server timestamps.
 */

import { NextRequest } from 'next/server';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ farmId: string }> }
) {
  try {
    let session: any;
    let db: any;

    try {
      const { requireAuth } = await import('@/lib/auth/session');
      session = await requireAuth();
      const dbModule = await import('@/lib/db');
      db = dbModule.db;
    } catch {
      return Response.json({
        error: 'Server not configured (missing environment variables)',
      }, { status: 503 });
    }

    const { farmId } = await context.params;
    const since = Number(request.nextUrl.searchParams.get('since') || '0');

    // Verify farm ownership
    const farmResult = await db.execute({
      sql: 'SELECT id, user_id FROM farms WHERE id = ?',
      args: [farmId],
    });

    if (farmResult.rows.length === 0) {
      return Response.json({ error: 'Farm not found' }, { status: 404 });
    }

    const farm = farmResult.rows[0] as any;
    if (farm.user_id !== session.user.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get all entities modified since the given timestamp
    const [zones, plantings, lines] = await Promise.all([
      db.execute({
        sql: 'SELECT * FROM zones WHERE farm_id = ? AND updated_at > ?',
        args: [farmId, since],
      }),
      db.execute({
        sql: 'SELECT * FROM plantings WHERE farm_id = ? AND updated_at > ?',
        args: [farmId, since],
      }),
      db.execute({
        sql: 'SELECT * FROM lines WHERE farm_id = ? AND updated_at > ?',
        args: [farmId, since],
      }),
    ]);

    return Response.json({
      farmId,
      since,
      serverTime: Math.floor(Date.now() / 1000),
      changes: {
        zones: zones.rows,
        plantings: plantings.rows,
        lines: lines.rows,
      },
    });
  } catch (error: any) {
    console.error('Sync fetch error:', error);
    return Response.json({ error: 'Sync failed' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ farmId: string }> }
) {
  try {
    let session: any;
    let db: any;

    try {
      const { requireAuth } = await import('@/lib/auth/session');
      session = await requireAuth();
      const dbModule = await import('@/lib/db');
      db = dbModule.db;
    } catch {
      return Response.json({
        error: 'Server not configured (missing environment variables)',
      }, { status: 503 });
    }

    const { farmId } = await context.params;
    const body = await request.json();

    // Verify farm ownership
    const farmResult = await db.execute({
      sql: 'SELECT id, user_id FROM farms WHERE id = ?',
      args: [farmId],
    });

    if (farmResult.rows.length === 0) {
      return Response.json({ error: 'Farm not found' }, { status: 404 });
    }

    const farm = farmResult.rows[0] as any;
    if (farm.user_id !== session.user.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const results: any[] = [];
    const changes = body.changes || [];

    for (const change of changes) {
      try {
        const result = await applyChange(db, farmId, change);
        results.push({ id: change.id, status: 'ok', ...result });
      } catch (error: any) {
        results.push({ id: change.id, status: 'error', error: error.message });
      }
    }

    // Update farm timestamp
    await db.execute({
      sql: 'UPDATE farms SET updated_at = unixepoch() WHERE id = ?',
      args: [farmId],
    });

    return Response.json({
      farmId,
      serverTime: Math.floor(Date.now() / 1000),
      results,
    });
  } catch (error: any) {
    console.error('Sync push error:', error);
    return Response.json({ error: 'Sync failed' }, { status: 500 });
  }
}

async function applyChange(db: any, farmId: string, change: any) {
  const { resourceType, changeType, data } = change;

  const table = getTableName(resourceType);
  if (!table) throw new Error(`Unknown resource type: ${resourceType}`);

  switch (changeType) {
    case 'create': {
      const columns = Object.keys(data).filter(k => k !== '_sync');
      const placeholders = columns.map(() => '?').join(', ');
      const values = columns.map(k => {
        const v = data[k];
        return typeof v === 'object' ? JSON.stringify(v) : v;
      });

      await db.execute({
        sql: `INSERT OR REPLACE INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`,
        args: values,
      });

      return { serverTimestamp: Math.floor(Date.now() / 1000) };
    }

    case 'update': {
      const updates = Object.entries(data)
        .filter(([k]) => k !== 'id' && k !== 'farm_id' && k !== '_sync')
        .map(([k]) => `${k} = ?`);
      const values = Object.entries(data)
        .filter(([k]) => k !== 'id' && k !== 'farm_id' && k !== '_sync')
        .map(([, v]) => typeof v === 'object' ? JSON.stringify(v) : v);

      if (updates.length > 0) {
        await db.execute({
          sql: `UPDATE ${table} SET ${updates.join(', ')}, updated_at = unixepoch() WHERE id = ? AND farm_id = ?`,
          args: [...values, data.id, farmId],
        });
      }

      return { serverTimestamp: Math.floor(Date.now() / 1000) };
    }

    case 'delete': {
      await db.execute({
        sql: `DELETE FROM ${table} WHERE id = ? AND farm_id = ?`,
        args: [data.id, farmId],
      });

      return { serverTimestamp: Math.floor(Date.now() / 1000) };
    }

    default:
      throw new Error(`Unknown change type: ${changeType}`);
  }
}

function getTableName(resourceType: string): string | null {
  const map: Record<string, string> = {
    zone: 'zones',
    planting: 'plantings',
    line: 'lines',
    guild: 'guild_templates',
    phase: 'phases',
  };
  return map[resourceType] || null;
}
