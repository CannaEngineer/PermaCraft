'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock, Footprints, ChevronRight, Loader2 } from 'lucide-react';

interface TourData {
  config: { slug: string; primary_color: string; default_route_id: string | null };
  farm: {
    id: string; name: string; description: string | null;
    acres: number | null; center_lat: number; center_lng: number;
    climate_zone: string | null;
  };
  pois: Array<{ id: string; name: string; category: string; lat: number; lng: number }>;
  routes: Array<{
    id: string; name: string; duration_minutes: number | null;
    distance_meters: number | null; difficulty: string; is_default: number;
    poi_sequence: string;
  }>;
}

export function TourLandingClient({ farmSlug }: { farmSlug: string }) {
  const router = useRouter();
  const [data, setData] = useState<TourData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/tour/farms/${farmSlug}`)
      .then(res => {
        if (!res.ok) throw new Error('Tour not found');
        return res.json();
      })
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [farmSlug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Tour Not Found</CardTitle>
            <CardDescription>This tour is not available or has not been published yet.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const { farm, routes, pois, config } = data;

  const startTour = (routeId?: string) => {
    // Create anonymous session
    fetch('/api/tour/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ farm_id: farm.id, route_id: routeId || null }),
    })
      .then(res => res.json())
      .then(({ session }) => {
        if (session?.id) {
          sessionStorage.setItem('tour_session_id', session.id);
          sessionStorage.setItem('tour_farm_slug', farmSlug);
          sessionStorage.setItem('tour_farm_id', farm.id);
          sessionStorage.setItem('tour_ai_queries', '0');
        }
        const params = routeId ? `?route=${routeId}` : '';
        router.push(`/tour/${farmSlug}/map${params}`);
      })
      .catch(() => {
        router.push(`/tour/${farmSlug}/map`);
      });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white dark:from-green-950 dark:to-background">
      {/* Hero */}
      <div className="px-4 pt-12 pb-8 text-center max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-sm mb-4">
          <MapPin className="w-4 h-4" />
          Self-Guided Farm Tour
        </div>
        <h1 className="text-3xl font-bold mb-3">{farm.name}</h1>
        {farm.description && (
          <p className="text-muted-foreground text-lg mb-4">{farm.description}</p>
        )}
        <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
          {farm.acres && <span>{farm.acres} acres</span>}
          {farm.climate_zone && <span>Zone {farm.climate_zone}</span>}
          <span>{pois.length} stops</span>
        </div>
      </div>

      {/* Routes */}
      <div className="px-4 max-w-2xl mx-auto pb-8">
        {routes.length > 0 ? (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold mb-2">Choose a Route</h2>
            {routes.map(route => {
              const poiCount = JSON.parse(route.poi_sequence || '[]').length;
              return (
                <Card
                  key={route.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => startTour(route.id)}
                >
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                      <Footprints className="w-5 h-5 text-green-700 dark:text-green-300" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{route.name}</span>
                        {route.is_default === 1 && (
                          <Badge variant="secondary" className="text-xs">Recommended</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                        {route.duration_minutes && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {route.duration_minutes} min
                          </span>
                        )}
                        {route.distance_meters && (
                          <span>{Math.round(route.distance_meters)}m</span>
                        )}
                        <span>{poiCount} stops</span>
                        <Badge variant="outline" className="text-xs capitalize">
                          {route.difficulty}
                        </Badge>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center">
            <Button size="lg" onClick={() => startTour()} className="bg-green-600 hover:bg-green-700">
              Start Exploring
              <ChevronRight className="w-5 h-5 ml-1" />
            </Button>
          </div>
        )}

        {routes.length > 0 && (
          <div className="mt-4 text-center">
            <Button variant="outline" onClick={() => startTour()}>
              Free Explore (No Route)
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
