'use client';

import { useState, useEffect } from 'react';
import { PanelHeader } from './panel-header';
import { useUnifiedCanvas } from '@/contexts/unified-canvas-context';
import { Globe, MapPin, Heart, MessageCircle, Eye, Loader2, Image, Sparkles, PenLine, ArrowRight, AlertCircle } from 'lucide-react';

interface PostAuthor {
  id: string;
  name: string | null;
  image: string | null;
}

interface CommunityPost {
  id: string;
  farm_id: string;
  farm_name: string;
  farm_description: string | null;
  location_description: string | null;
  climate_zone: string | null;
  type: 'text' | 'photo' | 'ai_insight';
  content: string | null;
  media_urls: string[] | null;
  ai_response_excerpt: string | null;
  ai_screenshot: string | null;
  tagged_zones: string[] | null;
  hashtags: string[] | null;
  author: PostAuthor;
  reaction_count: number;
  comment_count: number;
  view_count: number;
  created_at: number;
  user_reaction: string | null;
  is_bookmarked: boolean;
}

const postTypeConfig = {
  text: { icon: PenLine, color: 'text-blue-500', bg: 'bg-blue-500/10', label: 'Text' },
  photo: { icon: Image, color: 'text-green-500', bg: 'bg-green-500/10', label: 'Photo' },
  ai_insight: { icon: Sparkles, color: 'text-purple-500', bg: 'bg-purple-500/10', label: 'AI Insight' },
};

function timeAgo(timestamp: number): string {
  const seconds = Math.floor(Date.now() / 1000 - timestamp);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function ExplorePanel() {
  const { mapRef } = useUnifiedCanvas();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchPosts = (pageNum: number, append = false) => {
    const loader = append ? setLoadingMore : setLoading;
    loader(true);
    if (!append) setError(false);
    fetch(`/api/community/feed?limit=15&page=${pageNum}`)
      .then(r => { if (!r.ok) throw new Error('Failed to fetch'); return r.json(); })
      .then(data => {
        const newPosts = data.posts || [];
        setPosts(prev => append ? [...prev, ...newPosts] : newPosts);
        setHasMore(data.hasMore ?? false);
        setPage(pageNum);
      })
      .catch(() => { if (!append) setError(true); })
      .finally(() => loader(false));
  };

  useEffect(() => {
    fetchPosts(1);
  }, []);

  const handleFarmClick = (post: CommunityPost) => {
    // Try to fly to farm if we have location info
    if (mapRef.current && post.farm_id) {
      // We could fetch farm coords, but for now just highlight in feed
    }
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchPosts(page + 1, true);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <PanelHeader title="Explore" subtitle="Community farms and designs" />

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-6">
            <AlertCircle className="h-10 w-10 text-destructive/40 mb-3" />
            <p className="text-sm font-medium mb-1">Failed to load posts</p>
            <button
              onClick={() => fetchPosts(1)}
              className="text-xs text-primary hover:underline font-medium"
            >
              Try again
            </button>
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-6">
            <div className="w-16 h-16 rounded-2xl bg-accent/50 flex items-center justify-center mb-4">
              <Globe className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <p className="text-sm font-medium mb-1">No community posts yet</p>
            <p className="text-xs text-muted-foreground mb-3">
              Be the first to share your farm design!
            </p>
            <a
              href="/farm/new"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <PenLine className="h-3.5 w-3.5" />
              Create a Post
            </a>
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {posts.map((post) => {
              const typeConf = postTypeConfig[post.type] || postTypeConfig.text;
              const TypeIcon = typeConf.icon;

              return (
                <button
                  key={post.id}
                  onClick={() => handleFarmClick(post)}
                  className="w-full p-4 text-left hover:bg-accent/30 transition-colors group"
                >
                  {/* Author row */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      {post.author?.image ? (
                        <img src={post.author.image} alt="" className="w-6 h-6 rounded-full object-cover" />
                      ) : (
                        <span className="text-xs font-bold text-primary">
                          {(post.author?.name || 'A')[0].toUpperCase()}
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-medium truncate">
                      {post.author?.name || 'Anonymous'}
                    </span>
                    <span className="text-xs text-muted-foreground ml-auto flex-shrink-0">
                      {timeAgo(post.created_at)}
                    </span>
                  </div>

                  {/* Farm name + type badge */}
                  <div className="flex items-center gap-2 mb-1.5">
                    <MapPin className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                    <p className="text-sm font-medium truncate">{post.farm_name || 'Farm'}</p>
                    <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${typeConf.bg} ${typeConf.color} flex-shrink-0`}>
                      <TypeIcon className="h-2.5 w-2.5" />
                      {typeConf.label}
                    </span>
                  </div>

                  {/* Content preview */}
                  {post.content && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2 pl-6">
                      {post.content}
                    </p>
                  )}

                  {/* AI excerpt if insight */}
                  {post.type === 'ai_insight' && post.ai_response_excerpt && (
                    <p className="text-xs text-purple-600 dark:text-purple-400 line-clamp-2 mb-2 italic">
                      {post.ai_response_excerpt}
                    </p>
                  )}

                  {/* Media thumbnail */}
                  {post.media_urls && post.media_urls.length > 0 && (
                    <div className="mb-2 rounded-lg overflow-hidden h-24">
                      <img
                        src={post.media_urls[0]}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  )}

                  {/* Hashtags */}
                  {post.hashtags && post.hashtags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {post.hashtags.slice(0, 3).map((tag) => (
                        <span key={tag} className="text-xs text-primary/70">#{tag}</span>
                      ))}
                    </div>
                  )}

                  {/* Engagement row */}
                  <div className="flex items-center gap-4 pt-1">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Heart className={`h-3 w-3 ${post.user_reaction ? 'fill-red-500 text-red-500' : ''}`} />
                      {post.reaction_count || 0}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MessageCircle className="h-3 w-3" />
                      {post.comment_count || 0}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Eye className="h-3 w-3" />
                      {post.view_count || 0}
                    </span>
                  </div>
                </button>
              );
            })}

            {/* Load more */}
            {hasMore && (
              <div className="p-4">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-accent/50 hover:bg-accent/70 transition-colors text-xs font-medium"
                >
                  {loadingMore ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <>
                      Load More
                      <ArrowRight className="h-3 w-3" />
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Browse full community link */}
        <div className="p-4 border-t border-border/30">
          <a
            href="/gallery"
            className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary/10 hover:bg-primary/15 transition-colors text-xs font-medium text-primary"
          >
            Browse Full Community
            <ArrowRight className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
