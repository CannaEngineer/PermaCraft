'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Footprints, BookOpen, ShoppingBag, Users, ChevronRight, Sprout } from 'lucide-react';

interface FarmDiscoveryCardProps {
  farm: {
    id: string;
    name: string;
    description: string | null;
    acres: number | null;
    climate_zone: string | null;
    is_shop_enabled: number;
    story_published: number | null;
    owner_name: string;
    owner_image: string | null;
    tour_count: number;
    story_section_count: number;
    product_count: number;
    follower_count: number;
    latest_screenshot: string | null;
    top_tour_title: string | null;
    total_tour_visitors: number | null;
  };
}

export function FarmDiscoveryCard({ farm }: FarmDiscoveryCardProps) {
  return (
    <Link href={`/farm/${farm.id}`}>
      <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1 h-full">
        {/* Cover Image */}
        <div className="relative aspect-[16/10] overflow-hidden bg-muted">
          {farm.latest_screenshot ? (
            <img
              src={farm.latest_screenshot}
              alt={farm.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-green-100 via-emerald-50 to-teal-100 dark:from-green-900/40 dark:via-emerald-800/30 dark:to-teal-900/40 flex items-center justify-center">
              <Sprout className="w-12 h-12 text-green-600/30 dark:text-green-400/30" />
            </div>
          )}
          {/* Location badge */}
          {farm.climate_zone && (
            <Badge variant="secondary" className="absolute top-3 left-3 bg-black/60 text-white border-0 backdrop-blur-sm text-xs gap-1">
              <MapPin className="w-3 h-3" />
              {farm.climate_zone}
            </Badge>
          )}
          {/* Acres badge */}
          {farm.acres && (
            <Badge variant="secondary" className="absolute top-3 right-3 bg-black/60 text-white border-0 backdrop-blur-sm text-xs">
              {farm.acres} acres
            </Badge>
          )}
        </div>

        <CardContent className="p-4 space-y-3">
          {/* Farm name + owner */}
          <div>
            <h3 className="font-semibold text-base leading-tight line-clamp-1 group-hover:text-primary transition-colors">
              {farm.name}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              by {farm.owner_name}
            </p>
          </div>

          {/* Description */}
          {farm.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
              {farm.description}
            </p>
          )}

          {/* Feature badges */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {farm.tour_count > 0 && (
              <Badge variant="outline" className="text-xs gap-1 font-normal">
                <Footprints className="w-3 h-3" />
                {farm.tour_count} {farm.tour_count === 1 ? 'tour' : 'tours'}
              </Badge>
            )}
            {farm.story_published === 1 && farm.story_section_count > 0 && (
              <Badge variant="outline" className="text-xs gap-1 font-normal">
                <BookOpen className="w-3 h-3" />
                Story
              </Badge>
            )}
            {farm.product_count > 0 && (
              <Badge variant="outline" className="text-xs gap-1 font-normal">
                <ShoppingBag className="w-3 h-3" />
                Shop
              </Badge>
            )}
          </div>

          {/* Stats row */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {farm.follower_count > 0 && (
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  {farm.follower_count}
                </span>
              )}
              {farm.total_tour_visitors != null && farm.total_tour_visitors > 0 && (
                <span className="flex items-center gap-1">
                  <Footprints className="w-3.5 h-3.5" />
                  {farm.total_tour_visitors} visitors
                </span>
              )}
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
