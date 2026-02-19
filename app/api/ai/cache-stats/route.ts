import { getCacheStats } from '@/lib/ai/response-cache';
import { requireAdmin } from '@/lib/auth/admin';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    await requireAdmin();
    const stats = getCacheStats();
    return NextResponse.json(stats);
  } catch (error) {
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message.includes('Admin'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Error fetching cache stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cache stats' },
      { status: 500 }
    );
  }
}
