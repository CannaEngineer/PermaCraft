import { requireAuth } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { NextRequest } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    const { id: farmId } = await params;

    const farmResult = await db.execute({
      sql: 'SELECT id FROM farms WHERE id = ?',
      args: [farmId],
    });
    if (farmResult.rows.length === 0) {
      return new Response('Not found', { status: 404 });
    }

    // Return guilds created by this user (ordered newest first)
    const guildsResult = await db.execute({
      sql: `SELECT gt.id, gt.name, gt.description, gt.focal_species_id, gt.companion_species,
                   gt.benefits, gt.is_public, gt.created_at,
                   s.common_name AS focal_common_name, s.scientific_name AS focal_scientific_name, s.layer AS focal_layer
            FROM guild_templates gt
            LEFT JOIN species s ON s.id = gt.focal_species_id
            WHERE gt.created_by = ?
            ORDER BY gt.created_at DESC`,
      args: [session.user.id],
    });

    const guilds = guildsResult.rows.map((row: any) => ({
      ...row,
      companion_species: typeof row.companion_species === 'string'
        ? JSON.parse(row.companion_species)
        : row.companion_species,
      benefits: row.benefits
        ? (typeof row.benefits === 'string' ? JSON.parse(row.benefits) : row.benefits)
        : [],
    }));

    return Response.json({ guilds });
  } catch (error) {
    console.error('Failed to get guilds:', error);
    return Response.json({ guilds: [] });
  }
}
