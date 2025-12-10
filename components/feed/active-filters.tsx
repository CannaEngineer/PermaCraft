'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { XIcon } from 'lucide-react';

export function ActiveFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const climateZones = searchParams?.getAll('climate_zones') || [];
  const farmSize = searchParams?.get('farm_size');
  const soilTypes = searchParams?.getAll('soil_types') || [];
  const postType = searchParams?.get('type');
  const hashtag = searchParams?.get('hashtag');

  const hasFilters = climateZones.length > 0 || farmSize || soilTypes.length > 0 || postType || hashtag;

  const removeFilter = (key: string, value?: string) => {
    const params = new URLSearchParams(searchParams?.toString() || '');

    if (value) {
      // Remove specific value from multi-value param
      const values = params.getAll(key).filter(v => v !== value);
      params.delete(key);
      values.forEach(v => params.append(key, v));
    } else {
      // Remove entire param
      params.delete(key);
    }

    router.push(`/gallery?${params.toString()}`);
  };

  const clearAll = () => {
    router.push('/gallery');
  };

  if (!hasFilters) return null;

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <span className="text-sm text-muted-foreground">Active filters:</span>

      {climateZones.map(zone => (
        <Badge key={zone} variant="secondary" className="gap-1">
          Zone {zone}
          <XIcon
            className="w-3 h-3 cursor-pointer hover:text-destructive"
            onClick={() => removeFilter('climate_zones', zone)}
          />
        </Badge>
      ))}

      {farmSize && (
        <Badge variant="secondary" className="gap-1">
          {farmSize === 'small' && '< 1 acre'}
          {farmSize === 'medium' && '1-5 acres'}
          {farmSize === 'large' && '5-20 acres'}
          {farmSize === 'xlarge' && '20+ acres'}
          <XIcon
            className="w-3 h-3 cursor-pointer hover:text-destructive"
            onClick={() => removeFilter('farm_size')}
          />
        </Badge>
      )}

      {soilTypes.map(soil => (
        <Badge key={soil} variant="secondary" className="gap-1 capitalize">
          {soil}
          <XIcon
            className="w-3 h-3 cursor-pointer hover:text-destructive"
            onClick={() => removeFilter('soil_types', soil)}
          />
        </Badge>
      ))}

      {postType && (
        <Badge variant="secondary" className="gap-1 capitalize">
          {postType === 'ai_insight' ? 'AI Insights' : postType}
          <XIcon
            className="w-3 h-3 cursor-pointer hover:text-destructive"
            onClick={() => removeFilter('type')}
          />
        </Badge>
      )}

      {hashtag && (
        <Badge variant="secondary" className="gap-1">
          #{hashtag}
          <XIcon
            className="w-3 h-3 cursor-pointer hover:text-destructive"
            onClick={() => removeFilter('hashtag')}
          />
        </Badge>
      )}

      <button
        onClick={clearAll}
        className="text-xs text-muted-foreground hover:text-foreground underline"
      >
        Clear all
      </button>
    </div>
  );
}
