import { db } from '@/lib/db';
import { getVarietiesBySpecies } from '@/lib/varieties/variety-queries';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const speciesId = params.id;

    const varieties = await getVarietiesBySpecies(speciesId);

    return Response.json({ varieties });
  } catch (error) {
    console.error('Get varieties error:', error);
    return Response.json({ error: 'Failed to get varieties' }, { status: 500 });
  }
}
