import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

interface TrendingHashtag {
  hashtag: string;
  count: number;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    // Get hashtags from posts published in the last 30 days
    const thirtyDaysAgo = Math.floor(Date.now() / 1000) - (30 * 86400);

    // Fetch all posts with hashtags from the last 30 days
    const sql = `
      SELECT p.hashtags
      FROM farm_posts p
      JOIN farms f ON p.farm_id = f.id
      WHERE p.created_at > ?
        AND p.is_published = 1
        AND f.is_public = 1
        AND p.hashtags IS NOT NULL
        AND p.hashtags != '[]'
    `;

    const result = await db.execute({
      sql,
      args: [thirtyDaysAgo],
    });

    // Count hashtag occurrences in application code
    const hashtagCounts = new Map<string, number>();

    for (const row of result.rows) {
      try {
        const hashtags = JSON.parse(row.hashtags as string);
        if (Array.isArray(hashtags)) {
          for (const tag of hashtags) {
            if (tag && typeof tag === 'string') {
              hashtagCounts.set(tag, (hashtagCounts.get(tag) || 0) + 1);
            }
          }
        }
      } catch (e) {
        // Skip malformed JSON
        console.warn('Failed to parse hashtags:', row.hashtags);
      }
    }

    // Convert to array and sort
    const trendingHashtags: TrendingHashtag[] = Array.from(hashtagCounts.entries())
      .map(([hashtag, count]) => ({ hashtag, count }))
      .sort((a, b) => {
        // Sort by count descending, then by hashtag ascending
        if (b.count !== a.count) {
          return b.count - a.count;
        }
        return a.hashtag.localeCompare(b.hashtag);
      })
      .slice(0, limit);

    return NextResponse.json({
      hashtags: trendingHashtags,
      period: '30_days',
    });
  } catch (error) {
    console.error('Error fetching trending hashtags:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trending hashtags' },
      { status: 500 }
    );
  }
}
