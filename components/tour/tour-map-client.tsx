'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  MessageCircle, Camera, QrCode, Navigation, X, ChevronRight,
  Loader2, MapPin, ArrowLeft,
} from 'lucide-react';
import { TourChat } from './tour-chat';
import { TourPlantIdScanner } from './tour-plant-id-scanner';
import { TourQrScanner } from './tour-qr-scanner';
import { haversineDistance, POI_CATEGORIES } from '@/lib/tour/utils';
import type { TourPoi, TourRoute } from '@/lib/db/schema';

interface TourMapClientProps {
  farmSlug: string;
  routeId?: string;
}

interface FarmData {
  id: string;
  name: string;
  center_lat: number;
  center_lng: number;
  zoom_level: number;
}

export function TourMapClient({ farmSlug, routeId }: TourMapClientProps) {
  const router = useRouter();
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const watchIdRef = useRef<number | null>(null);

  const [farm, setFarm] = useState<FarmData | null>(null);
  const [pois, setPois] = useState<TourPoi[]>([]);
  const [routes, setRoutes] = useState<TourRoute[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<TourRoute | null>(null);
  const [routeGeojson, setRouteGeojson] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [userPosition, setUserPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedPoi, setSelectedPoi] = useState<TourPoi | null>(null);
  const [visitedPois, setVisitedPois] = useState<Set<string>>(new Set());

  const [showChat, setShowChat] = useState(false);
  const [showPlantId, setShowPlantId] = useState(false);
  const [showQrScanner, setShowQrScanner] = useState(false);

  const sessionId = typeof window !== 'undefined' ? sessionStorage.getItem('tour_session_id') : null;
  const farmId = typeof window !== 'undefined' ? sessionStorage.getItem('tour_farm_id') : null;

  // Track events
  const trackEvent = useCallback((eventType: string, poiId?: string, payload?: any) => {
    if (!sessionId || !farmId) return;
    fetch('/api/tour/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        events: [{
          session_id: sessionId,
          farm_id: farmId,
          poi_id: poiId || null,
          event_type: eventType,
          payload: payload || null,
        }],
      }),
    }).catch(console.error);
  }, [sessionId, farmId]);

  // Fetch tour data
  useEffect(() => {
    fetch(`/api/tour/farms/${farmSlug}`)
      .then(res => res.json())
      .then(data => {
        setFarm(data.farm);
        setPois(data.pois || []);
        setRoutes(data.routes || []);

        // Select route
        const route = routeId
          ? data.routes?.find((r: any) => r.id === routeId)
          : data.routes?.find((r: any) => r.is_default === 1) || data.routes?.[0];
        if (route) setSelectedRoute(route);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [farmSlug, routeId]);

  // Initialize map
  useEffect(() => {
    if (!farm || !mapContainer.current || mapRef.current) return;

    import('maplibre-gl').then(({ default: maplibregl }) => {
      const map = new maplibregl.Map({
        container: mapContainer.current!,
        style: 'https://tiles.openfreemap.org/styles/liberty',
        center: [farm.center_lng, farm.center_lat],
        zoom: Math.max(farm.zoom_level, 15),
      });

      map.addControl(new maplibregl.NavigationControl(), 'top-right');
      mapRef.current = map;

      map.on('load', () => {
        // Add POI markers
        pois.forEach(poi => {
          const category = POI_CATEGORIES[poi.category] || POI_CATEGORIES.general;
          const el = document.createElement('div');
          el.className = 'tour-poi-marker';
          el.style.cssText = `
            width: 32px; height: 32px; border-radius: 50%;
            background: ${category.color}; border: 3px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3); cursor: pointer;
            display: flex; align-items: center; justify-content: center;
          `;
          el.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`;

          el.addEventListener('click', () => setSelectedPoi(poi));

          new maplibregl.Marker({ element: el })
            .setLngLat([poi.lng, poi.lat])
            .addTo(map);
        });
      });

      return () => map.remove();
    });
  }, [farm, pois]);

  // Draw route on map
  useEffect(() => {
    if (!mapRef.current || !selectedRoute) return;
    const map = mapRef.current;

    const poiSequence: string[] = JSON.parse(selectedRoute.poi_sequence || '[]');
    if (poiSequence.length < 2) return;

    const waypoints = poiSequence
      .map(id => pois.find(p => p.id === id))
      .filter(Boolean)
      .map(p => ({ lat: p!.lat, lng: p!.lng }));

    if (waypoints.length < 2) return;

    // Fetch directions
    fetch('/api/tour/directions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ waypoints }),
    })
      .then(res => res.json())
      .then(data => {
        if (!data.geometry) return;
        setRouteGeojson(data.geometry);

        const sourceId = 'tour-route';
        if (map.getSource(sourceId)) {
          (map.getSource(sourceId) as any).setData({
            type: 'Feature',
            properties: {},
            geometry: data.geometry,
          });
        } else {
          map.on('load', () => addRouteLayer(map, sourceId, data.geometry));
          if (map.loaded()) addRouteLayer(map, sourceId, data.geometry);
        }
      })
      .catch(console.error);
  }, [selectedRoute, pois]);

  function addRouteLayer(map: any, sourceId: string, geometry: any) {
    if (map.getSource(sourceId)) return;
    map.addSource(sourceId, {
      type: 'geojson',
      data: { type: 'Feature', properties: {}, geometry },
    });
    map.addLayer({
      id: sourceId,
      type: 'line',
      source: sourceId,
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': '#16a34a', 'line-width': 4, 'line-opacity': 0.8 },
    });
  }

  // GPS tracking
  useEffect(() => {
    if (!navigator.geolocation) return;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserPosition({ lat: latitude, lng: longitude });

        // Update user marker on map
        if (mapRef.current) {
          import('maplibre-gl').then(({ default: maplibregl }) => {
            if (!userMarkerRef.current) {
              const el = document.createElement('div');
              el.style.cssText = `
                width: 20px; height: 20px; border-radius: 50%;
                background: #3b82f6; border: 3px solid white;
                box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
              `;
              userMarkerRef.current = new maplibregl.Marker({ element: el })
                .setLngLat([longitude, latitude])
                .addTo(mapRef.current);
            } else {
              userMarkerRef.current.setLngLat([longitude, latitude]);
            }
          });
        }

        // Check proximity to POIs (15 meter threshold)
        pois.forEach(poi => {
          if (visitedPois.has(poi.id)) return;
          const distance = haversineDistance(latitude, longitude, poi.lat, poi.lng);
          if (distance <= 15) {
            setVisitedPois(prev => new Set([...prev, poi.id]));
            trackEvent('poi_arrived', poi.id);
            setSelectedPoi(poi);
          }
        });
      },
      (error) => console.warn('GPS error:', error.message),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [pois, visitedPois, trackEvent]);

  const endTour = () => {
    trackEvent('session_end');
    router.push(`/tour/${farmSlug}/complete`);
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="h-screen relative overflow-hidden">
      {/* Map */}
      <div ref={mapContainer} className="w-full h-full" />

      {/* Top bar */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
        <Button
          variant="secondary"
          size="sm"
          className="shadow-lg"
          onClick={() => router.back()}
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back
        </Button>
        <Button
          variant="secondary"
          size="sm"
          className="shadow-lg"
          onClick={endTour}
        >
          End Tour
        </Button>
      </div>

      {/* Bottom toolbar */}
      <div className="absolute bottom-4 left-4 right-4 z-10">
        {/* Selected POI card */}
        {selectedPoi && (
          <Card className="mb-3 shadow-lg">
            <CardContent className="p-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-green-600" />
                    <span className="font-semibold">{selectedPoi.name}</span>
                    {visitedPois.has(selectedPoi.id) && (
                      <span className="text-xs text-green-600">Visited</span>
                    )}
                  </div>
                  {selectedPoi.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {selectedPoi.description}
                    </p>
                  )}
                  <Button
                    variant="link"
                    size="sm"
                    className="p-0 h-auto mt-1 text-green-600"
                    onClick={() => router.push(`/tour/${farmSlug}/poi/${selectedPoi.id}`)}
                  >
                    View Details <ChevronRight className="w-3 h-3" />
                  </Button>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSelectedPoi(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action buttons */}
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="secondary"
            size="icon"
            className="w-12 h-12 rounded-full shadow-lg"
            onClick={() => setShowChat(true)}
          >
            <MessageCircle className="w-5 h-5" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className="w-12 h-12 rounded-full shadow-lg"
            onClick={() => setShowPlantId(true)}
          >
            <Camera className="w-5 h-5" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className="w-12 h-12 rounded-full shadow-lg"
            onClick={() => setShowQrScanner(true)}
          >
            <QrCode className="w-5 h-5" />
          </Button>
          {userPosition && (
            <Button
              variant="secondary"
              size="icon"
              className="w-12 h-12 rounded-full shadow-lg"
              onClick={() => {
                mapRef.current?.flyTo({
                  center: [userPosition.lng, userPosition.lat],
                  zoom: 18,
                });
              }}
            >
              <Navigation className="w-5 h-5" />
            </Button>
          )}
        </div>

        {/* Progress bar */}
        {selectedRoute && pois.length > 0 && (
          <div className="mt-3 bg-white dark:bg-gray-900 rounded-full px-4 py-2 shadow-lg flex items-center gap-2 justify-center">
            <span className="text-xs text-muted-foreground">
              {visitedPois.size}/{pois.length} stops visited
            </span>
            <div className="w-24 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-600 rounded-full transition-all"
                style={{ width: `${(visitedPois.size / pois.length) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Overlays */}
      {showChat && (
        <TourChat
          farmSlug={farmSlug}
          currentPoiId={selectedPoi?.id}
          onClose={() => setShowChat(false)}
        />
      )}

      {showPlantId && (
        <TourPlantIdScanner onClose={() => setShowPlantId(false)} />
      )}

      {showQrScanner && (
        <TourQrScanner
          farmSlug={farmSlug}
          onClose={() => setShowQrScanner(false)}
          onScanSuccess={(poiId) => {
            setShowQrScanner(false);
            trackEvent('qr_scanned', poiId);
            router.push(`/tour/${farmSlug}/poi/${poiId}`);
          }}
        />
      )}
    </div>
  );
}
