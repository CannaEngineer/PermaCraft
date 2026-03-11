'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Users, MapPin, Share2, BarChart3 } from 'lucide-react';
import type { TourSession, TourPoi } from '@/lib/db/schema';

interface Analytics {
  totalSessions: number;
  avgPoisVisited: number;
  totalShares: number;
  shareRate: number;
  topPoi: { poiId: string; visits: number } | null;
  recentSessions: TourSession[];
}

export function TourAdminAnalytics() {
  const [farms, setFarms] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedFarmId, setSelectedFarmId] = useState('');
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [pois, setPois] = useState<TourPoi[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/farms')
      .then(r => r.json())
      .then(data => {
        setFarms(data.farms || []);
        if (data.farms?.length > 0) setSelectedFarmId(data.farms[0].id);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedFarmId) return;
    Promise.all([
      fetch(`/api/admin/tour/analytics?farm_id=${selectedFarmId}`).then(r => r.json()),
      fetch(`/api/admin/tour/pois?farm_id=${selectedFarmId}`).then(r => r.json()),
    ]).then(([analyticsData, poiData]) => {
      setAnalytics(analyticsData.analytics || null);
      setPois(poiData.pois || []);
    }).catch(console.error);
  }, [selectedFarmId]);

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  const topPoiName = analytics?.topPoi
    ? pois.find(p => p.id === analytics.topPoi!.poiId)?.name || 'Unknown'
    : 'N/A';

  return (
    <div className="space-y-6">
      {farms.length > 1 && (
        <select
          value={selectedFarmId}
          onChange={(e) => setSelectedFarmId(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          {farms.map(f => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
      )}

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="w-6 h-6 text-blue-600 mx-auto mb-1" />
            <p className="text-3xl font-bold">{analytics?.totalSessions ?? 0}</p>
            <p className="text-xs text-muted-foreground">Total Sessions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <MapPin className="w-6 h-6 text-green-600 mx-auto mb-1" />
            <p className="text-3xl font-bold">{analytics?.avgPoisVisited ?? 0}</p>
            <p className="text-xs text-muted-foreground">Avg POIs Visited</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Share2 className="w-6 h-6 text-purple-600 mx-auto mb-1" />
            <p className="text-3xl font-bold">{analytics?.shareRate ?? 0}%</p>
            <p className="text-xs text-muted-foreground">Share Rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <BarChart3 className="w-6 h-6 text-orange-600 mx-auto mb-1" />
            <p className="text-lg font-bold truncate">{topPoiName}</p>
            <p className="text-xs text-muted-foreground">
              Most Visited{analytics?.topPoi ? ` (${analytics.topPoi.visits})` : ''}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent sessions table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {analytics?.recentSessions && analytics.recentSessions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-medium">Started</th>
                    <th className="text-left py-2 px-3 font-medium">Device</th>
                    <th className="text-left py-2 px-3 font-medium">POIs</th>
                    <th className="text-left py-2 px-3 font-medium">Shares</th>
                    <th className="text-left py-2 px-3 font-medium">Completion</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.recentSessions.map(session => (
                    <tr key={session.id} className="border-b last:border-0">
                      <td className="py-2 px-3">
                        {new Date(session.started_at * 1000).toLocaleDateString()}{' '}
                        {new Date(session.started_at * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-2 px-3">
                        <Badge variant="outline" className="text-xs capitalize">
                          {session.device_type || 'unknown'}
                        </Badge>
                      </td>
                      <td className="py-2 px-3">{session.pois_visited_count}</td>
                      <td className="py-2 px-3">{session.shares_count}</td>
                      <td className="py-2 px-3">
                        <Badge variant={session.completion_percentage >= 80 ? 'default' : 'secondary'}>
                          {Math.round(session.completion_percentage)}%
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No sessions yet. Visitors will appear here once they start using the tour.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
