'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { SparklesIcon } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { PostActions } from './post-actions';
import { CommentSection } from './comment-section';
import { ExpandableText } from '@/components/shared/expandable-text';
import { FollowFarmButton } from '@/components/community/follow-farm-button';

interface Author {
  id: string;
  name: string;
  image: string | null;
}

interface Post {
  id: string;
  farm_id: string;
  farm_name?: string;
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

  // Fire view tracking once when post becomes visible
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/posts/${post.id}/view`, {
      method: 'POST',
      signal: controller.signal,
    }).catch(() => {});
    return () => controller.abort();
  }, [post.id]);

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
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      {/* Header */}
      <CardHeader className="flex-row items-center gap-3 pb-3">
        <button
          onClick={() => router.push(`/profile/${post.author.id}`)}
          className="hover:opacity-80 transition-opacity"
        >
          <Avatar className="w-10 h-10 ring-2 ring-background">
            <AvatarImage src={post.author.image || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {post.author.name[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </button>
        <div className="flex-1 min-w-0">
          <button
            onClick={() => router.push(`/profile/${post.author.id}`)}
            className="font-semibold hover:underline text-left"
          >
            {post.author.name}
          </button>
          <p className="text-xs text-muted-foreground">
            {formatRelativeTime(post.created_at)}
          </p>
        </div>
        {post.type === 'ai_insight' && (
          <Badge variant="secondary" className="gap-1 bg-purple-500/10 text-purple-600 border-purple-200">
            <SparklesIcon className="w-3 h-3" />
            AI Insight
          </Badge>
        )}
        {post.type === 'photo' && (
          <Badge variant="secondary" className="gap-1 bg-green-500/10 text-green-600 border-green-200">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Photo
          </Badge>
        )}
      </CardHeader>

      {/* Media */}
      {post.media_urls && post.media_urls.length > 0 && (
        <div className="relative w-full aspect-video bg-muted group cursor-pointer">
          <img
            src={post.media_urls[0]}
            alt="Post media"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onClick={() => router.push(`/farm/${post.farm_id}`)}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      )}

      {/* AI Screenshot for AI Insight posts */}
      {post.type === 'ai_insight' && post.ai_screenshot && (
        <div className="relative w-full aspect-video bg-muted group cursor-pointer">
          <img
            src={post.ai_screenshot}
            alt="AI analysis screenshot"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onClick={() => router.push(`/farm/${post.farm_id}`)}
            onError={(e) => {
              console.error('Failed to load AI screenshot:', post.ai_screenshot);
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      )}

      {/* Content */}
      <CardContent className="pt-4 space-y-3">
        {/* Farm Context Badge + Follow */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => router.push(`/farm/${post.farm_id}`)}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/5 hover:bg-primary/10 border border-primary/20 transition-colors text-sm group"
          >
            <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="font-medium text-primary group-hover:underline">
              {post.farm_name || 'View Farm'}
            </span>
          </button>
          {!isAuthor && (
            <FollowFarmButton farmId={post.farm_id} size="sm" />
          )}
        </div>

        {post.content && (
          <ExpandableText
            text={post.content}
            maxLength={500}
            expandLabel="Dive Deeper"
            className="prose prose-sm max-w-none dark:prose-invert"
          />
        )}

        {/* AI Response Excerpt for AI Insight posts */}
        {post.type === 'ai_insight' && post.ai_response_excerpt && (
          <div className="mt-4 p-4 rounded-lg border-2 border-primary/20 bg-primary/5">
            <div className="flex items-center gap-2 mb-2">
              <SparklesIcon className="w-4 h-4 text-primary" />
              <p className="text-sm font-semibold text-primary">AI Response</p>
            </div>
            <ExpandableText
              text={post.ai_response_excerpt}
              maxLength={800}
              expandLabel="Read Full Analysis"
              className="prose prose-sm max-w-none dark:prose-invert"
            />
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
        <div className="flex gap-4 mt-4 text-sm">
          <div className="flex items-center gap-1.5">
            <span className="text-red-500">❤️</span>
            <span className="font-medium text-foreground">{reactionCount}</span>
            <span className="text-muted-foreground">reactions</span>
          </div>
          <div className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="font-medium text-foreground">{commentCount}</span>
            <span className="text-muted-foreground">comments</span>
          </div>
          <div className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span className="font-medium text-foreground">{post.view_count}</span>
            <span className="text-muted-foreground">views</span>
          </div>
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
