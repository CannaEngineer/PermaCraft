'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CommentEditor } from './comment-editor';
import { CommentItem } from './comment-item';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare } from 'lucide-react';

interface CommentThreadProps {
  farmId: string;
  currentUserId: string;
  featureId?: string | null;
  featureType?: 'zone' | 'planting' | 'line' | 'general';
}

export function CommentThread({
  farmId,
  currentUserId,
  featureId = null,
  featureType = 'general'
}: CommentThreadProps) {
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadComments();
  }, [farmId, featureId]);

  async function loadComments() {
    try {
      const params = new URLSearchParams();
      if (featureId) {
        params.append('feature_id', featureId);
      }

      const response = await fetch(`/api/farms/${farmId}/comments?${params}`);
      const data = await response.json();

      // Build comment tree
      const commentTree = buildCommentTree(data.comments);
      setComments(commentTree);
    } catch (error) {
      console.error('Failed to load comments:', error);
    } finally {
      setLoading(false);
    }
  }

  function buildCommentTree(flatComments: any[]): any[] {
    const map = new Map();
    const roots: any[] = [];

    flatComments.forEach(comment => {
      map.set(comment.id, { ...comment, replies: [] });
    });

    flatComments.forEach(comment => {
      if (comment.parent_comment_id) {
        const parent = map.get(comment.parent_comment_id);
        if (parent) {
          parent.replies.push(map.get(comment.id));
        }
      } else {
        roots.push(map.get(comment.id));
      }
    });

    return roots;
  }

  async function handleAddComment(html: string) {
    try {
      const response = await fetch(`/api/farms/${farmId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: html,
          feature_id: featureId,
          feature_type: featureType
        })
      });

      if (!response.ok) {
        throw new Error('Failed to add comment');
      }

      toast({ title: 'Comment added' });
      loadComments();
    } catch (error) {
      console.error('Failed to add comment:', error);
      toast({ title: 'Failed to add comment', variant: 'destructive' });
    }
  }

  async function handleReply(parentId: string, html: string) {
    try {
      const response = await fetch(`/api/farms/${farmId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: html,
          feature_id: featureId,
          feature_type: featureType,
          parent_comment_id: parentId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to add reply');
      }

      toast({ title: 'Reply added' });
      loadComments();
    } catch (error) {
      console.error('Failed to add reply:', error);
      toast({ title: 'Failed to add reply', variant: 'destructive' });
    }
  }

  async function handleResolve(commentId: string) {
    try {
      await fetch(`/api/farms/${farmId}/comments/${commentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolved: true })
      });

      toast({ title: 'Comment resolved' });
      loadComments();
    } catch (error) {
      console.error('Failed to resolve comment:', error);
      toast({ title: 'Failed to resolve comment', variant: 'destructive' });
    }
  }

  async function handleDelete(commentId: string) {
    if (!confirm('Delete this comment?')) return;

    try {
      await fetch(`/api/farms/${farmId}/comments/${commentId}`, {
        method: 'DELETE'
      });

      toast({ title: 'Comment deleted' });
      loadComments();
    } catch (error) {
      console.error('Failed to delete comment:', error);
      toast({ title: 'Failed to delete comment', variant: 'destructive' });
    }
  }

  function renderCommentTree(comment: any, depth: number = 0) {
    return (
      <div key={comment.id} className={depth > 0 ? 'ml-6 mt-2' : ''}>
        <CommentItem
          comment={comment}
          currentUserId={currentUserId}
          onReply={handleReply}
          onResolve={handleResolve}
          onDelete={handleDelete}
        />
        {comment.replies?.map((reply: any) => renderCommentTree(reply, depth + 1))}
      </div>
    );
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading comments...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Comments
        </CardTitle>
        <CardDescription>
          {featureId ? 'Feature-specific discussion' : 'General farm discussion'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <CommentEditor onSubmit={handleAddComment} />

        <div className="space-y-4">
          {comments.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8">
              No comments yet. Start the conversation!
            </div>
          ) : (
            comments.map(comment => renderCommentTree(comment))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
