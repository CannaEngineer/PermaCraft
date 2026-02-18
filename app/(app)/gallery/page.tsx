import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { GalleryLayoutWrapper } from '@/components/feed/gallery-layout-wrapper';
import { UniversalSearch } from '@/components/search/universal-search';
import { PostTypeTabs } from '@/components/feed/post-type-tabs';
import { TrendingHashtags } from '@/components/feed/trending-hashtags';
import { FilterSidebar } from '@/components/feed/filter-sidebar';
import { ActiveFilters } from '@/components/feed/active-filters';
import { CreatePostButton } from '@/components/feed/create-post-button';
import { FeaturedFarms } from '@/components/feed/featured-farms';
import { WhoToFollow } from '@/components/feed/who-to-follow';
import { TopContributors } from '@/components/feed/top-contributors';
import { RecentActivity } from '@/components/feed/recent-activity';
import { CommunityFeedClient } from '@/components/community/community-feed-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import { Bookmark, TrendingUp, Users, Sprout, Heart, MessageCircle, Eye, Flame, UserCheck, Store } from 'lucide-react';

interface Post {
  id: string;
  farm_id: string;
  farm_name: string;
  farm_description: string | null;
  type: 'text' | 'photo' | 'ai_insight';
  content: string | null;
  media_urls: string[] | null;
  ai_response_excerpt: string | null;
  ai_screenshot: string | null;
  tagged_zones: string[] | null;
  hashtags: string[] | null;
  author: {
    id: string;
    name: string;
    image: string | null;
  };
  reaction_count: number;
  comment_count: number;
  view_count: number;
  created_at: number;
  user_reaction: string | null;
}

interface FeedData {
  posts: Post[];
  next_cursor: string | null;
  has_more: boolean;
}

interface PageProps {
  searchParams: Promise<{
    type?: string;
    hashtag?: string;
    climate_zones?: string | string[];
    farm_size?: string;
    soil_types?: string | string[];
    // Enhanced community filter params
    search?: string;
    sort?: string;
    zone_type?: string;
  }>;
}

