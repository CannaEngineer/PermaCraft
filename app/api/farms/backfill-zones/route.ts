import { requireAuth } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { lookupHardinessZone } from '@/lib/species/hardiness-zone-lookup';

/**
 * POST /api/farms/backfill-zones
 * Backfill USDA hardiness zones for the current user's farms where climate_zone is NULL.
 * Respects Nominatim's 1 req/sec rate limit with 1.1s delay between calls.
 */
export async function POST() {
  try {
    const session = await requireAuth();

    // Find all user's farms missing climate_zone
    const result = await db.execute({
      sql: 'SELECT id, center_lat, center_lng FROM farms WHERE user_id = ? AND climate_zone IS NULL',
      args: [session.user.id],
    });

    const farms = result.rows as unknown as Array<{
      id: string;
      center_lat: number;
      center_lng: number;
    }>;

    if (farms.length === 0) {
      return Response.json({ updated: 0, results: [] });
    }

    const results: Array<{ id: string; zone: string | null }> = [];

    for (let i = 0; i < farms.length; i++) {
      const farm = farms[i];
      let zone: string | null = null;

      try {
        const zoneResult = await lookupHardinessZone(farm.center_lat, farm.center_lng);
        zone = zoneResult.zone;

        await db.execute({
          sql: 'UPDATE farms SET climate_zone = ?, updated_at = unixepoch() WHERE id = ?',
          args: [zone, farm.id],
        });
      } catch (error) {
        console.warn(`Failed to look up zone for farm ${farm.id}:`, error);
      }

      results.push({ id: farm.id, zone });

      // Respect Nominatim rate limit (1 req/sec) — wait between calls
      if (i < farms.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1100));
      }
    }

    const updated = results.filter((r) => r.zone !== null).length;

    return Response.json({ updated, results });
  } catch (error) {
    console.error('Backfill zones error:', error);
    return Response.json(
      { error: 'Failed to backfill zones' },
      { status: 500 }
    );
  }
}
