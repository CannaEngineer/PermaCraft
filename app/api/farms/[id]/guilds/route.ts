import { requireAuth } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { NextRequest } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth();

    const farmResult = await db.execute({
      sql: 'SELECT id FROM farms WHERE id = ?',
      args: [params.id],
    });
    if (farmResult.rows.length === 0) {
      return new Response('Not found', { status: 404 });
    }

    // Guild persistence is not yet implemented — AI guilds are ephemeral.
    // Return empty array so callers don't error.
    return Response.json({ guilds: [] });
  } catch (error) {
    console.error('Failed to get guilds:', error);
    return Response.json({ guilds: [] });
  }
}
