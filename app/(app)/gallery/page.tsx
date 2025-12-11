import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { GalleryLayoutWrapper } from '@/components/feed/gallery-layout-wrapper';
import { UniversalSearch } from '@/components/search/universal-search';
import { PostTypeTabs } from '@/components/feed/post-type-tabs';
import { TrendingHashtags } from '@/components/feed/trending-hashtags';
import { FilterSidebar } from '@/components/feed/filter-sidebar';
import { ActiveFilters } from '@/components/feed/active-filters';
import Link from 'next/link';
import { Bookmark } from 'lucide-react';

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

export default async function GalleryPage({ searchParams }: PageProps) {
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

  const [initialData, filterOptions] = await Promise.all([
    fetchInitialFeed(session?.user.id || null, {
      type,
      hashtag,
      climateZones,
      farmSize,
      soilTypes,
    }),
    fetchFilterOptions(),
  ]);

  return (
    <div className="container mx-auto py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-4 mb-4">
          <h1 className="text-3xl font-bold">Community Gallery</h1>
          <Link
            href="/gallery/saved"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent hover:bg-accent/80 transition-colors text-sm font-medium"
          >
            <Bookmark className="w-4 h-4" />
            Saved Posts
          </Link>
        </div>
        <p className="text-muted-foreground mt-2">
          {hashtag ? `Posts tagged with #${hashtag}` : 'Discover farms and permaculture designs from the community'}
        </p>
      </div>

      {/* Two Column Layout: Feed + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
        {/* Main Feed Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Search Community Content */}
          <div>
            <UniversalSearch
              context="community"
              placeholder="Search public farms and posts..."
              className="w-full"
            />
          </div>

          {/* Post Type Filter Tabs */}
          <PostTypeTabs />

          {/* Active Filters */}
          <ActiveFilters />

          {/* Feed with Layout Toggle */}
          <GalleryLayoutWrapper
            initialData={initialData}
            filterType={type}
            filterHashtag={hashtag}
            filterClimateZones={climateZones}
            filterFarmSize={farmSize}
            filterSoilTypes={soilTypes}
          />
        </div>

        {/* Sidebar Column */}
        <aside className="space-y-6">
          <FilterSidebar availableFilters={filterOptions} />
          <TrendingHashtags />
        </aside>
      </div>
    </div>
  );
}
