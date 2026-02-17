'use client';

import { useState, useEffect, useCallback, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PostCard } from '@/components/feed/post-card';
import { LayoutToggle } from '@/components/feed/layout-toggle';
import { GalleryFilters, GalleryFilters as GalleryFiltersType } from './gallery-filters';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Sprout } from 'lucide-react';

interface Post {
  id: string;
  farm_id: string;
  farm_name?: string;
  farm_description?: string | null;
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
  is_bookmarked?: boolean;
}

interface FeedResponse {
  posts: Post[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

interface CommunityFeedClientProps {
  currentUserId?: string;
}

const LIMIT = 12;

function PostCardSkeleton() {
  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="p-4 flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <Skeleton className="w-full aspect-video" />
      <div className="p-4 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}

function EmptyState({ search, zoneType }: { search: string; zoneType: string }) {
  const hasFilters = search || zoneType;
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
        <Sprout className="w-8 h-8 text-primary/60" />
      </div>
      <h3 className="text-lg font-semibold mb-2">
        {hasFilters ? 'No farms match your search' : 'No posts yet'}
      </h3>
      <p className="text-sm text-muted-foreground max-w-xs">
        {hasFilters
          ? 'Try different filters or search terms to find what you are looking for.'
          : 'Be the first to share your farm with the community!'}
      </p>
    </div>
  );
}

export function CommunityFeedClient({ currentUserId }: CommunityFeedClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Read initial filter values from URL
  const urlSearch = searchParams?.get('search') || '';
  const urlSort = (searchParams?.get('sort') || 'recent') as GalleryFiltersType['sort'];
  const urlZoneType = searchParams?.get('zone_type') || '';

  const [filters, setFilters] = useState<GalleryFiltersType>({
    search: urlSearch,
    sort: urlSort,
    zoneType: urlZoneType,
  });

  const [posts, setPosts] = useState<Post[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [layout, setLayout] = useState<'list' | 'grid'>('list');

  const fetchPosts = useCallback(
    async (currentFilters: GalleryFiltersType, currentPage: number, append = false) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      try {
        const params = new URLSearchParams();
        params.set('page', String(currentPage));
        params.set('limit', String(LIMIT));
        if (currentFilters.search) params.set('search', currentFilters.search);
        if (currentFilters.sort !== 'recent') params.set('sort', currentFilters.sort);
        if (currentFilters.zoneType) params.set('zone_type', currentFilters.zoneType);

        const res = await fetch(`/api/community/feed?${params.toString()}`);
        if (!res.ok) throw new Error('Failed to fetch feed');
        const data: FeedResponse = await res.json();

        if (append) {
          setPosts((prev) => [...prev, ...data.posts]);
        } else {
          setPosts(data.posts);
        }
        setTotal(data.total);
        setPage(data.page);
        setHasMore(data.hasMore);
      } catch (err) {
        console.error('Community feed fetch error:', err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    []
  );

  // Re-fetch on filter change (reset to page 1)
  useEffect(() => {
    fetchPosts(filters, 1, false);
  }, [filters, fetchPosts]);

  // Sync filters to URL for shareability
  const handleFiltersChange = useCallback(
    (newFilters: GalleryFiltersType) => {
      setFilters(newFilters);

      startTransition(() => {
        const params = new URLSearchParams(searchParams?.toString() || '');

        // Preserve existing non-filter params (type, hashtag, etc.)
        if (newFilters.search) {
          params.set('search', newFilters.search);
        } else {
          params.delete('search');
        }

        if (newFilters.sort && newFilters.sort !== 'recent') {
          params.set('sort', newFilters.sort);
        } else {
          params.delete('sort');
        }

        if (newFilters.zoneType) {
          params.set('zone_type', newFilters.zoneType);
        } else {
          params.delete('zone_type');
        }

        const qs = params.toString();
        router.replace(qs ? `/gallery?${qs}` : '/gallery', { scroll: false });
      });
    },
    [router, searchParams]
  );

  const handleLoadMore = useCallback(() => {
    fetchPosts(filters, page + 1, true);
  }, [filters, page, fetchPosts]);

  const handlePostUpdate = useCallback((updatedPost: Post) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === updatedPost.id ? { ...p, ...updatedPost } : p))
    );
  }, []);

  const handlePostDelete = useCallback((postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    setTotal((prev) => Math.max(0, prev - 1));
  }, []);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <GalleryFilters
        onFiltersChange={handleFiltersChange}
        initialFilters={filters}
      />

      {/* Layout toggle + result count */}
      <div className="flex items-center justify-between">
        {!loading && (
          <p className="text-sm text-muted-foreground">
            {total > 0 ? `${total} post${total === 1 ? '' : 's'}` : ''}
          </p>
        )}
        <div className="ml-auto">
          <LayoutToggle onLayoutChange={setLayout} />
        </div>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className={layout === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'space-y-4'}>
          {Array.from({ length: LIMIT }).map((_, i) => (
            <PostCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && posts.length === 0 && (
        <EmptyState search={filters.search} zoneType={filters.zoneType} />
      )}

      {/* Posts grid/list */}
      {!loading && posts.length > 0 && (
        <>
          <div className={layout === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'space-y-4'}>
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUserId={currentUserId}
                onUpdate={handlePostUpdate}
                onDelete={handlePostDelete}
              />
            ))}
          </div>

          {/* Load more / end of feed */}
          <div className="flex justify-center pt-4">
            {hasMore ? (
              <Button
                variant="outline"
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="min-w-[140px]"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Load More'
                )}
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">
                All posts loaded
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
