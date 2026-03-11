'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Footprints, ShoppingBag, Users } from 'lucide-react';

interface FeaturedFarmCardProps {
  farm: {
    id: string;
    name: string;
    description: string | null;
    acres: number | null;
    climate_zone: string | null;
    is_shop_enabled: number;
    owner_name: string;
    owner_image: string | null;
    tour_count: number;
    product_count: number;
    follower_count: number;
    latest_screenshot: string | null;
  };
}

export function FeaturedFarmCard({ farm }: FeaturedFarmCardProps) {
  return (
    <Link href={`/farm/${farm.id}/story`}>
      <Card className="group relative overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 aspect-[4/5] flex flex-col justify-end">
        {/* Background */}
        <div className="absolute inset-0">
          {farm.latest_screenshot ? (
            <img
              src={farm.latest_screenshot}
              alt={farm.name}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-green-200 via-emerald-100 to-teal-200 dark:from-green-900/60 dark:via-emerald-800/40 dark:to-teal-900/60" />
          )}
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        </div>

        {/* Content */}
        <div className="relative p-4 text-white space-y-2">
          <div className="flex items-center gap-1.5 text-white/70 text-xs">
            <MapPin className="w-3 h-3" />
            <span>{farm.climate_zone || 'Permaculture Farm'}</span>
            {farm.acres && <span>&middot; {farm.acres} acres</span>}
          </div>

          <h3 className="font-bold text-lg leading-tight">{farm.name}</h3>

          <p className="text-white/70 text-xs">by {farm.owner_name}</p>

          <div className="flex items-center gap-2 pt-1">
            {farm.tour_count > 0 && (
              <Badge variant="secondary" className="bg-white/20 text-white border-0 text-[10px] gap-1 backdrop-blur-sm">
                <Footprints className="w-3 h-3" />
                {farm.tour_count}
              </Badge>
            )}
            {farm.product_count > 0 && (
              <Badge variant="secondary" className="bg-white/20 text-white border-0 text-[10px] gap-1 backdrop-blur-sm">
                <ShoppingBag className="w-3 h-3" />
                {farm.product_count}
              </Badge>
            )}
            {farm.follower_count > 0 && (
              <Badge variant="secondary" className="bg-white/20 text-white border-0 text-[10px] gap-1 backdrop-blur-sm">
                <Users className="w-3 h-3" />
                {farm.follower_count}
              </Badge>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
