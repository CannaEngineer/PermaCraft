import { NextRequest } from 'next/server';
import { createTourEvents, updateTourSession } from '@/lib/tour/queries';
import { checkRateLimit } from '@/lib/tour/utils';

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const { allowed } = checkRateLimit(`tour-events:${ip}`, 120, 60 * 1000);
    if (!allowed) {
      return Response.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const body = await request.json();
    const { events, session_id } = body;

    if (!Array.isArray(events) || events.length === 0) {
      return Response.json({ error: 'events array is required' }, { status: 400 });
    }

    if (events.length > 50) {
      return Response.json({ error: 'Maximum 50 events per batch' }, { status: 400 });
    }

    const validEvents = events.map((e: any) => ({
      session_id: e.session_id || session_id,
      farm_id: e.farm_id,
      poi_id: e.poi_id || null,
      event_type: e.event_type,
      payload: e.payload ? JSON.stringify(e.payload) : null,
    }));

    await createTourEvents(validEvents);

    // Update session stats based on events
    const poiArrivedEvents = validEvents.filter((e: any) => e.event_type === 'poi_arrived');
    const shareEvents = validEvents.filter((e: any) => e.event_type === 'share_tapped');
    const sessionEndEvents = validEvents.filter((e: any) => e.event_type === 'session_end');

    if (poiArrivedEvents.length > 0 || shareEvents.length > 0 || sessionEndEvents.length > 0) {
      const sid = session_id || validEvents[0]?.session_id;
      if (sid) {
        const updates: any = {};
        if (sessionEndEvents.length > 0) {
          updates.ended_at = Math.floor(Date.now() / 1000);
        }
        if (Object.keys(updates).length > 0) {
          await updateTourSession(sid, updates);
        }
      }
    }

    return Response.json({ success: true, count: validEvents.length });
  } catch (error) {
    console.error('Failed to ingest tour events:', error);
    return Response.json({ error: 'Failed to ingest events' }, { status: 500 });
  }
}
