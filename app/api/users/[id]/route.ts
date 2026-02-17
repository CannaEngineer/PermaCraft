import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { NextRequest } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getSession();

    // Get user profile with stats
    const userResult = await db.execute({
      sql: `
        SELECT
          u.id, u.name, u.email, u.image, u.created_at,
          u.bio, u.location, u.website, u.cover_image_url,
          u.social_links, u.interests, u.experience_level,
          u.climate_zone, u.profile_visibility,
          COUNT(DISTINCT f.id) as farm_count,
          COUNT(DISTINCT p.id) as post_count,
          COUNT(DISTINCT lc.id) as lessons_completed,
          COALESCE(SUM(DISTINCT l.xp_reward), 0) as total_xp
        FROM users u
        LEFT JOIN farms f ON f.user_id = u.id AND f.is_public = 1
        LEFT JOIN farm_posts p ON p.author_id = u.id AND p.is_published = 1
        LEFT JOIN lesson_completions lc ON lc.user_id = u.id
        LEFT JOIN lessons l ON lc.lesson_id = l.id
        WHERE u.id = ?
        GROUP BY u.id
      `,
      args: [id],
    });

    if (userResult.rows.length === 0) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const user = userResult.rows[0] as any;

    // Check profile visibility
    if (user.profile_visibility === 'private' && session?.user.id !== id) {
      return Response.json({ error: 'Profile is private' }, { status: 403 });
    }
    if (user.profile_visibility === 'registered' && !session) {
      return Response.json({ error: 'Sign in to view this profile' }, { status: 401 });
    }

    // Get follower/following counts
    const [followerResult, followingResult] = await Promise.all([
      db.execute({
        sql: 'SELECT COUNT(*) as count FROM user_follows WHERE followed_id = ?',
        args: [id],
      }),
      db.execute({
        sql: 'SELECT COUNT(*) as count FROM user_follows WHERE follower_id = ?',
        args: [id],
      }),
    ]);

    // Get badges
    const badgesResult = await db.execute({
      sql: `
        SELECT b.id, b.name, b.description, b.icon_name, b.badge_type, b.tier, ub.earned_at
        FROM user_badges ub
        JOIN badges b ON ub.badge_id = b.id
        WHERE ub.user_id = ?
        ORDER BY ub.earned_at DESC
      `,
      args: [id],
    });

    // Check if current user follows this user
    let isFollowing = false;
    if (session && session.user.id !== id) {
      const followCheck = await db.execute({
        sql: 'SELECT 1 FROM user_follows WHERE follower_id = ? AND followed_id = ?',
        args: [session.user.id, id],
      });
      isFollowing = followCheck.rows.length > 0;
    }

    return Response.json({
      id: user.id,
      name: user.name,
      image: user.image,
      created_at: user.created_at,
      bio: user.bio,
      location: user.location,
      website: user.website,
      cover_image_url: user.cover_image_url,
      social_links: user.social_links ? JSON.parse(user.social_links) : null,
      interests: user.interests ? JSON.parse(user.interests) : null,
      experience_level: user.experience_level,
      climate_zone: user.climate_zone,
      profile_visibility: user.profile_visibility || 'public',
      farm_count: user.farm_count,
      post_count: user.post_count,
      lessons_completed: user.lessons_completed,
      total_xp: user.total_xp,
      follower_count: (followerResult.rows[0] as any).count,
      following_count: (followingResult.rows[0] as any).count,
      badges: badgesResult.rows,
      is_following: isFollowing,
      is_own_profile: session?.user.id === id,
    });
  } catch (error) {
    console.error('User profile error:', error);
    return Response.json({ error: 'Failed to load profile' }, { status: 500 });
  }
}
