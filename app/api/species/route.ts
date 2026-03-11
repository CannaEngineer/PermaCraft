import { NextRequest } from 'next/server';
import { getAllSpecies } from '@/lib/species/species-queries';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse filters from query params
    const nativeParam = searchParams.get('filter');
    const layer = searchParams.get('layer');
    const search = searchParams.get('search');
    const hardinessZone = searchParams.get('zone');
    const region = searchParams.get('region');
    const permacultureOnly = searchParams.get('permaculture') === 'true';

    const filters: {
      native?: boolean;
      layer?: string;
      search?: string;
      hardinessZone?: string;
      region?: string;
      permacultureOnly?: boolean;
    } = {};

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

    if (hardinessZone) {
      filters.hardinessZone = hardinessZone;
    }

    if (region) {
      filters.region = region;
    }

    if (permacultureOnly) {
      filters.permacultureOnly = true;
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
