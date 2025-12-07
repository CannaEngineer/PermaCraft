'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { GlobalFeedClient } from '@/components/feed/global-feed-client';
import { UniversalSearch } from '@/components/search/universal-search';
import { PostTypeTabs } from '@/components/feed/post-type-tabs';
import { Loader2 } from 'lucide-react';

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

export function GalleryPageClient() {
  const searchParams = useSearchParams();
  const [feedData, setFeedData] = useState<FeedData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchFeed = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      const type = searchParams.get('type');

      if (type && type !== 'all') {
        params.set('type', type);
      }

      const url = `/api/feed/global?${params.toString()}`;
      const res = await fetch(url);
      const data: FeedData = await res.json();

      setFeedData(data);
    } catch (error) {
      console.error('Failed to fetch feed:', error);
    } finally {
      setIsLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Community Gallery</h1>
          <p className="text-muted-foreground mt-2">
            Discover farms and permaculture designs from the community
          </p>
        </div>

        {/* Search Community Content */}
        <div className="mb-2">
          <UniversalSearch
            context="community"
            placeholder="Search public farms and posts..."
            className="w-full"
          />
        </div>

        {/* Post Type Filter Tabs */}
        <PostTypeTabs />

        {/* Feed */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : feedData ? (
          <GlobalFeedClient initialData={feedData} filterType={searchParams.get('type') || 'all'} />
        ) : (
          <div className="text-center py-12 border rounded-lg">
            <p className="text-muted-foreground">Failed to load feed</p>
          </div>
        )}
      </div>
    </div>
  );
}
