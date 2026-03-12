'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Crosshair, Loader2, MapPin, Move } from 'lucide-react';

interface StopLocationPickerProps {
  lat: string;
  lng: string;
  onLocationChange: (lat: string, lng: string) => void;
}

export function StopLocationPicker({ lat, lng, onLocationChange }: StopLocationPickerProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState('');
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);

  const hasCoords = lat !== '' && lng !== '';

  const placeMarker = useCallback((latitude: number, longitude: number) => {
    if (!mapRef.current) return;

    if (markerRef.current) {
      markerRef.current.setLngLat([longitude, latitude]);
    } else {
      const maplibregl = (window as any).__maplibregl;
      if (!maplibregl) return;
      markerRef.current = new maplibregl.Marker({
        color: '#16a34a',
        draggable: true,
      })
        .setLngLat([longitude, latitude])
        .addTo(mapRef.current);

      markerRef.current.on('dragend', () => {
        const lngLat = markerRef.current.getLngLat();
        onLocationChange(lngLat.lat.toFixed(6), lngLat.lng.toFixed(6));
      });
    }
  }, [onLocationChange]);

  const initMap = useCallback(async (centerLat: number, centerLng: number) => {
    if (mapRef.current || !mapContainer.current) return;

    const maplibregl = await import('maplibre-gl');
    (window as any).__maplibregl = maplibregl.default || maplibregl;
    const MapLib = maplibregl.default || maplibregl;

    const m = new MapLib.Map({
      container: mapContainer.current,
      style: {
        version: 8 as const,
        sources: {
          satellite: {
            type: 'raster',
            tiles: [
              'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            ],
            tileSize: 256,
          },
        },
        layers: [
          {
            id: 'satellite',
            type: 'raster',
            source: 'satellite',
          },
        ],
      },
      center: [centerLng, centerLat],
      zoom: 18,
      maxZoom: 21,
      minZoom: 2,
    });

    mapRef.current = m;

    m.on('load', () => {
      setMapLoaded(true);
      placeMarker(centerLat, centerLng);
    });

    m.on('click', (e: any) => {
      const { lat: clickLat, lng: clickLng } = e.lngLat;
      placeMarker(clickLat, clickLng);
      onLocationChange(clickLat.toFixed(6), clickLng.toFixed(6));
    });

    return () => {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
      m.remove();
      mapRef.current = null;
    };
  }, [placeMarker, onLocationChange]);

  // Clean up map on unmount
  useEffect(() => {
    return () => {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update marker when lat/lng props change externally
  useEffect(() => {
    if (mapRef.current && mapLoaded && hasCoords) {
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);
      if (!isNaN(latitude) && !isNaN(longitude)) {
        placeMarker(latitude, longitude);
      }
    }
  }, [lat, lng, mapLoaded, hasCoords, placeMarker]);

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setLocateError('Geolocation is not supported by your browser');
      return;
    }

    setLocating(true);
    setLocateError('');
    setAccuracy(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy: acc } = position.coords;
        setLocating(false);
        setAccuracy(acc);
        onLocationChange(latitude.toFixed(6), longitude.toFixed(6));

        if (!showMap) {
          setShowMap(true);
          // Delay map init to allow container to render
          setTimeout(() => {
            initMap(latitude, longitude);
          }, 50);
        } else if (mapRef.current) {
          mapRef.current.flyTo({
            center: [longitude, latitude],
            zoom: 19,
            duration: 1000,
          });
          placeMarker(latitude, longitude);
        }
      },
      (error) => {
        setLocating(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocateError('Location access denied. Please allow location access in your browser settings.');
            break;
          case error.POSITION_UNAVAILABLE:
            setLocateError('Location unavailable. Make sure location services are enabled on your device.');
            break;
          case error.TIMEOUT:
            setLocateError('Location request timed out. Please try again.');
            break;
          default:
            setLocateError('Unable to get your location. Please try again.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  const handleShowMap = () => {
    setShowMap(true);
    const centerLat = hasCoords ? parseFloat(lat) : 37.7749;
    const centerLng = hasCoords ? parseFloat(lng) : -122.4194;
    setTimeout(() => {
      initMap(
        isNaN(centerLat) ? 37.7749 : centerLat,
        isNaN(centerLng) ? -122.4194 : centerLng
      );
    }, 50);
  };

  return (
    <div className="space-y-3">
      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleUseMyLocation}
          disabled={locating}
          className="gap-1.5"
        >
          {locating ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Getting location...
            </>
          ) : (
            <>
              <Crosshair className="h-3.5 w-3.5" />
              Use My Location
            </>
          )}
        </Button>
        {!showMap && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleShowMap}
            className="gap-1.5"
          >
            <MapPin className="h-3.5 w-3.5" />
            Pick on Map
          </Button>
        )}
      </div>

      {/* Error message */}
      {locateError && (
        <p className="text-xs text-destructive">{locateError}</p>
      )}

      {/* Accuracy indicator */}
      {accuracy !== null && (
        <p className="text-xs text-muted-foreground">
          GPS accuracy: ~{accuracy < 1 ? '< 1' : Math.round(accuracy)}m
          {accuracy <= 5 && ' (excellent)'}
          {accuracy > 5 && accuracy <= 15 && ' (good)'}
          {accuracy > 15 && accuracy <= 50 && ' (moderate)'}
          {accuracy > 50 && ' (low - try moving to an open area)'}
        </p>
      )}

      {/* Map */}
      {showMap && (
        <div className="space-y-2">
          <div
            ref={mapContainer}
            className="w-full h-56 rounded-lg border overflow-hidden"
          />
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Move className="h-3 w-3" />
            Tap the map or drag the pin to adjust location
          </p>
        </div>
      )}

      {/* Coordinate display */}
      {hasCoords && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
          <MapPin className="h-3 w-3 shrink-0" />
          <span>{parseFloat(lat).toFixed(6)}, {parseFloat(lng).toFixed(6)}</span>
          <button
            type="button"
            onClick={() => {
              onLocationChange('', '');
              setAccuracy(null);
            }}
            className="ml-auto text-muted-foreground hover:text-destructive transition-colors text-xs underline"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
