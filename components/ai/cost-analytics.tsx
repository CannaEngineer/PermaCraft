// components/ai/cost-analytics.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';

export function CostAnalytics() {
  const [stats, setStats] = useState({
    totalRequests: 0,
    cachedRequests: 0,
    avgTokensPerRequest: 0,
    avgImageSize: 0,
    cacheHitRate: 0
  });

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch('/api/ai/cache-stats');
        if (response.ok) {
          const cacheStats = await response.json();
          setStats({
            totalRequests: 0, // Placeholder - tracking not implemented yet
            cachedRequests: cacheStats.size,
            avgTokensPerRequest: 0, // Placeholder - tracking not implemented yet
            avgImageSize: 0, // Placeholder - tracking not implemented yet
            cacheHitRate: cacheStats.hitRate
          });
        }
      } catch (error) {
        console.error('Failed to fetch cache stats:', error);
      }
    }

    fetchStats();
  }, []);

  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold mb-3">AI Cost Analytics</h3>
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <div className="text-muted-foreground">Cache hit rate</div>
          <div className="text-lg font-bold text-green-600">
            {(stats.cacheHitRate * 100).toFixed(1)}%
          </div>
        </div>
        <div>
          <div className="text-muted-foreground">Cached responses</div>
          <div className="text-lg font-bold">{stats.cachedRequests}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Avg tokens</div>
          <div className="text-lg font-bold">{stats.avgTokensPerRequest}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Avg image</div>
          <div className="text-lg font-bold">
            {(stats.avgImageSize / 1024).toFixed(0)}KB
          </div>
        </div>
      </div>
    </Card>
  );
}
