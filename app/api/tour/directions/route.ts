import { NextRequest } from 'next/server';
import { checkRateLimit } from '@/lib/tour/utils';

const OSRM_BASE = 'https://router.project-osrm.org';

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const { allowed } = checkRateLimit(`tour-directions:${ip}`, 30, 60 * 1000);
    if (!allowed) {
      return Response.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const body = await request.json();
    const { waypoints } = body;

    if (!Array.isArray(waypoints) || waypoints.length < 2) {
      return Response.json({ error: 'At least 2 waypoints required' }, { status: 400 });
    }

    if (waypoints.length > 25) {
      return Response.json({ error: 'Maximum 25 waypoints' }, { status: 400 });
    }

    // Build OSRM coordinates string: lng,lat;lng,lat;...
    const coords = waypoints
      .map((wp: { lng: number; lat: number }) => `${wp.lng},${wp.lat}`)
      .join(';');

    const url = `${OSRM_BASE}/route/v1/foot/${coords}?overview=full&geometries=geojson&steps=true`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`OSRM returned ${response.status}`);
    }

    const data = await response.json();

    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      return Response.json({ error: 'No route found' }, { status: 404 });
    }

    const route = data.routes[0];

    return Response.json({
      geometry: route.geometry,
      distance: route.distance, // meters
      duration: route.duration, // seconds
      steps: route.legs?.flatMap((leg: any) =>
        leg.steps?.map((step: any) => ({
          instruction: step.maneuver?.type || 'continue',
          modifier: step.maneuver?.modifier,
          distance: step.distance,
          duration: step.duration,
          name: step.name,
          geometry: step.geometry,
        })) || []
      ) || [],
    });
  } catch (error) {
    console.error('Directions error:', error);
    return Response.json({ error: 'Failed to fetch directions' }, { status: 500 });
  }
}
