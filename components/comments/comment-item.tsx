'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CommentEditor } from './comment-editor';
import { MessageSquare, Check, Trash2, Reply } from 'lucide-react';

interface CommentItemProps {
  comment: any;
  currentUserId: string;
  onReply: (parentId: string, content: string) => void;
  onResolve: (commentId: string) => void;
  onDelete: (commentId: string) => void;
}

export function CommentItem({
  comment,
  currentUserId,
  onReply,
  onResolve,
  onDelete
}: CommentItemProps) {
  const [showReplyEditor, setShowReplyEditor] = useState(false);

  const isOwner = comment.user_id === currentUserId;
  const createdAt = new Date(comment.created_at * 1000);

  function handleReply(html: string) {
    onReply(comment.id, html);
    setShowReplyEditor(false);
  }

  return (
    <div className="border-l-2 border-muted pl-4 py-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm">{comment.user_name || comment.user_email}</span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(createdAt, { addSuffix: true })}
            </span>
            {comment.resolved === 1 && (
              <Badge variant="secondary" className="text-xs">
                <Check className="h-3 w-3 mr-1" />
                Resolved
              </Badge>
            )}
          </div>

          <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: comment.content }}
          />
        </div>

        <div className="flex gap-1">
          {!comment.resolved && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onResolve(comment.id)}
              title="Mark as resolved"
            >
              <Check className="h-4 w-4" />
            </Button>
          )}

          {isOwner && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(comment.id)}
              title="Delete comment"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </div>
      </div>

      <div className="mt-2">
        {!showReplyEditor ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowReplyEditor(true)}
          >
            <Reply className="h-4 w-4 mr-1" />
            Reply
          </Button>
        ) : (
          <CommentEditor
            placeholder="Write a reply..."
            onSubmit={handleReply}
            onCancel={() => setShowReplyEditor(false)}
          />
        )}
      </div>
    </div>
  );
}
