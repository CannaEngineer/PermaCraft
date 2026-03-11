import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { isAdmin } from '@/lib/auth/admin';
import { db } from '@/lib/db';
import { updateTourCommentStatus } from '@/lib/tour/queries';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (!status || !['approved', 'rejected', 'pending'].includes(status)) {
      return Response.json({ error: 'Valid status required (approved, rejected, pending)' }, { status: 400 });
    }

    // Get comment to check farm ownership
    const commentResult = await db.execute({
      sql: 'SELECT farm_id FROM tour_comments WHERE id = ?',
      args: [id],
    });
    if (commentResult.rows.length === 0) {
      return Response.json({ error: 'Comment not found' }, { status: 404 });
    }

    const farmId = (commentResult.rows[0] as any).farm_id;
    const admin = await isAdmin();
    if (!admin) {
      const farmResult = await db.execute({
        sql: 'SELECT id FROM farms WHERE id = ? AND user_id = ?',
        args: [farmId, session.user.id],
      });
      if (farmResult.rows.length === 0) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    await updateTourCommentStatus(id, status);
    return Response.json({ success: true });
  } catch (error) {
    console.error('Failed to update comment status:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
