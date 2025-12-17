import { db } from '@/lib/db';
import { getSession } from '@/lib/auth/session';
import { Badge, UserBadge } from '@/lib/db/schema';

export async function GET() {
  try {
    const session = await getSession();

    // Get all badges
    const badgesResult = await db.execute(
      'SELECT * FROM badges ORDER BY tier, name'
    );
    const allBadges = badgesResult.rows as unknown as Badge[];

    if (!session) {
      // Return all badges without earned status for non-authenticated users
      return Response.json(
        allBadges.map(badge => ({
          ...badge,
          unlock_criteria: JSON.parse(badge.unlock_criteria),
          earned: false,
        }))
      );
    }

    // Get user's earned badges
    const userBadgesResult = await db.execute({
      sql: 'SELECT badge_id, earned_at FROM user_badges WHERE user_id = ?',
      args: [session.user.id],
    });
    const earnedBadgeIds = new Set(
      userBadgesResult.rows.map((row: any) => row.badge_id)
    );

    // Combine data
    const badgesWithStatus = allBadges.map(badge => ({
      ...badge,
      unlock_criteria: JSON.parse(badge.unlock_criteria),
      earned: earnedBadgeIds.has(badge.id),
      earned_at: userBadgesResult.rows.find((row: any) => row.badge_id === badge.id)?.earned_at,
    }));

    return Response.json(badgesWithStatus);
  } catch (error) {
    console.error('Error fetching badges:', error);
    return Response.json(
      { error: 'Failed to fetch badges' },
      { status: 500 }
    );
  }
}
