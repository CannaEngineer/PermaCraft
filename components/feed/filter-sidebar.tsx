'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Button } from '@/components/ui/button';
import { FilterIcon, ChevronDownIcon, ChevronUpIcon } from 'lucide-react';

interface FilterOptions {
  climateZones: string[];
  soilTypes: string[];
}

interface FilterSidebarProps {
  availableFilters: FilterOptions;
}

export function FilterSidebar({ availableFilters }: FilterSidebarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [climateExpanded, setClimateExpanded] = useState(true);
  const [sizeExpanded, setSizeExpanded] = useState(true);
  const [soilExpanded, setSoilExpanded] = useState(false);

  const selectedClimateZones = searchParams?.getAll('climate_zones') || [];
  const selectedFarmSize = searchParams?.get('farm_size') || '';
  const selectedSoilTypes = searchParams?.getAll('soil_types') || [];

  const handleClimateZoneToggle = (zone: string) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    const current = params.getAll('climate_zones');

    if (current.includes(zone)) {
      // Remove
      const filtered = current.filter(z => z !== zone);
      params.delete('climate_zones');
      filtered.forEach(z => params.append('climate_zones', z));
    } else {
      // Add
      params.append('climate_zones', zone);
    }

    router.push(`/gallery?${params.toString()}`);
  };

  const handleFarmSizeChange = (size: string) => {
    const params = new URLSearchParams(searchParams?.toString() || '');

    if (size === selectedFarmSize) {
      params.delete('farm_size');
    } else {
      params.set('farm_size', size);
    }

    router.push(`/gallery?${params.toString()}`);
  };

  const handleSoilTypeToggle = (soil: string) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    const current = params.getAll('soil_types');

    if (current.includes(soil)) {
      const filtered = current.filter(s => s !== soil);
      params.delete('soil_types');
      filtered.forEach(s => params.append('soil_types', s));
    } else {
      params.append('soil_types', soil);
    }

    router.push(`/gallery?${params.toString()}`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <FilterIcon className="w-4 h-4" />
          Filters
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Climate Zones */}
        <div>
          <button
            onClick={() => setClimateExpanded(!climateExpanded)}
            className="flex items-center justify-between w-full mb-2"
          >
            <span className="text-sm font-medium">Climate Zone</span>
            {climateExpanded ? (
              <ChevronUpIcon className="w-4 h-4" />
            ) : (
              <ChevronDownIcon className="w-4 h-4" />
            )}
          </button>

          {climateExpanded && (
            <div className="space-y-2 pl-2">
              {availableFilters.climateZones.map(zone => (
                <div key={zone} className="flex items-center space-x-2">
                  <Checkbox
                    id={`climate-${zone}`}
                    checked={selectedClimateZones.includes(zone)}
                    onCheckedChange={() => handleClimateZoneToggle(zone)}
                  />
                  <Label
                    htmlFor={`climate-${zone}`}
                    className="text-sm cursor-pointer"
                  >
                    Zone {zone}
                  </Label>
                </div>
              ))}
              {availableFilters.climateZones.length === 0 && (
                <p className="text-xs text-muted-foreground">No zones available</p>
              )}
            </div>
          )}
        </div>

        {/* Farm Size */}
        <div>
          <button
            onClick={() => setSizeExpanded(!sizeExpanded)}
            className="flex items-center justify-between w-full mb-2"
          >
            <span className="text-sm font-medium">Farm Size</span>
            {sizeExpanded ? (
              <ChevronUpIcon className="w-4 h-4" />
            ) : (
              <ChevronDownIcon className="w-4 h-4" />
            )}
          </button>

          {sizeExpanded && (
            <RadioGroup value={selectedFarmSize} className="pl-2 space-y-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem
                  value="small"
                  id="size-small"
                  onClick={() => handleFarmSizeChange('small')}
                />
                <Label htmlFor="size-small" className="text-sm cursor-pointer">
                  Small (&lt; 1 acre)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem
                  value="medium"
                  id="size-medium"
                  onClick={() => handleFarmSizeChange('medium')}
                />
                <Label htmlFor="size-medium" className="text-sm cursor-pointer">
                  Medium (1-5 acres)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem
                  value="large"
                  id="size-large"
                  onClick={() => handleFarmSizeChange('large')}
                />
                <Label htmlFor="size-large" className="text-sm cursor-pointer">
                  Large (5-20 acres)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem
                  value="xlarge"
                  id="size-xlarge"
                  onClick={() => handleFarmSizeChange('xlarge')}
                />
                <Label htmlFor="size-xlarge" className="text-sm cursor-pointer">
                  Very Large (20+ acres)
                </Label>
              </div>
            </RadioGroup>
          )}
        </div>

        {/* Soil Types */}
        {availableFilters.soilTypes.length > 0 && (
          <div>
            <button
              onClick={() => setSoilExpanded(!soilExpanded)}
              className="flex items-center justify-between w-full mb-2"
            >
              <span className="text-sm font-medium">Soil Type</span>
              {soilExpanded ? (
                <ChevronUpIcon className="w-4 h-4" />
              ) : (
                <ChevronDownIcon className="w-4 h-4" />
              )}
            </button>

            {soilExpanded && (
              <div className="space-y-2 pl-2">
                {availableFilters.soilTypes.map(soil => (
                  <div key={soil} className="flex items-center space-x-2">
                    <Checkbox
                      id={`soil-${soil}`}
                      checked={selectedSoilTypes.includes(soil)}
                      onCheckedChange={() => handleSoilTypeToggle(soil)}
                    />
                    <Label
                      htmlFor={`soil-${soil}`}
                      className="text-sm cursor-pointer capitalize"
                    >
                      {soil}
                    </Label>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
