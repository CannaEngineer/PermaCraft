import { NextRequest } from 'next/server';
import { getTourPoiById } from '@/lib/tour/queries';
import { checkRateLimit } from '@/lib/tour/utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const { allowed } = checkRateLimit(`tour-poi:${ip}`, 120, 60 * 1000);
    if (!allowed) {
      return Response.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const poi = await getTourPoiById(id);
    if (!poi || !poi.active) {
      return Response.json({ error: 'POI not found' }, { status: 404 });
    }

    return Response.json({ poi });
  } catch (error) {
    console.error('Failed to fetch POI:', error);
    return Response.json({ error: 'Failed to fetch POI' }, { status: 500 });
  }
}
