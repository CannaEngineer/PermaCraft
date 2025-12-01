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

          <div className="text-sm prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown>{comment.content}</ReactMarkdown>
          </div>

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
