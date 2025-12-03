import { requireAuth } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { getAllSpecies } from '@/lib/species/species-queries';
import { matchNativeSpecies } from '@/lib/species/native-matcher';
import type { Farm } from '@/lib/db/schema';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id: farmId } = await context.params;

    // Get farm and verify ownership or public access
    const farmResult = await db.execute({
      sql: 'SELECT * FROM farms WHERE id = ? AND (user_id = ? OR is_public = 1)',
      args: [farmId, session.user.id]
    });

    const farm = farmResult.rows[0] as unknown as Farm;

    if (!farm) {
      return Response.json(
        { error: 'Farm not found' },
        { status: 404 }
      );
    }

    // Get all species
    const allSpecies = await getAllSpecies();

    // Match species to farm
    const matched = matchNativeSpecies(farm, allSpecies);

    return Response.json(matched);
  } catch (error) {
    console.error('Farm native species API error:', error);
    return Response.json(
      { error: 'Failed to fetch native species recommendations' },
      { status: 500 }
    );
  }
}
