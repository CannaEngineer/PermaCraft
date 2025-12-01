'use client';

import { FarmMapReadonly } from '@/components/map/farm-map-readonly';
import { FarmFeedClient } from '@/components/feed/farm-feed-client';
import type { Farm } from '@/lib/db/schema';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface FarmPublicViewProps {
  farm: Farm;
  farmOwner: {
    name: string;
    image: string | null;
  };
  initialFeedData: {
    posts: any[];
    next_cursor: string | null;
    has_more: boolean;
  };
}

export function FarmPublicView({
  farm,
  farmOwner,
  initialFeedData,
}: FarmPublicViewProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Farm Header */}
      <div className="bg-card border-b border-border">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-start gap-4">
            {/* Farm owner avatar */}
            <Avatar className="h-16 w-16">
              <AvatarImage src={farmOwner.image || undefined} />
              <AvatarFallback className="text-lg">
                {farmOwner.name[0]?.toUpperCase()}
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
          <FarmFeedClient farmId={farm.id} initialData={initialFeedData} />
        </div>
      </div>
    </div>
  );
}
