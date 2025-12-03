import { getSpeciesById, getSpeciesByIds } from '@/lib/species/species-queries';
import type { Species } from '@/lib/db/schema';

export async function GET(
  request: Request,
  { params }: { params: { speciesId: string } }
) {
  try {
    const species = await getSpeciesById(params.speciesId);

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

    return Response.json({
      species,
      companions
    });
  } catch (error) {
    console.error('Species detail API error:', error);
    return Response.json(
      { error: 'Failed to fetch species details' },
      { status: 500 }
    );
  }
}
