import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin';
import { db } from '@/lib/db';

// PATCH /api/admin/content/generations/[id] - Update generation with edits
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();

    const body = await request.json();
    const { edited_output } = body;

    if (!edited_output) {
      return Response.json({ error: 'Missing edited_output' }, { status: 400 });
    }

    const now = Math.floor(Date.now() / 1000);

    await db.execute({
      sql: 'UPDATE content_generations SET edited_output = ?, updated_at = ? WHERE id = ?',
      args: [JSON.stringify(edited_output), now, params.id],
    });

    return Response.json({ success: true });
  } catch (error: any) {
    console.error('Update generation error:', error);
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return Response.json({ error: error.message }, { status: 403 });
    }
    return Response.json({ error: 'Failed to update generation' }, { status: 500 });
  }
}

// DELETE /api/admin/content/generations/[id] - Delete a generation
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();

    await db.execute({
      sql: 'DELETE FROM content_generations WHERE id = ?',
      args: [params.id],
    });

    return Response.json({ success: true });
  } catch (error: any) {
    console.error('Delete generation error:', error);
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return Response.json({ error: error.message }, { status: 403 });
    }
    return Response.json({ error: 'Failed to delete generation' }, { status: 500 });
  }
}
