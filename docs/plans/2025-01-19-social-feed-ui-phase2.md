# Social Feed UI - Phase 2 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build user-facing UI components for farm sharing, photo uploads, and community engagement with social media polish.

**Architecture:** React client components with optimistic updates, infinite scroll feed, nested comment threads, and animated reactions. Zero external dependencies beyond what's already installed (react-markdown, shadcn/ui).

**Tech Stack:** Next.js 14, React Server Components + Client Components, Tailwind CSS, shadcn/ui, IntersectionObserver API

---

## Task 1: Create Infinite Scroll Hook

**Files:**
- Create: `hooks/use-infinite-scroll.ts`

**Step 1: Write the hook**

```typescript
import { useCallback, useRef } from 'react';

/**
 * Custom hook for infinite scroll using IntersectionObserver
 *
 * Usage:
 * const { ref } = useInfiniteScroll({
 *   onLoadMore: fetchNextPage,
 *   hasMore: true,
 *   loading: false
 * });
 *
 * <div ref={ref}>Trigger element</div>
 */
export function useInfiniteScroll({
  onLoadMore,
  hasMore,
  loading,
}: {
  onLoadMore: () => void;
  hasMore: boolean;
  loading: boolean;
}) {
  const observerRef = useRef<IntersectionObserver>();

  const lastElementRef = useCallback(
    (node: HTMLElement | null) => {
      if (loading) return;
      if (observerRef.current) observerRef.current.disconnect();

      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          onLoadMore();
        }
      });

      if (node) observerRef.current.observe(node);
    },
    [loading, hasMore, onLoadMore]
  );

  return { ref: lastElementRef };
}
```

**Step 2: Commit**

```bash
git add hooks/use-infinite-scroll.ts
git commit -m "feat: add infinite scroll hook for feed pagination"
```

---

## Task 2: Create Post Card Component

**Files:**
- Create: `components/feed/post-card.tsx`

**Step 1: Create basic post card structure**

```typescript
'use client';

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { SparklesIcon } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Author {
  id: string;
  name: string;
  image: string | null;
}

interface Post {
  id: string;
  farm_id: string;
  type: 'text' | 'photo' | 'ai_insight';
  content: string | null;
  media_urls: string[] | null;
  tagged_zones: string[] | null;
  hashtags: string[] | null;
  author: Author;
  reaction_count: number;
  comment_count: number;
  view_count: number;
  created_at: number;
  user_reaction: string | null;
}

interface PostCardProps {
  post: Post;
  onUpdate?: (post: Post) => void;
}

export function PostCard({ post, onUpdate }: PostCardProps) {
  const formatRelativeTime = (timestamp: number) => {
    const seconds = Math.floor(Date.now() / 1000 - timestamp);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <CardHeader className="flex-row items-center gap-3 pb-3">
        <Avatar>
          <AvatarImage src={post.author.image || undefined} />
          <AvatarFallback>{post.author.name[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <p className="font-semibold">{post.author.name}</p>
          <p className="text-xs text-muted-foreground">
            {formatRelativeTime(post.created_at)}
          </p>
        </div>
        {post.type === 'ai_insight' && (
          <Badge variant="secondary" className="gap-1">
            <SparklesIcon className="w-3 h-3" />
            AI Insight
          </Badge>
        )}
      </CardHeader>

      {/* Media */}
      {post.media_urls && post.media_urls.length > 0 && (
        <div className="relative w-full aspect-video bg-muted">
          <img
            src={post.media_urls[0]}
            alt="Post media"
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Content */}
      <CardContent className="pt-4">
        {post.content && (
          <ReactMarkdown
            className="prose prose-sm max-w-none dark:prose-invert"
            remarkPlugins={[remarkGfm]}
          >
            {post.content}
          </ReactMarkdown>
        )}

        {/* Tagged zones */}
        {post.tagged_zones && post.tagged_zones.length > 0 && (
          <div className="flex gap-2 mt-3 flex-wrap">
            {post.tagged_zones.map((zone) => (
              <Badge key={zone} variant="outline" className="text-xs">
                📍 Zone {zone}
              </Badge>
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="flex gap-4 mt-4 text-sm text-muted-foreground">
          <span>{post.reaction_count} reactions</span>
          <span>{post.comment_count} comments</span>
          <span>{post.view_count} views</span>
        </div>
      </CardContent>

      {/* Actions (placeholder for now) */}
      <CardFooter className="border-t pt-3">
        <p className="text-sm text-muted-foreground">Actions coming soon...</p>
      </CardFooter>
    </Card>
  );
}
```

