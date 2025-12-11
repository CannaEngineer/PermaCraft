'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
  ai_response_excerpt: string | null;
  ai_screenshot: string | null;
  is_bookmarked?: boolean;
}

interface PostCardProps {
  post: Post;
  currentUserId?: string;
  onUpdate?: (post: Post) => void;
  onDelete?: (postId: string) => void;
}

export function PostCard({ post, currentUserId, onUpdate, onDelete }: PostCardProps) {
  const router = useRouter();
  const [showComments, setShowComments] = useState(false);
  const [reactionCount, setReactionCount] = useState(post.reaction_count);
  const [userReaction, setUserReaction] = useState(post.user_reaction);
  const [commentCount, setCommentCount] = useState(post.comment_count);
  const [isBookmarked, setIsBookmarked] = useState(post.is_bookmarked || false);
  const isAuthor = currentUserId === post.author.id;

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

  const handleBookmarkUpdate = (bookmarked: boolean) => {
    setIsBookmarked(bookmarked);
    if (onUpdate) {
      onUpdate({ ...post, is_bookmarked: bookmarked });
    }
  };

  const handleHashtagClick = (hashtag: string) => {
    router.push(`/gallery?hashtag=${encodeURIComponent(hashtag)}`);
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

      {/* AI Screenshot for AI Insight posts */}
      {post.type === 'ai_insight' && post.ai_screenshot && (
        <div className="relative w-full aspect-video bg-muted">
          <img
            src={post.ai_screenshot}
            alt="AI analysis screenshot"
            className="w-full h-full object-cover"
            onError={(e) => {
              console.error('Failed to load AI screenshot:', post.ai_screenshot);
              (e.target as HTMLElement).style.display = 'none';
            }}
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

        {/* AI Response Excerpt for AI Insight posts */}
        {post.type === 'ai_insight' && post.ai_response_excerpt && (
          <div className="mt-4 p-4 rounded-lg border-2 border-primary/20 bg-primary/5">
            <div className="flex items-center gap-2 mb-2">
              <SparklesIcon className="w-4 h-4 text-primary" />
              <p className="text-sm font-semibold text-primary">AI Response</p>
            </div>
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {post.ai_response_excerpt}
              </ReactMarkdown>
            </div>
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

        {/* Hashtags */}
        {post.hashtags && post.hashtags.length > 0 && (
          <div className="flex gap-2 mt-3 flex-wrap">
            {post.hashtags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="text-xs cursor-pointer hover:bg-secondary/80 transition-colors"
                onClick={() => handleHashtagClick(tag)}
              >
                #{tag}
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
          isBookmarked={isBookmarked}
          isAuthor={isAuthor}
          onCommentClick={() => setShowComments(!showComments)}
          onReactionUpdate={handleReactionUpdate}
          onBookmarkUpdate={handleBookmarkUpdate}
          onDelete={() => onDelete?.(post.id)}
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
