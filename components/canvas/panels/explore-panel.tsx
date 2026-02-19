'use client';

import { useState, useEffect } from 'react';
import { PanelHeader } from './panel-header';
import { useUnifiedCanvas } from '@/contexts/unified-canvas-context';
import { Globe, MapPin, Heart, Eye, Loader2 } from 'lucide-react';

interface CommunityPost {
  id: string;
  farm_id: string;
  farm_name: string;
  author_name: string;
  content: string;
  post_type: string;
  reaction_count: number;
  view_count: number;
  created_at: number;
  center_lat?: number;
  center_lng?: number;
}

export function ExplorePanel() {
  const { setActiveFarmId, setActiveSection, mapRef } = useUnifiedCanvas();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch('/api/community/feed?limit=20')
      .then(r => r.json())
      .then(data => {
        setPosts(data.posts || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleFarmClick = (post: CommunityPost) => {
    // Fly to farm location if coords available
    if (post.center_lat && post.center_lng && mapRef.current) {
      mapRef.current.flyTo({
        center: [post.center_lng, post.center_lat],
        zoom: 16,
        duration: 1500,
      });
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
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <Globe className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No community posts yet</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Be the first to share your farm design!
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {posts.map((post) => (
              <button
                key={post.id}
                onClick={() => handleFarmClick(post)}
                className="w-full p-4 text-left hover:bg-accent/30 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <MapPin className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{post.farm_name || 'Farm'}</p>
                      <span className="text-[10px] text-muted-foreground">
                        by {post.author_name || 'Anonymous'}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {post.content}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Heart className="h-3 w-3" />
                        {post.reaction_count || 0}
                      </span>
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Eye className="h-3 w-3" />
                        {post.view_count || 0}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
