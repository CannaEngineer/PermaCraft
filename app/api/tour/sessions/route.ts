import { NextRequest } from 'next/server';
import { createTourSession } from '@/lib/tour/queries';
import { detectDeviceType, checkRateLimit } from '@/lib/tour/utils';

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const { allowed } = checkRateLimit(`tour-session:${ip}`, 30, 60 * 60 * 1000);
    if (!allowed) {
      return Response.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const body = await request.json();
    const { farm_id, route_id } = body;

    if (!farm_id) {
      return Response.json({ error: 'farm_id is required' }, { status: 400 });
    }

    const userAgent = request.headers.get('user-agent');
    const deviceType = detectDeviceType(userAgent);

    const session = await createTourSession({
      id: crypto.randomUUID(),
      farm_id,
      route_id: route_id || null,
      device_type: deviceType,
    });

    return Response.json({ session });
  } catch (error) {
    console.error('Failed to create tour session:', error);
    return Response.json({ error: 'Failed to create session' }, { status: 500 });
  }
}
