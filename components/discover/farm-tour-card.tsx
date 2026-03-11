'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock, Footprints, Eye, ChevronRight } from 'lucide-react';

interface FarmTourCardProps {
  tour: {
    id: string;
    title: string;
    description: string | null;
    cover_image_url: string | null;
    estimated_duration_minutes: number | null;
    difficulty: string;
    visitor_count: number;
    stop_count: number;
    share_slug: string | null;
    farm_id: string;
    farm_name: string;
    farm_description: string | null;
    owner_name: string;
    owner_image: string | null;
    farm_screenshot: string | null;
    acres: number | null;
    climate_zone: string | null;
  };
}

const difficultyColors: Record<string, string> = {
  easy: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  moderate: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  challenging: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

export function FarmTourCard({ tour }: FarmTourCardProps) {
  const coverImage = tour.cover_image_url || tour.farm_screenshot;
  const tourUrl = tour.share_slug
    ? `/farm/${tour.farm_id}/tours/${tour.id}`
    : `/farm/${tour.farm_id}/tours/${tour.id}`;

  return (
    <Link href={tourUrl}>
      <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1 h-full">
        {/* Cover Image */}
        <div className="relative aspect-[16/10] overflow-hidden bg-muted">
          {coverImage ? (
            <img
              src={coverImage}
              alt={tour.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-green-100 to-emerald-200 dark:from-green-900/40 dark:to-emerald-800/40 flex items-center justify-center">
              <Footprints className="w-12 h-12 text-green-600/40 dark:text-green-400/40" />
            </div>
          )}
          {/* Difficulty badge */}
          <Badge className={`absolute top-3 left-3 ${difficultyColors[tour.difficulty] || difficultyColors.easy} border-0 text-xs font-medium`}>
            {tour.difficulty}
          </Badge>
          {/* Duration */}
          {tour.estimated_duration_minutes && (
            <Badge variant="secondary" className="absolute top-3 right-3 bg-black/60 text-white border-0 backdrop-blur-sm text-xs">
              <Clock className="w-3 h-3 mr-1" />
              {tour.estimated_duration_minutes} min
            </Badge>
          )}
        </div>

        <CardContent className="p-4 space-y-3">
          {/* Farm name */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span className="truncate font-medium">{tour.farm_name}</span>
            {tour.climate_zone && (
              <>
                <span className="text-muted-foreground/40">|</span>
                <span>{tour.climate_zone}</span>
              </>
            )}
          </div>

          {/* Tour title */}
          <h3 className="font-semibold text-base leading-tight line-clamp-2 group-hover:text-primary transition-colors">
            {tour.title}
          </h3>

          {/* Description */}
          {tour.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
              {tour.description}
            </p>
          )}

          {/* Stats row */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Footprints className="w-3.5 h-3.5" />
                {tour.stop_count} stops
              </span>
              <span className="flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" />
                {tour.visitor_count}
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
