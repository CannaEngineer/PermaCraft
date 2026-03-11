'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Users, ShoppingBag, Footprints, ChevronRight } from 'lucide-react';

interface FarmStoryCardProps {
  story: {
    farm_id: string;
    farm_name: string;
    farm_description: string | null;
    acres: number | null;
    climate_zone: string | null;
    is_shop_enabled: number;
    owner_name: string;
    owner_image: string | null;
    section_count: number;
    story_title: string | null;
    story_excerpt: string | null;
    story_cover: string | null;
    follower_count: number;
    tour_count: number;
    product_count: number;
    farm_screenshot: string | null;
  };
}

export function FarmStoryCard({ story }: FarmStoryCardProps) {
  const coverImage = story.story_cover || story.farm_screenshot;

  return (
    <Link href={`/farm/${story.farm_id}/story`}>
      <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1 h-full">
        <div className="flex flex-col sm:flex-row h-full">
          {/* Cover */}
          <div className="relative sm:w-2/5 aspect-[16/10] sm:aspect-auto overflow-hidden bg-muted flex-shrink-0">
            {coverImage ? (
              <img
                src={coverImage}
                alt={story.farm_name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full min-h-[160px] bg-gradient-to-br from-amber-50 to-orange-100 dark:from-amber-900/30 dark:to-orange-800/30 flex items-center justify-center">
                <BookOpen className="w-12 h-12 text-amber-600/30 dark:text-amber-400/30" />
              </div>
            )}
          </div>

          {/* Content */}
          <CardContent className="p-4 sm:p-5 flex flex-col justify-between flex-1">
            <div className="space-y-2">
              {/* Farm name + badges */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-base leading-tight group-hover:text-primary transition-colors">
                    {story.farm_name}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    by {story.owner_name}
                    {story.acres && <> &middot; {story.acres} acres</>}
                    {story.climate_zone && <> &middot; {story.climate_zone}</>}
                  </p>
                </div>
              </div>

              {/* Story excerpt */}
              <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                {story.story_excerpt || story.farm_description || 'Discover this farm\'s permaculture journey...'}
              </p>
            </div>

            {/* Quick links */}
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              {story.tour_count > 0 && (
                <Badge variant="outline" className="text-xs gap-1 font-normal">
                  <Footprints className="w-3 h-3" />
                  {story.tour_count} {story.tour_count === 1 ? 'tour' : 'tours'}
                </Badge>
              )}
              {story.product_count > 0 && (
                <Badge variant="outline" className="text-xs gap-1 font-normal">
                  <ShoppingBag className="w-3 h-3" />
                  {story.product_count} products
                </Badge>
              )}
              {story.follower_count > 0 && (
                <Badge variant="outline" className="text-xs gap-1 font-normal">
                  <Users className="w-3 h-3" />
                  {story.follower_count} followers
                </Badge>
              )}
              <div className="flex-1" />
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0" />
            </div>
          </CardContent>
        </div>
      </Card>
    </Link>
  );
}
