'use client';

import { Button } from '@/components/ui/button';
import { MessageSquareIcon, ShareIcon, BookmarkIcon, Trash2Icon, Copy, Check } from 'lucide-react';
import { ReactionButton } from './reaction-button';
import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface PostActionsProps {
  postId: string;
  farmId: string;
  userReaction: string | null;
  reactionCount: number;
  commentCount: number;
  isBookmarked: boolean;
  isAuthor?: boolean;
  onCommentClick: () => void;
  onReactionUpdate: (newReaction: string | null, newCount: number) => void;
  onBookmarkUpdate: (bookmarked: boolean) => void;
  onDelete?: () => void;
}

export function PostActions({
  postId,
  farmId,
  userReaction,
  reactionCount,
  commentCount,
  isBookmarked,
  isAuthor = false,
  onCommentClick,
  onReactionUpdate,
  onBookmarkUpdate,
  onDelete,
}: PostActionsProps) {
  const [currentReaction, setCurrentReaction] = useState(userReaction);
  const [currentCount, setCurrentCount] = useState(reactionCount);
  const [currentBookmark, setCurrentBookmark] = useState(isBookmarked);
  const [loading, setLoading] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

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

  const [copied, setCopied] = useState(false);

  const trackShare = async (platform: string) => {
    try {
      await fetch(`/api/posts/${postId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform }),
      });
    } catch {
      // Fire-and-forget: ignore errors
    }
  };

  const getShareUrl = () =>
    `${typeof window !== 'undefined' ? window.location.origin : ''}/farm/${farmId}#post-${postId}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(getShareUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
    await trackShare('copy_link');
  };

  const handleSocialShare = async (platform: string) => {
    const url = encodeURIComponent(getShareUrl());
    const shareLinks: Record<string, string> = {
      twitter: `https://twitter.com/intent/tweet?url=${url}&text=Check+out+this+farm+design!`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      pinterest: `https://pinterest.com/pin/create/button/?url=${url}`,
      reddit: `https://reddit.com/submit?url=${url}&title=Check+out+this+permaculture+design`,
    };
    if (shareLinks[platform]) {
      window.open(shareLinks[platform], '_blank', 'noopener,noreferrer,width=600,height=400');
    }
    await trackShare(platform);
  };

  const handleDelete = async () => {
    if (deleteLoading) return;

    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/farms/${farmId}/posts/${postId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to delete post');
      }

      // Close dialog
      setShowDeleteDialog(false);

      // Notify parent component
      if (onDelete) {
        onDelete();
      }
    } catch (error) {
      console.error('Failed to delete post:', error);
      // TODO: Show error toast
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
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

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2">
            <ShareIcon className="w-4 h-4" />
            <span>Share</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onClick={() => handleSocialShare('twitter')}>
            𝕏 Twitter / X
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleSocialShare('facebook')}>
            Facebook
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleSocialShare('pinterest')}>
            Pinterest
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleSocialShare('reddit')}>
            Reddit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleCopyLink} className="gap-2">
            {copied ? (
              <><Check className="w-3.5 h-3.5 text-green-500" /> Copied!</>
            ) : (
              <><Copy className="w-3.5 h-3.5" /> Copy link</>
            )}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {isAuthor && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowDeleteDialog(true)}
          disabled={deleteLoading}
          className="gap-2 text-destructive hover:text-destructive"
        >
          <Trash2Icon className="w-4 h-4" />
          <span>Delete</span>
        </Button>
      )}
    </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Post</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this post? This action cannot be undone.
              All comments and reactions will also be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteLoading}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteLoading ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
