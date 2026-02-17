'use client';

import { useState, useCallback } from 'react';
import { PostCard } from '@/components/feed/post-card';
import { Button } from '@/components/ui/button';
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
  author: { id: string; name: string; image: string | null };
  reaction_count: number;
  comment_count: number;
  view_count: number;
  created_at: number;
  user_reaction: string | null;
  is_bookmarked: boolean;
}

interface ProfilePostsTabProps {
  userId: string;
  currentUserId?: string;
  initialPosts: Post[];
  initialCursor: string | null;
  initialHasMore: boolean;
}

export function ProfilePostsTab({
  userId,
  currentUserId,
  initialPosts,
  initialCursor,
  initialHasMore,
}: ProfilePostsTabProps) {
  const [posts, setPosts] = useState(initialPosts);
  const [cursor, setCursor] = useState(initialCursor);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${userId}/posts?cursor=${cursor}&limit=20`);
      const data = await res.json();
      setPosts((prev) => [...prev, ...data.posts]);
      setCursor(data.next_cursor);
      setHasMore(data.has_more);
    } catch (error) {
      console.error('Failed to load more posts:', error);
    } finally {
      setLoading(false);
    }
  }, [userId, cursor, hasMore, loading]);

  if (posts.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No posts yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl">
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          currentUserId={currentUserId}
          onUpdate={(updated) => {
            setPosts((prev) =>
              prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p))
            );
          }}
          onDelete={(deletedId) => {
            setPosts((prev) => prev.filter((p) => p.id !== deletedId));
          }}
        />
      ))}
      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button variant="outline" onClick={loadMore} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              'Load More'
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
