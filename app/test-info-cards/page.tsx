'use client';

import { useState } from 'react';
import { QuickStatsCard } from '@/components/map/info-cards/quick-stats-card';
import { CompactFilterPills } from '@/components/map/info-cards/compact-filter-pills';
import { Sprout, Square, Activity, TrendingUp } from 'lucide-react';

export default function TestPage() {
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  return (
    <div className="p-8 space-y-4">
      <h1 className="text-2xl font-bold mb-4">Map Info Cards Test</h1>

      <QuickStatsCard
        title="Farm Overview"
        stats={[
          { label: 'Plantings', value: 24, icon: Sprout, color: 'success' },
          { label: 'Zones', value: 8, icon: Square, color: 'info' },
          { label: 'Functions', value: 12, icon: Activity, color: 'warning' },
          { label: 'Growth', value: '85%', icon: TrendingUp, color: 'success' }
        ]}
      />

      <CompactFilterPills
        title="Layer Filters"
        filters={[
          { id: 'canopy', label: 'Canopy', color: '#166534', count: 5 },
          { id: 'shrub', label: 'Shrub', color: '#22c55e', count: 12 },
          { id: 'groundcover', label: 'Groundcover', color: '#a3e635', count: 8 }
        ]}
        activeFilters={activeFilters}
        onToggle={(id) => {
          setActiveFilters(prev =>
            prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
          );
        }}
        onClearAll={() => setActiveFilters([])}
      />
    </div>
  );
}