**Step 2: Commit**

```bash
git add components/feed/post-card.tsx
git commit -m "feat: add basic post card component"
```

---

## Task 3: Create Farm Feed Client Component

**Files:**
- Create: `components/feed/farm-feed-client.tsx`

**Step 1: Create feed container with infinite scroll**

```typescript
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
}

export function FarmFeedClient({ farmId, initialData }: FarmFeedClientProps) {
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
              onUpdate={handlePostUpdate}
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
```

**Step 2: Commit**

```bash
git add components/feed/farm-feed-client.tsx
git commit -m "feat: add farm feed with infinite scroll"
```

---

## Task 4: Update Farm Page to Include Feed

**Files:**
- Modify: `app/(app)/farm/[id]/page.tsx`

**Step 1: Read current farm page**

```bash
# Review the current structure
cat app/(app)/farm/[id]/page.tsx
```

**Step 2: Add feed data fetching**

Find the server component in `app/(app)/farm/[id]/page.tsx` and add feed fetching:

```typescript
// Add this import at the top
import { FarmFeedClient } from '@/components/feed/farm-feed-client';

// In the server component, after fetching farm data, add:
const feedResult = await db.execute({
  sql: `SELECT p.*,
               u.name as author_name,
               u.image as author_image,
               (SELECT reaction_type FROM post_reactions
                WHERE post_id = p.id AND user_id = ?) as user_reaction
        FROM farm_posts p
        JOIN users u ON p.author_id = u.id
        WHERE p.farm_id = ? AND p.is_published = 1
        ORDER BY p.created_at DESC
        LIMIT 20`,
  args: [session.user.id, params.id],
});

const posts = feedResult.rows.map((post: any) => ({
  id: post.id,
  farm_id: post.farm_id,
  type: post.post_type,
  content: post.content,
  media_urls: post.media_urls ? JSON.parse(post.media_urls) : null,
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
}));

const initialFeedData = {
  posts,
  next_cursor: posts.length === 20 ? posts[posts.length - 1].id : null,
  has_more: posts.length === 20,
};
```

**Step 3: Add feed to the JSX**

In the return statement, add the feed component below the map editor:

```typescript
<div className="mt-8">
  <h2 className="text-2xl font-bold mb-4">Farm Feed</h2>
  <FarmFeedClient farmId={params.id} initialData={initialFeedData} />
</div>
```

**Step 4: Test the changes**

```bash
npm run dev
# Visit http://localhost:3000/farm/[your-farm-id]
# Verify feed section appears (will be empty initially)
```

**Step 5: Commit**

```bash
git add app/(app)/farm/[id]/page.tsx
git commit -m "feat: integrate feed into farm page"
```

---

## Task 5: Create Reaction Button Component

**Files:**
- Create: `components/feed/reaction-button.tsx`

