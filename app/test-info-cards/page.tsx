'use client';

import { useState } from 'react';
import { QuickStatsCard } from '@/components/map/info-cards/quick-stats-card';
import { Sprout, Square, Activity, TrendingUp } from 'lucide-react';

export default function TestPage() {
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
    </div>
  );
}
