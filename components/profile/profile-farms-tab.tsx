'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { MapPin, Sprout, Layers } from 'lucide-react';

interface Farm {
  id: string;
  name: string;
  description: string | null;
  acres: number | null;
  climate_zone: string | null;
  soil_type: string | null;
  post_count: number;
  zone_count: number;
  planting_count: number;
}

interface ProfileFarmsTabProps {
  farms: Farm[];
}

export function ProfileFarmsTab({ farms }: ProfileFarmsTabProps) {
  if (farms.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No public farms yet.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {farms.map((farm) => (
        <Link key={farm.id} href={`/farm/${farm.id}`}>
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="p-5">
              <h3 className="font-semibold text-lg mb-1">{farm.name}</h3>
              {farm.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                  {farm.description}
                </p>
              )}
              <div className="flex flex-wrap gap-2 mb-3">
                {farm.climate_zone && (
                  <Badge variant="secondary" className="text-xs">
                    {farm.climate_zone}
                  </Badge>
                )}
                {farm.acres && (
                  <Badge variant="outline" className="text-xs">
                    {farm.acres} acres
                  </Badge>
                )}
                {farm.soil_type && (
                  <Badge variant="outline" className="text-xs">
                    {farm.soil_type}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Layers className="w-3 h-3" />
                  {farm.zone_count} zones
                </span>
                <span className="flex items-center gap-1">
                  <Sprout className="w-3 h-3" />
                  {farm.planting_count} plantings
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {farm.post_count} posts
                </span>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
