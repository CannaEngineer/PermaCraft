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
