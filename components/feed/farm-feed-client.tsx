'use client';

import { useState, useCallback } from 'react';
import { PostCard } from './post-card';
import { useInfiniteScroll } from '@/hooks/use-infinite-scroll';
import { Loader2 } from 'lucide-react';

interface Post {
  id: string;
  farm_id: string;
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

interface FarmFeedClientProps {
  farmId: string;
  initialData: FeedData;
  currentUserId?: string;
}

export function FarmFeedClient({ farmId, initialData, currentUserId }: FarmFeedClientProps) {
  const [posts, setPosts] = useState<Post[]>(initialData.posts);
  const [cursor, setCursor] = useState<string | null>(initialData.next_cursor);
  const [hasMore, setHasMore] = useState(initialData.has_more);
  const [loading, setLoading] = useState(false);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const res = await fetch(
        `/api/farms/${farmId}/feed?cursor=${cursor}&limit=20`
      );
      const data: FeedData = await res.json();

      setPosts((prev) => [...prev, ...data.posts]);
      setCursor(data.next_cursor);
      setHasMore(data.has_more);
    } catch (error) {
      console.error('Failed to load more posts:', error);
    } finally {
      setLoading(false);
    }
  }, [farmId, cursor, loading, hasMore]);

  const { ref } = useInfiniteScroll({
    onLoadMore: loadMore,
    hasMore,
    loading,
  });

  const handlePostUpdate = useCallback((updatedPost: Post) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === updatedPost.id ? updatedPost : p))
    );
  }, []);

  const handlePostDelete = useCallback((postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  }, []);

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {posts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No posts yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Be the first to share!
          </p>
        </div>
      ) : (
        <>
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={currentUserId}
              onUpdate={handlePostUpdate}
              onDelete={handlePostDelete}
            />
          ))}

          {/* Infinite scroll trigger */}
          <div ref={ref} className="h-20 flex items-center justify-center">
            {loading && (
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            )}
            {!hasMore && posts.length > 0 && (
              <p className="text-sm text-muted-foreground">No more posts</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
