// app/api/ai/cache-stats/route.ts
import { getCacheStats } from '@/lib/ai/response-cache';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const stats = getCacheStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching cache stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cache stats' },
      { status: 500 }
    );
  }
}
