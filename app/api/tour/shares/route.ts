import { NextRequest } from 'next/server';
import { updateTourSession } from '@/lib/tour/queries';
import { createTourEvents } from '@/lib/tour/queries';
import { db } from '@/lib/db';
import { checkRateLimit } from '@/lib/tour/utils';

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const { allowed } = checkRateLimit(`tour-share:${ip}`, 20, 60 * 60 * 1000);
    if (!allowed) {
      return Response.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const body = await request.json();
    const { session_id, farm_id, platform, email } = body;

    if (!session_id || !farm_id) {
      return Response.json({ error: 'session_id and farm_id are required' }, { status: 400 });
    }

    // Record share event
    await createTourEvents([{
      session_id,
      farm_id,
      event_type: 'share_tapped',
      payload: JSON.stringify({ platform: platform || 'unknown' }),
    }]);

    // Increment share count on session
    const sessionResult = await db.execute({
      sql: 'SELECT shares_count FROM tour_sessions WHERE id = ?',
      args: [session_id],
    });
    const currentShares = Number((sessionResult.rows[0] as any)?.shares_count ?? 0);
    await updateTourSession(session_id, {
      shares_count: currentShares + 1,
    });

    // If email provided, queue post-visit summary email
    // NOTE: Email service not yet configured in this project.
    // When an email provider is added (e.g., Resend), implement sendTourSummaryEmail() here.
    if (email && typeof email === 'string') {
      console.log(`[PermaTour] Post-visit email requested for session ${session_id} to ${email} — email service not yet configured`);
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Share recording error:', error);
    return Response.json({ error: 'Failed to record share' }, { status: 500 });
  }
}
