'use client';

import { FarmMapReadonly } from '@/components/map/farm-map-readonly';
import { FarmFeedClient } from '@/components/feed/farm-feed-client';
import type { Farm } from '@/lib/db/schema';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface Post {
  id: string;
  farm_id: string;
  type: 'text' | 'photo' | 'ai_insight';
  content: string | null;
  media_urls: string[] | null;
  ai_response_excerpt: string | null;
  ai_screenshot: string | null;
  tagged_zones: string[] | null;
  hashtags: string[] | null;
  author: {
    id: string;
    name: string;
    image: string | null;
  };
  reaction_count: number;
  comment_count: number;
  view_count: number;
  created_at: number;
  user_reaction: string | null;
}

interface FarmPublicViewProps {
  farm: Farm;
  farmOwner: {
    name: string;
    image: string | null;
  };
  latestScreenshot: string | null;
  initialFeedData: {
    posts: Post[];
    next_cursor: string | null;
    has_more: boolean;
  };
  currentUserId?: string;
}

export function FarmPublicView({
  farm,
  farmOwner,
  latestScreenshot,
  initialFeedData,
  currentUserId,
}: FarmPublicViewProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero/Cover Image */}
      {latestScreenshot && (
        <div className="relative w-full h-64 md:h-96 bg-muted">
          <img
            src={latestScreenshot}
            alt={`${farm.name} overview`}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/50" />
        </div>
      )}

      {/* Farm Header */}
      <div className="bg-card border-b border-border">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-start gap-4">
            {/* Farm owner avatar */}
            <Avatar className="h-16 w-16">
              <AvatarImage src={farmOwner.image || undefined} />
              <AvatarFallback className="text-lg">
                {farmOwner.name[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>

            {/* Farm info */}
            <div className="flex-1">
              <h1 className="text-3xl font-serif font-bold">{farm.name}</h1>
              <p className="text-muted-foreground mt-1">
                by {farmOwner.name}
              </p>
              {farm.description && (
                <p className="mt-2 text-sm">{farm.description}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Map Section */}
      <div className="container mx-auto px-4 py-8">
        <FarmMapReadonly farm={farm} />
      </div>

      {/* Feed Section */}
      <div className="container mx-auto px-4 pb-8">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">Farm Updates</h2>
          <FarmFeedClient
            farmId={farm.id}
            initialData={initialFeedData}
            currentUserId={currentUserId}
          />
        </div>
      </div>
    </div>
  );
}
