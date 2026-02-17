import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { notFound } from 'next/navigation';
import { ProfileHeader } from '@/components/profile/profile-header';
import { ProfileTabs } from '@/components/profile/profile-tabs';
import { ProfilePostsTab } from '@/components/profile/profile-posts-tab';
import { ProfileFarmsTab } from '@/components/profile/profile-farms-tab';
import { ProfileBadgesTab } from '@/components/profile/profile-badges-tab';

interface PageProps {
  params: Promise<{ id: string }>;
}

async function fetchProfile(id: string, viewerId: string | null) {
  const userResult = await db.execute({
    sql: `
      SELECT
        u.id, u.name, u.email, u.image, u.created_at,
        u.bio, u.location, u.website, u.cover_image_url,
        u.social_links, u.interests, u.experience_level,
        u.climate_zone, u.profile_visibility
      FROM users u
      WHERE u.id = ?
    `,
    args: [id],
  });

  if (userResult.rows.length === 0) return null;

  const user = userResult.rows[0] as any;

  // Check visibility
  if (user.profile_visibility === 'private' && viewerId !== id) return null;
  if (user.profile_visibility === 'registered' && !viewerId) return null;

  // Parallel fetch all profile data
  const [followerResult, followingResult, badgesResult, followCheck] = await Promise.all([
    db.execute({
      sql: 'SELECT COUNT(*) as count FROM user_follows WHERE followed_id = ?',
      args: [id],
    }),
    db.execute({
      sql: 'SELECT COUNT(*) as count FROM user_follows WHERE follower_id = ?',
      args: [id],
    }),
    db.execute({
      sql: `
        SELECT b.id, b.name, b.description, b.icon_name, b.badge_type, b.tier, ub.earned_at
        FROM user_badges ub
        JOIN badges b ON ub.badge_id = b.id
        WHERE ub.user_id = ?
        ORDER BY ub.earned_at DESC
      `,
      args: [id],
    }),
    viewerId && viewerId !== id
      ? db.execute({
          sql: 'SELECT 1 FROM user_follows WHERE follower_id = ? AND followed_id = ?',
          args: [viewerId, id],
        })
      : Promise.resolve({ rows: [] }),
  ]);

  return {
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
    follower_count: (followerResult.rows[0] as any).count,
    following_count: (followingResult.rows[0] as any).count,
    badges: badgesResult.rows as any[],
    is_following: followCheck.rows.length > 0,
    is_own_profile: viewerId === id,
  };
}

async function fetchUserPosts(userId: string, viewerId: string | null) {
  const limit = 20;
  const args: any[] = [];

  let sql = `
    SELECT p.*,
           u.name as author_name,
           u.image as author_image,
           f.name as farm_name,
           f.description as farm_description,
           ai.screenshot_data as ai_screenshot
  `;

  if (viewerId) {
    sql += `,
           (SELECT reaction_type FROM post_reactions
            WHERE post_id = p.id AND user_id = ?) as user_reaction,
           (SELECT 1 FROM saved_posts
            WHERE post_id = p.id AND user_id = ?) as is_bookmarked
    `;
    args.push(viewerId, viewerId);
  } else {
    sql += `, NULL as user_reaction, NULL as is_bookmarked`;
  }

  sql += `
    FROM farm_posts p
    JOIN users u ON p.author_id = u.id
    JOIN farms f ON p.farm_id = f.id
    LEFT JOIN ai_analyses ai ON p.ai_analysis_id = ai.id
    WHERE p.author_id = ? AND p.is_published = 1 AND f.is_public = 1
    ORDER BY p.created_at DESC
    LIMIT ?
  `;
  args.push(userId, limit + 1);

  const postsResult = await db.execute({ sql, args });
  const hasMore = postsResult.rows.length > limit;
  const posts = postsResult.rows.slice(0, limit);

  const formattedPosts = posts.map((post: any) => {
    let aiScreenshot = null;
    if (post.ai_screenshot) {
      try {
        const urls = JSON.parse(post.ai_screenshot);
        aiScreenshot = Array.isArray(urls) && urls.length > 0 ? urls[0] : null;
      } catch {
        aiScreenshot = post.ai_screenshot;
      }
    }

    return {
      id: post.id,
      farm_id: post.farm_id,
      farm_name: post.farm_name,
      farm_description: post.farm_description,
      type: post.post_type,
      content: post.content,
      media_urls: post.media_urls ? JSON.parse(post.media_urls) : null,
      ai_response_excerpt: post.ai_response_excerpt,
      ai_screenshot: aiScreenshot,
      tagged_zones: post.tagged_zones ? JSON.parse(post.tagged_zones) : null,
      hashtags: post.hashtags ? JSON.parse(post.hashtags) : null,
      author: {
        id: post.author_id,
        name: post.author_name,
        image: post.author_image,
      },
      reaction_count: post.reaction_count,
      comment_count: post.comment_count,
      view_count: post.view_count,
      created_at: post.created_at,
      user_reaction: post.user_reaction,
      is_bookmarked: post.is_bookmarked === 1,
    };
  });

  return {
    posts: formattedPosts,
    next_cursor: hasMore ? formattedPosts[formattedPosts.length - 1].id : null,
    has_more: hasMore,
  };
}

async function fetchUserFarms(userId: string) {
  const result = await db.execute({
    sql: `
      SELECT f.*,
             COUNT(DISTINCT p.id) as post_count,
             COUNT(DISTINCT z.id) as zone_count,
             COUNT(DISTINCT pl.id) as planting_count
      FROM farms f
      LEFT JOIN farm_posts p ON p.farm_id = f.id AND p.is_published = 1
      LEFT JOIN zones z ON z.farm_id = f.id
      LEFT JOIN plantings pl ON pl.farm_id = f.id
      WHERE f.user_id = ? AND f.is_public = 1
      GROUP BY f.id
      ORDER BY f.updated_at DESC
    `,
    args: [userId],
  });
  return result.rows as any[];
}

export default async function ProfilePage({ params }: PageProps) {
  const { id } = await params;
  const session = await getSession();
  const viewerId = session?.user.id || null;

  const [profile, postsData, farms] = await Promise.all([
    fetchProfile(id, viewerId),
    fetchUserPosts(id, viewerId),
    fetchUserFarms(id),
  ]);

  if (!profile) {
    notFound();
  }

  const tabs = [
    { id: 'posts', label: 'Posts', count: postsData.posts.length },
    { id: 'farms', label: 'Farms', count: farms.length },
    { id: 'badges', label: 'Badges', count: profile.badges.length },
  ];

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <ProfileHeader profile={profile} />

      <div className="mt-8">
        <ProfileTabs tabs={tabs}>
          {(activeTab) => {
            switch (activeTab) {
              case 'posts':
                return (
                  <ProfilePostsTab
                    userId={id}
                    currentUserId={viewerId || undefined}
                    initialPosts={postsData.posts}
                    initialCursor={postsData.next_cursor}
                    initialHasMore={postsData.has_more}
                  />
                );
              case 'farms':
                return <ProfileFarmsTab farms={farms} />;
              case 'badges':
                return <ProfileBadgesTab badges={profile.badges} />;
              default:
                return null;
            }
          }}
        </ProfileTabs>
      </div>
    </div>
  );
}