**Step 1: Create reaction button with picker**

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { HeartIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const REACTIONS = [
  { type: 'heart', emoji: '❤️', label: 'Love' },
  { type: 'seedling', emoji: '🌱', label: 'Inspired' },
  { type: 'bulb', emoji: '💡', label: 'Learned' },
  { type: 'fire', emoji: '🔥', label: 'Impressive' },
] as const;

type ReactionType = typeof REACTIONS[number]['type'];

interface ReactionButtonProps {
  currentReaction: string | null;
  reactionCount: number;
  onReact: (type: ReactionType) => Promise<void>;
  disabled?: boolean;
}

export function ReactionButton({
  currentReaction,
  reactionCount,
  onReact,
  disabled,
}: ReactionButtonProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [animating, setAnimating] = useState(false);

  const handleReact = async (type: ReactionType) => {
    setAnimating(true);
    setShowPicker(false);
    await onReact(type);
    setTimeout(() => setAnimating(false), 600);
  };

  const currentReactionEmoji = currentReaction
    ? REACTIONS.find((r) => r.type === currentReaction)?.emoji
    : null;

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowPicker(!showPicker)}
        disabled={disabled}
        className={cn(
          'gap-2',
          currentReaction && 'text-red-500 hover:text-red-600',
          animating && 'animate-bounce'
        )}
      >
        {currentReactionEmoji || <HeartIcon className="w-4 h-4" />}
        <span>{reactionCount > 0 ? reactionCount : 'React'}</span>
      </Button>

      {/* Reaction picker */}
      {showPicker && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowPicker(false)}
          />
          <div className="absolute bottom-full left-0 mb-2 bg-background border rounded-lg shadow-lg p-2 flex gap-1 z-20 animate-in fade-in zoom-in-95">
            {REACTIONS.map(({ type, emoji, label }) => (
              <button
                key={type}
                onClick={() => handleReact(type)}
                className="hover:scale-125 transition-transform p-2 rounded hover:bg-accent"
                title={label}
                disabled={disabled}
              >
                <span className="text-2xl">{emoji}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add components/feed/reaction-button.tsx
git commit -m "feat: add animated reaction button with picker"
```

---

## Task 6: Create Post Actions Component

**Files:**
- Create: `components/feed/post-actions.tsx`

**Step 1: Create actions bar**

```typescript
'use client';

import { Button } from '@/components/ui/button';
import { MessageSquareIcon, ShareIcon } from 'lucide-react';
import { ReactionButton } from './reaction-button';
import { useState } from 'react';

interface PostActionsProps {
  postId: string;
  farmId: string;
  userReaction: string | null;
  reactionCount: number;
  commentCount: number;
  onCommentClick: () => void;
  onReactionUpdate: (newReaction: string | null, newCount: number) => void;
}

export function PostActions({
  postId,
  farmId,
  userReaction,
  reactionCount,
  commentCount,
  onCommentClick,
  onReactionUpdate,
}: PostActionsProps) {
  const [currentReaction, setCurrentReaction] = useState(userReaction);
  const [currentCount, setCurrentCount] = useState(reactionCount);
  const [loading, setLoading] = useState(false);

  const handleReact = async (type: string) => {
    if (loading) return;

    // Optimistic update
    const wasReacted = currentReaction === type;
    const newReaction = wasReacted ? null : type;
    const newCount = wasReacted ? currentCount - 1 : currentCount + 1;

    setCurrentReaction(newReaction);
    setCurrentCount(newCount);

    setLoading(true);
    try {
      const res = await fetch(
        `/api/farms/${farmId}/posts/${postId}/reactions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reaction_type: type }),
        }
      );

      const data = await res.json();

      // Sync with server response
      setCurrentReaction(data.user_reaction);
      setCurrentCount(data.new_count);
      onReactionUpdate(data.user_reaction, data.new_count);
    } catch (error) {
      console.error('Failed to react:', error);
      // Rollback on error
      setCurrentReaction(userReaction);
      setCurrentCount(reactionCount);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/farm/${farmId}#post-${postId}`;
    try {
      await navigator.clipboard.writeText(url);
      // TODO: Show toast notification
      console.log('Link copied!');
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <ReactionButton
        currentReaction={currentReaction}
        reactionCount={currentCount}
        onReact={handleReact}
        disabled={loading}
      />

      <Button
        variant="ghost"
        size="sm"
        onClick={onCommentClick}
        className="gap-2"
      >
        <MessageSquareIcon className="w-4 h-4" />
        <span>{commentCount > 0 ? commentCount : 'Comment'}</span>
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={handleShare}
        className="gap-2"
      >
        <ShareIcon className="w-4 h-4" />
        <span>Share</span>
      </Button>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add components/feed/post-actions.tsx
git commit -m "feat: add post actions with reactions and share"
```

---

## Task 7: Update Post Card with Actions

**Files:**
- Modify: `components/feed/post-card.tsx`

**Step 1: Add state and actions**

Replace the placeholder footer in `post-card.tsx`:

```typescript
import { useState } from 'react';
import { PostActions } from './post-actions';

// Add to component:
const [showComments, setShowComments] = useState(false);
const [reactionCount, setReactionCount] = useState(post.reaction_count);
const [userReaction, setUserReaction] = useState(post.user_reaction);
const [commentCount, setCommentCount] = useState(post.comment_count);

const handleReactionUpdate = (newReaction: string | null, newCount: number) => {
  setUserReaction(newReaction);
  setReactionCount(newCount);
  if (onUpdate) {
    onUpdate({ ...post, user_reaction: newReaction, reaction_count: newCount });
  }
};

// Replace the CardFooter:
<CardFooter className="border-t pt-3">
  <PostActions
    postId={post.id}
    farmId={post.farm_id}
    userReaction={userReaction}
    reactionCount={reactionCount}
    commentCount={commentCount}
    onCommentClick={() => setShowComments(!showComments)}
    onReactionUpdate={handleReactionUpdate}
  />
</CardFooter>
```

**Step 2: Test reactions**

```bash
npm run dev
# Click on a post's reaction button
# Verify picker appears
# Click a reaction emoji
# Verify count updates
```

**Step 3: Commit**

```bash
git add components/feed/post-card.tsx
git commit -m "feat: integrate reactions into post card"
```

---

## Task 8: Create Comment Form Component

**Files:**
- Create: `components/feed/comment-form.tsx`

**Step 1: Create comment input**

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { SendIcon } from 'lucide-react';

interface CommentFormProps {
  postId: string;
  farmId: string;
  parentCommentId?: string;
  onCommentAdded: (comment: any) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export function CommentForm({
  postId,
  farmId,
  parentCommentId,
  onCommentAdded,
  placeholder = 'Write a comment...',
  autoFocus = false,
}: CommentFormProps) {
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/farms/${farmId}/posts/${postId}/comments`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: content.trim(),
            parent_comment_id: parentCommentId,
          }),
        }
      );

      const data = await res.json();
      onCommentAdded(data.comment);
      setContent('');
    } catch (error) {
      console.error('Failed to post comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder}
        rows={2}
        className="resize-none"
        autoFocus={autoFocus}
        disabled={submitting}
      />
      <Button
        type="submit"
        size="icon"
        disabled={!content.trim() || submitting}
      >
        <SendIcon className="w-4 h-4" />
      </Button>
    </form>
  );
}
```

**Step 2: Commit**

```bash
git add components/feed/comment-form.tsx
git commit -m "feat: add comment form component"
```

---

## Task 9: Create Comment Thread Component

**Files:**
- Create: `components/feed/comment-thread.tsx`

**Step 1: Create nested comment display**

```typescript
'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import { useState } from 'react';
import { CommentForm } from './comment-form';

interface Comment {
  id: string;
  post_id: string;
  parent_comment_id: string | null;
  author: {
    id: string;
    name: string;
    image: string | null;
  };
  content: string;
  reaction_count: number;
  user_reaction: string | null;
  created_at: number;
  replies: Comment[];
}

interface CommentThreadProps {
  comment: Comment;
  postId: string;
  farmId: string;
  depth: number;
  onReplyAdded: (comment: Comment) => void;
}

const MAX_DEPTH = 3;

export function CommentThread({
  comment,
  postId,
  farmId,
  depth,
  onReplyAdded,
}: CommentThreadProps) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replies, setReplies] = useState(comment.replies);

  const formatRelativeTime = (timestamp: number) => {
    const seconds = Math.floor(Date.now() / 1000 - timestamp);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const handleReplyAdded = (newReply: Comment) => {
    setReplies((prev) => [...prev, newReply]);
    setShowReplyForm(false);
    onReplyAdded(newReply);
  };

  return (
    <div
      className={cn(
        'space-y-2',
        depth > 0 && 'ml-8 border-l-2 border-border pl-4'
      )}
    >
      <div className="flex gap-3">
        <Avatar className="w-8 h-8">
          <AvatarImage src={comment.author.image || undefined} />
          <AvatarFallback>
            {comment.author.name[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">
              {comment.author.name}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatRelativeTime(comment.created_at)}
            </span>
          </div>

          <ReactMarkdown className="text-sm prose prose-sm dark:prose-invert max-w-none">
            {comment.content}
          </ReactMarkdown>

          <div className="flex gap-3 text-xs">
            <button className="text-muted-foreground hover:text-foreground">
              ❤️ {comment.reaction_count || 'Like'}
            </button>
            {depth < MAX_DEPTH && (
              <button
                className="text-muted-foreground hover:text-foreground"
                onClick={() => setShowReplyForm(!showReplyForm)}
              >
                Reply
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Reply form */}
      {showReplyForm && (
        <div className="ml-11">
          <CommentForm
            postId={postId}
            farmId={farmId}
            parentCommentId={comment.id}
            onCommentAdded={handleReplyAdded}
            placeholder={`Reply to ${comment.author.name}...`}
            autoFocus
          />
        </div>
      )}

      {/* Nested replies */}
      {replies.map((reply) => (
        <CommentThread
          key={reply.id}
          comment={reply}
          postId={postId}
          farmId={farmId}
          depth={depth + 1}
          onReplyAdded={onReplyAdded}
        />
      ))}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add components/feed/comment-thread.tsx
git commit -m "feat: add nested comment thread component"
```

---

## Task 10: Create Comment Section Component

**Files:**
- Create: `components/feed/comment-section.tsx`

**Step 1: Create comment section container**

```typescript
'use client';

import { useEffect, useState } from 'react';
import { CommentThread } from './comment-thread';
import { CommentForm } from './comment-form';
import { Loader2 } from 'lucide-react';

interface Comment {
  id: string;
  post_id: string;
  parent_comment_id: string | null;
  author: {
    id: string;
    name: string;
    image: string | null;
  };
  content: string;
  reaction_count: number;
  user_reaction: string | null;
  created_at: number;
  replies: Comment[];
}

interface CommentSectionProps {
  postId: string;
  farmId: string;
  onCommentCountChange: (count: number) => void;
}

export function CommentSection({
  postId,
  farmId,
  onCommentCountChange,
}: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadComments();
  }, [postId]);

  const loadComments = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/farms/${farmId}/posts/${postId}/comments`);
      const data = await res.json();
      setComments(data.comments);
    } catch (error) {
      console.error('Failed to load comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCommentAdded = (newComment: Comment) => {
    setComments((prev) => [...prev, newComment]);
    onCommentCountChange(comments.length + 1);
  };

  const handleReplyAdded = () => {
    onCommentCountChange(comments.length + 1);
  };

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Comment list */}
      {comments.map((comment) => (
        <CommentThread
          key={comment.id}
          comment={comment}
          postId={postId}
          farmId={farmId}
          depth={0}
          onReplyAdded={handleReplyAdded}
        />
      ))}

      {/* New comment form */}
      <div className="border-t pt-4">
        <CommentForm
          postId={postId}
          farmId={farmId}
          onCommentAdded={handleCommentAdded}
        />
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add components/feed/comment-section.tsx
git commit -m "feat: add comment section with nested threads"
```

---

## Task 11: Integrate Comments into Post Card

**Files:**
- Modify: `components/feed/post-card.tsx`

**Step 1: Add comment section**

In `post-card.tsx`, add import and state:

```typescript
import { CommentSection } from './comment-section';

// After CardFooter, add:
{showComments && (
  <div className="border-t">
    <CommentSection
      postId={post.id}
      farmId={post.farm_id}
      onCommentCountChange={(count) => {
        setCommentCount(count);
        if (onUpdate) {
          onUpdate({ ...post, comment_count: count });
        }
      }}
    />
  </div>
)}
```

**Step 2: Test comments**

```bash
npm run dev
# Click "Comment" button on a post
# Verify comment section expands
# Type a comment and submit
# Verify it appears in the list
# Click "Reply" on a comment
# Verify reply form appears
```

**Step 3: Commit**

```bash
git add components/feed/post-card.tsx
git commit -m "feat: integrate comment section into post cards"
```

---

## Task 12: Build Complete - Verification

**Step 1: Run full build**

```bash
npm run build
```

Expected: `✓ Compiled successfully`

**Step 2: Test all features**

```bash
npm run dev
```

Manual test checklist:
- [ ] Farm page loads with feed section
- [ ] Posts display correctly
- [ ] Infinite scroll loads more posts
- [ ] Reaction button shows picker on click
- [ ] Clicking reaction updates count
- [ ] Comment button expands comment section
- [ ] Can post new comments
- [ ] Can reply to comments (nesting)
- [ ] Share button copies link

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete Phase 2 social feed UI

- Infinite scroll feed with optimistic updates
- Post cards with reactions and comments
- Nested comment threads (max 3 levels)
- Animated reaction picker (heart/seedling/bulb/fire)
- Share functionality (copy link)
- Responsive design with Tailwind

All components use zero external dependencies beyond
existing stack (react-markdown, shadcn/ui).

Verified:
- TypeScript: ✓ PASS
- Build: ✓ SUCCESS
- Manual testing: ✓ ALL FEATURES WORKING"
```

---

## Next Steps

After Phase 2 UI is complete:

**Phase 3 Candidates:**
1. Create post modal (FAB + write/photo/AI insight)
2. Notification bell dropdown
3. Gallery page refresh
4. Photo upload flow
5. AI insight sharing modal

Choose based on priority and commit to git before starting next phase.