async function fetchInitialFeed(
  userId: string | null,
  filters: {
    type?: string;
    hashtag?: string;
    climateZones?: string[];
    farmSize?: string;
    soilTypes?: string[];
  }
): Promise<FeedData> {
  const limit = 20;
  const args: any[] = userId ? [userId, userId] : [];

  let sql = userId
    ? `
    SELECT p.*,
           u.name as author_name,
           u.image as author_image,
           f.name as farm_name,
           f.description as farm_description,
           ai.screenshot_data as ai_screenshot,
           (SELECT reaction_type FROM post_reactions
            WHERE post_id = p.id AND user_id = ?) as user_reaction,
           (SELECT 1 FROM saved_posts
            WHERE post_id = p.id AND user_id = ?) as is_bookmarked
    FROM farm_posts p
    JOIN users u ON p.author_id = u.id
    JOIN farms f ON p.farm_id = f.id
    LEFT JOIN ai_analyses ai ON p.ai_analysis_id = ai.id
    WHERE f.is_public = 1 AND p.is_published = 1
  `
    : `
    SELECT p.*,
           u.name as author_name,
           u.image as author_image,
           f.name as farm_name,
           f.description as farm_description,
           ai.screenshot_data as ai_screenshot,
           NULL as user_reaction,
           NULL as is_bookmarked
    FROM farm_posts p
    JOIN users u ON p.author_id = u.id
    JOIN farms f ON p.farm_id = f.id
    LEFT JOIN ai_analyses ai ON p.ai_analysis_id = ai.id
    WHERE f.is_public = 1 AND p.is_published = 1
  `;

  // Filter by post type
  if (filters.type && filters.type !== 'all') {
    sql += ` AND p.post_type = ?`;
    args.push(filters.type);
  }

  // Filter by hashtag
  if (filters.hashtag) {
    sql += ` AND EXISTS (
      SELECT 1 FROM json_each(p.hashtags)
      WHERE json_each.value = ?
    )`;
    args.push(filters.hashtag);
  }

  // Climate zone filter
  if (filters.climateZones && filters.climateZones.length > 0) {
    const placeholders = filters.climateZones.map(() => '?').join(',');
    sql += ` AND f.climate_zone IN (${placeholders})`;
    args.push(...filters.climateZones);
  }

  // Farm size filter
  if (filters.farmSize) {
    switch (filters.farmSize) {
      case 'small':
        sql += ` AND f.acres < 1`;
        break;
      case 'medium':
        sql += ` AND f.acres >= 1 AND f.acres < 5`;
        break;
      case 'large':
        sql += ` AND f.acres >= 5 AND f.acres < 20`;
        break;
      case 'xlarge':
        sql += ` AND f.acres >= 20`;
        break;
    }
  }

  // Soil type filter
  if (filters.soilTypes && filters.soilTypes.length > 0) {
    const placeholders = filters.soilTypes.map(() => '?').join(',');
    sql += ` AND f.soil_type IN (${placeholders})`;
    args.push(...filters.soilTypes);
  }

  sql += ` ORDER BY p.created_at DESC LIMIT ?`;
  args.push(limit + 1);

  const postsResult = await db.execute({ sql, args });
  const hasMore = postsResult.rows.length > limit;
  const posts = postsResult.rows.slice(0, limit);

  const formattedPosts = posts.map((post: any) => {
    // Parse ai_screenshot JSON array and get first URL
    let aiScreenshot = null;
    if (post.ai_screenshot) {
      try {
        const urls = JSON.parse(post.ai_screenshot);
        aiScreenshot = Array.isArray(urls) && urls.length > 0 ? urls[0] : null;
      } catch (e) {
        // If not JSON, use as-is (fallback for base64)
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

async function fetchFilterOptions() {
  try {
    // Get distinct climate zones from farms with public posts
    const climateResult = await db.execute({
      sql: `
        SELECT DISTINCT f.climate_zone
        FROM farms f
        JOIN farm_posts p ON p.farm_id = f.id
        WHERE f.is_public = 1
          AND p.is_published = 1
          AND f.climate_zone IS NOT NULL
          AND f.climate_zone != ''
        ORDER BY f.climate_zone
      `,
      args: [],
    });

    // Get distinct soil types
    const soilResult = await db.execute({
      sql: `
        SELECT DISTINCT f.soil_type
        FROM farms f
        JOIN farm_posts p ON p.farm_id = f.id
        WHERE f.is_public = 1
          AND p.is_published = 1
          AND f.soil_type IS NOT NULL
          AND f.soil_type != ''
        ORDER BY f.soil_type
      `,
      args: [],
    });

    return {
      climateZones: climateResult.rows.map((row: any) => row.climate_zone),
      soilTypes: soilResult.rows.map((row: any) => row.soil_type),
    };
  } catch (error) {
    console.error("Filter options error:", error);
    return {
      climateZones: [],
      soilTypes: [],
    };
  }
}

async function fetchCommunityStats() {
  try {
    // Get total users with public farms
    const usersResult = await db.execute({
      sql: `SELECT COUNT(DISTINCT user_id) as count FROM farms WHERE is_public = 1`,
      args: [],
    });

    // Get total public farms
    const farmsResult = await db.execute({
      sql: `SELECT COUNT(*) as count FROM farms WHERE is_public = 1`,
      args: [],
    });

    // Get total posts
    const postsResult = await db.execute({
      sql: `SELECT COUNT(*) as count FROM farm_posts WHERE is_published = 1`,
      args: [],
    });

    // Get engagement stats (reactions + comments)
    const engagementResult = await db.execute({
      sql: `
        SELECT
          SUM(reaction_count) as total_reactions,
          SUM(comment_count) as total_comments
        FROM farm_posts
        WHERE is_published = 1
      `,
      args: [],
    });

    const engagement = engagementResult.rows[0] as any;

    return {
      users: (usersResult.rows[0] as any)?.count || 0,
      farms: (farmsResult.rows[0] as any)?.count || 0,
      posts: (postsResult.rows[0] as any)?.count || 0,
      reactions: engagement?.total_reactions || 0,
      comments: engagement?.total_comments || 0,
    };
  } catch (error) {
    console.error('Error fetching community stats:', error);
    return { users: 0, farms: 0, posts: 0, reactions: 0, comments: 0 };
  }
}

export default async function CommunityPage({ searchParams }: PageProps) {
  const session = await getSession();
  const params = await searchParams;

  // Extract all filter parameters
  const type = params.type || 'all';
  const hashtag = params.hashtag;
  const climateZones = params.climate_zones
    ? Array.isArray(params.climate_zones)
      ? params.climate_zones
      : [params.climate_zones]
    : [];
  const farmSize = params.farm_size;
  const soilTypes = params.soil_types
    ? Array.isArray(params.soil_types)
      ? params.soil_types
      : [params.soil_types]
    : [];

  const [initialData, filterOptions, communityStats] = await Promise.all([
    fetchInitialFeed(session?.user.id || null, {
      type,
      hashtag,
      climateZones,
      farmSize,
      soilTypes,
    }),
    fetchFilterOptions(),
    fetchCommunityStats(),
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Hero Section - Clean & Minimal */}
      <div className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto p-4 md:p-6 lg:p-8">
          <div className="max-w-[1600px] mx-auto">
            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500/20 to-green-500/20 flex items-center justify-center">
                  <Users className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-serif font-bold">
                    Community
                  </h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    {hashtag
                      ? `Exploring #${hashtag}`
                      : 'Share knowledge, grow together'}
                  </p>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap items-center gap-2">
                {session && <CreatePostButton />}
                <Link href="/gallery/saved">
                  <Button variant="outline" size="default" className="gap-2 rounded-xl">
                    <Bookmark className="w-4 h-4" />
                    <span className="hidden sm:inline">Saved</span>
                  </Button>
                </Link>
                {session && (
                  <Link href="/gallery/following">
                    <Button variant="outline" size="default" className="gap-2 rounded-xl">
                      <UserCheck className="w-4 h-4 text-blue-500" />
                      <span className="hidden sm:inline">Following</span>
                    </Button>
                  </Link>
                )}
                <Link href="/gallery/trending">
                  <Button variant="outline" size="default" className="gap-2 rounded-xl">
                    <Flame className="w-4 h-4 text-orange-500" />
                    <span className="hidden sm:inline">Trending</span>
                  </Button>
                </Link>
                <Link href="/shops">
                  <Button variant="outline" size="default" className="gap-2 rounded-xl">
                    <Store className="w-4 h-4 text-green-600" />
                    <span className="hidden sm:inline">Shops</span>
                  </Button>
                </Link>
              </div>
            </div>

            {/* Community Stats - With Animations */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { icon: Users, label: 'Farmers', value: communityStats.users, color: 'blue', delay: '0ms' },
                { icon: Sprout, label: 'Farms', value: communityStats.farms, color: 'green', delay: '50ms' },
                { icon: MessageCircle, label: 'Posts', value: communityStats.posts, color: 'purple', delay: '100ms' },
                { icon: Heart, label: 'Reactions', value: communityStats.reactions.toLocaleString(), color: 'red', delay: '150ms' },
                { icon: Eye, label: 'Comments', value: communityStats.comments.toLocaleString(), color: 'amber', delay: '200ms' },
              ].map((stat, index) => {
                const Icon = stat.icon;
                const colorClasses = {
                  blue: 'bg-blue-500/10 text-blue-500',
                  green: 'bg-green-500/10 text-green-500',
                  purple: 'bg-purple-500/10 text-purple-500',
                  red: 'bg-red-500/10 text-red-500',
                  amber: 'bg-amber-500/10 text-amber-500',
                };

                return (
                  <Card
                    key={stat.label}
                    className="hover:shadow-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-2"
                    style={{ animationDelay: stat.delay }}
                  >
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${colorClasses[stat.color as keyof typeof colorClasses]}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xl md:text-2xl font-bold">{stat.value}</p>
                        <p className="text-xs text-muted-foreground">{stat.label}</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="container mx-auto p-4 md:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 max-w-[1600px] mx-auto">
          {/* Left Sidebar - Discovery & Social */}
          <aside className="lg:col-span-3 space-y-6 order-2 lg:order-1 animate-in fade-in duration-500" style={{ animationDelay: '100ms' }}>
            <div className="lg:sticky lg:top-6 space-y-6">
              {/* Who to Follow */}
              {session && <WhoToFollow currentUserId={session.user.id} />}

              {/* Top Contributors */}
              <TopContributors />

              {/* Trending Hashtags */}
              <TrendingHashtags />
            </div>
          </aside>

          {/* Center Feed */}
          <main className="lg:col-span-6 space-y-6 order-1 lg:order-2">
            {/* Featured Farms */}
            <div className="animate-in fade-in duration-500">
              <FeaturedFarms />
            </div>

            <Separator className="my-6" />

            {/* Post Type Tabs (existing filter preserved) */}
            <div className="animate-in fade-in duration-500" style={{ animationDelay: '100ms' }}>
              <PostTypeTabs />
            </div>

            {/* Active Filters (existing filter chips preserved) */}
            <ActiveFilters />

            {/* Enhanced community feed with search, sort, and zone filters */}
            <div className="animate-in fade-in duration-500" style={{ animationDelay: '200ms' }}>
              <CommunityFeedClient currentUserId={session?.user.id} />
            </div>
          </main>

          {/* Right Sidebar - Activity & Filters */}
          <aside className="lg:col-span-3 space-y-6 order-3 animate-in fade-in duration-500" style={{ animationDelay: '200ms' }}>
            <div className="lg:sticky lg:top-6 space-y-6">
              {/* Recent Activity */}
              <RecentActivity />

              {/* Advanced Filters */}
              <FilterSidebar availableFilters={filterOptions} />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
