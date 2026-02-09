import { requireAdmin } from '@/lib/auth/admin';
import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

// DELETE user
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();

    // Delete user and all related data (cascading)
    await db.execute({
      sql: 'DELETE FROM users WHERE id = ?',
      args: [params.id],
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete user:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete user' },
      { status: 500 }
    );
  }
}
