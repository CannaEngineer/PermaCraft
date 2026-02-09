import { requireAdmin } from '@/lib/auth/admin';
import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();

    const body = await request.json();
    const { is_admin } = body;

    await db.execute({
      sql: 'UPDATE users SET is_admin = ? WHERE id = ?',
      args: [is_admin ? 1 : 0, params.id],
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to update user role:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update role' },
      { status: 500 }
    );
  }
}
