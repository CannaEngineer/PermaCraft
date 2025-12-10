'use client';

import { Button } from '@/components/ui/button';
import { MessageSquareIcon, ShareIcon, BookmarkIcon } from 'lucide-react';
import { ReactionButton } from './reaction-button';
import { useState } from 'react';

interface PostActionsProps {
  postId: string;
  farmId: string;
  userReaction: string | null;
  reactionCount: number;
  commentCount: number;
  isBookmarked: boolean;
  onCommentClick: () => void;
  onReactionUpdate: (newReaction: string | null, newCount: number) => void;
  onBookmarkUpdate: (bookmarked: boolean) => void;
}

export function PostActions({
  postId,
  farmId,
  userReaction,
  reactionCount,
  commentCount,
  isBookmarked,
  onCommentClick,
  onReactionUpdate,
  onBookmarkUpdate,
}: PostActionsProps) {
  const [currentReaction, setCurrentReaction] = useState(userReaction);
  const [currentCount, setCurrentCount] = useState(reactionCount);
  const [currentBookmark, setCurrentBookmark] = useState(isBookmarked);
  const [loading, setLoading] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);

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

  const handleBookmark = async () => {
    if (bookmarkLoading) return;

    // Optimistic update
    const newBookmarkState = !currentBookmark;
    setCurrentBookmark(newBookmarkState);

    setBookmarkLoading(true);
    try {
      const res = await fetch(
        `/api/farms/${farmId}/posts/${postId}/bookmark`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const data = await res.json();

      // Sync with server response
      setCurrentBookmark(data.is_bookmarked);
      onBookmarkUpdate(data.is_bookmarked);
    } catch (error) {
      console.error('Failed to bookmark:', error);
      // Rollback on error
      setCurrentBookmark(isBookmarked);
    } finally {
      setBookmarkLoading(false);
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
        onClick={handleBookmark}
        disabled={bookmarkLoading}
        className="gap-2"
      >
        <BookmarkIcon
          className={`w-4 h-4 ${currentBookmark ? 'fill-current' : ''}`}
        />
        <span>{currentBookmark ? 'Saved' : 'Save'}</span>
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
