import { getSpeciesById, getSpeciesByIds } from '@/lib/species/species-queries';
import { getSpeciesContent } from '@/lib/species/species-content-queries';
import { db } from '@/lib/db';
import type { Species, ShopProduct } from '@/lib/db/schema';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const species = await getSpeciesById(params.id);

    if (!species) {
      return Response.json(
        { error: 'Species not found' },
        { status: 404 }
      );
    }

    // Parse companion plants and fetch their details
    let companions: Species[] = [];
    if (species.companion_plants) {
      try {
        const companionIds = JSON.parse(species.companion_plants);
        if (Array.isArray(companionIds) && companionIds.length > 0) {
          companions = await getSpeciesByIds(companionIds);
        }
      } catch (e) {
        console.error('Failed to parse companion plants:', e);
      }
    }

    // Fetch species content (AI-generated narratives)
    let content = null;
    try {
      content = await getSpeciesContent(params.id);
    } catch (e) {
      // Table may not exist yet
    }

    // Fetch shop products linked to this species
    let products: ShopProduct[] = [];
    try {
      const productResult = await db.execute({
        sql: `SELECT p.*, f.name as farm_name
              FROM shop_products p
              JOIN farms f ON f.id = p.farm_id
              WHERE p.species_id = ? AND p.is_published = 1
              ORDER BY p.is_featured DESC, p.rating_avg DESC
              LIMIT 10`,
        args: [params.id],
      });
      products = productResult.rows as unknown as ShopProduct[];
    } catch (e) {
      // Products query may fail if columns don't exist
    }

    return Response.json({
      species,
      companions,
      content,
      products,
    });
  } catch (error) {
    console.error('Species detail API error:', error);
    return Response.json(
      { error: 'Failed to fetch species details' },
      { status: 500 }
    );
  }
}
