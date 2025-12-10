'use client';

import { useState } from 'react';
import { GlobalFeedClient } from './global-feed-client';
import { LayoutToggle } from './layout-toggle';

interface GalleryLayoutWrapperProps {
  initialData: any;
  filterType?: string;
  filterHashtag?: string;
  filterClimateZones?: string[];
  filterFarmSize?: string;
  filterSoilTypes?: string[];
  apiEndpoint?: string;
}

export function GalleryLayoutWrapper({
  initialData,
  filterType,
  filterHashtag,
  filterClimateZones,
  filterFarmSize,
  filterSoilTypes,
  apiEndpoint
}: GalleryLayoutWrapperProps) {
  const [layout, setLayout] = useState<'list' | 'grid'>('list');

  return (
    <>
      <div className="flex justify-end mb-4">
        <LayoutToggle onLayoutChange={setLayout} />
      </div>
      <GlobalFeedClient
        initialData={initialData}
        layout={layout}
        filterType={filterType}
        filterHashtag={filterHashtag}
        filterClimateZones={filterClimateZones}
        filterFarmSize={filterFarmSize}
        filterSoilTypes={filterSoilTypes}
        apiEndpoint={apiEndpoint}
      />
    </>
  );
}
