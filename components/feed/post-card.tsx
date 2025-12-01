'use client';

import { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { SparklesIcon } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { PostActions } from './post-actions';
import { CommentSection } from './comment-section';

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
  const [showComments, setShowComments] = useState(false);
  const [reactionCount, setReactionCount] = useState(post.reaction_count);
  const [userReaction, setUserReaction] = useState(post.user_reaction);
  const [commentCount, setCommentCount] = useState(post.comment_count);

  const formatRelativeTime = (timestamp: number) => {
    const seconds = Math.floor(Date.now() / 1000 - timestamp);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  const handleReactionUpdate = (newReaction: string | null, newCount: number) => {
    setUserReaction(newReaction);
    setReactionCount(newCount);
    if (onUpdate) {
      onUpdate({ ...post, user_reaction: newReaction, reaction_count: newCount });
    }
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
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {post.content}
            </ReactMarkdown>
          </div>
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

      {/* Actions */}
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

      {/* Comments */}
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
    </Card>
  );
}
