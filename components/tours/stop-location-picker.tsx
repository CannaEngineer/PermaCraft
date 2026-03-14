'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Crosshair, Loader2, MapPin, Move, Search, X } from 'lucide-react';

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  address?: Record<string, string>;
}

interface StopLocationPickerProps {
  lat: string;
  lng: string;
  onLocationChange: (lat: string, lng: string) => void;
  /** Farm center latitude — used as default map center and fallback location */
  farmLat?: number;
  /** Farm center longitude — used as default map center and fallback location */
  farmLng?: number;
}

export function StopLocationPicker({ lat, lng, onLocationChange, farmLat, farmLng }: StopLocationPickerProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState('');
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Address search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

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
    // Priority: existing coords > farm center > San Francisco fallback
    const defaultLat = farmLat ?? 37.7749;
    const defaultLng = farmLng ?? -122.4194;
    const centerLat = hasCoords ? parseFloat(lat) : defaultLat;
    const centerLng = hasCoords ? parseFloat(lng) : defaultLng;
    setTimeout(() => {
      initMap(
        isNaN(centerLat) ? defaultLat : centerLat,
        isNaN(centerLng) ? defaultLng : centerLng
      );
    }, 50);
  };

  // Address search with Nominatim (debounced)
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (value.trim().length < 3) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(value.trim())}&limit=5&addressdetails=1`,
          { headers: { 'Accept': 'application/json' } }
        );
        if (res.ok) {
          const data: SearchResult[] = await res.json();
          setSearchResults(data);
          setShowResults(data.length > 0);
        }
      } catch {
        // Silent fail on search
      } finally {
        setSearching(false);
      }
    }, 400);
  };

  const handleSelectSearchResult = (result: SearchResult) => {
    const latitude = parseFloat(result.lat);
    const longitude = parseFloat(result.lon);

    onLocationChange(latitude.toFixed(6), longitude.toFixed(6));
    setSearchQuery(result.display_name.split(',').slice(0, 2).join(','));
    setShowResults(false);

    if (!showMap) {
      setShowMap(true);
      setTimeout(() => initMap(latitude, longitude), 50);
    } else if (mapRef.current) {
      mapRef.current.flyTo({
        center: [longitude, latitude],
        zoom: 18,
        duration: 1000,
      });
      placeMarker(latitude, longitude);
    }
  };

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup search timeout
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, []);

  return (
    <div className="space-y-3">
      {/* Address search */}
      <div ref={searchContainerRef} className="relative">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search address or place name..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            onFocus={() => searchResults.length > 0 && setShowResults(true)}
            className="pl-8 pr-8 h-9 text-sm"
          />
          {searching && (
            <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
          )}
          {!searching && searchQuery && (
            <button
              type="button"
              onClick={() => { setSearchQuery(''); setSearchResults([]); setShowResults(false); }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Search results dropdown */}
        {showResults && searchResults.length > 0 && (
          <div className="absolute z-20 top-full mt-1 w-full bg-background border rounded-lg shadow-lg overflow-hidden">
            {searchResults.map((result, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSelectSearchResult(result)}
                className="w-full text-left px-3 py-2.5 text-sm hover:bg-muted/70 transition-colors border-b last:border-b-0 flex items-start gap-2"
              >
                <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                <span className="line-clamp-2 text-xs leading-relaxed">{result.display_name}</span>
              </button>
            ))}
            <div className="px-3 py-1.5 bg-muted/30 border-t">
              <p className="text-[10px] text-muted-foreground">Powered by OpenStreetMap Nominatim</p>
            </div>
          </div>
        )}
      </div>

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
