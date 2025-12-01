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
