import { NextRequest } from 'next/server';
import { getAllSpecies } from '@/lib/species/species-queries';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse filters from query params
    const nativeParam = searchParams.get('filter');
    const layer = searchParams.get('layer');
    const search = searchParams.get('search');

    const filters: any = {};

    if (nativeParam === 'native') {
      filters.native = true;
    } else if (nativeParam === 'naturalized') {
      filters.native = false;
    }

    if (layer) {
      filters.layer = layer;
    }

    if (search) {
      filters.search = search;
    }

    const species = await getAllSpecies(filters);

    return Response.json({ species });
  } catch (error) {
    console.error('Species API error:', error);
    return Response.json(
      { error: 'Failed to fetch species' },
      { status: 500 }
    );
  }
}
