'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  Navigation,
  Navigation2,
  Clock,
  Router,
  Compass,
  Locate,
  AlertTriangle,
  CheckCircle2,
  Maximize2,
  Minimize2,
  List,
} from 'lucide-react';

interface NavigationStop {
  id: string;
  title: string;
  description: string | null;
  lat: number | null;
  lng: number | null;
  stop_type: string;
  navigation_hint: string | null;
  direction_from_previous: string | null;
  distance_from_previous_meters: number | null;
  heading_degrees: number | null;
  estimated_time_minutes: number;
}

interface TourNavigationViewProps {
  stops: NavigationStop[];
  currentStopIndex: number;
  routeMode: string;
  onNavigateToStop: (index: number) => void;
  onClose: () => void;
  farmLat: number;
  farmLng: number;
}

function getCompassDirection(degrees: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(degrees / 45) % 8;
  return dirs[index];
}

function formatDistance(meters: number | null): string {
  if (!meters) return '';
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

function calculateBearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const lat1Rad = (lat1 * Math.PI) / 180;
  const lat2Rad = (lat2 * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);
  const bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return (bearing + 360) % 360;
}

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function TourNavigationView({
  stops,
  currentStopIndex,
  routeMode,
  onNavigateToStop,
  onClose,
  farmLat,
  farmLng,
}: TourNavigationViewProps) {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showStopList, setShowStopList] = useState(false);
  const [userHeading, setUserHeading] = useState<number | null>(null);

  const currentStop = stops[currentStopIndex];
  const nextStop = currentStopIndex < stops.length - 1 ? stops[currentStopIndex + 1] : null;

  // Start watching user location
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      return;
    }

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        if (pos.coords.heading != null && !isNaN(pos.coords.heading)) {
          setUserHeading(pos.coords.heading);
        }
        setLocationError(null);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setLocationError('Location access denied. Enable location to use navigation.');
        } else {
          setLocationError('Unable to get your location');
        }
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );

    setWatchId(id);
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  // Calculate distance and bearing to current stop
  const distanceToStop = userLocation && currentStop?.lat && currentStop?.lng
    ? calculateDistance(userLocation.lat, userLocation.lng, currentStop.lat, currentStop.lng)
    : null;

  const bearingToStop = userLocation && currentStop?.lat && currentStop?.lng
    ? calculateBearing(userLocation.lat, userLocation.lng, currentStop.lat, currentStop.lng)
    : null;

  // Calculate relative bearing (accounting for user heading)
  const relativeBearing = bearingToStop != null && userHeading != null
    ? (bearingToStop - userHeading + 360) % 360
    : bearingToStop;

  // Check if user is close to current stop (within 20m)
  const isNearStop = distanceToStop != null && distanceToStop < 20;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50">
      {/* Stop List Overlay */}
      {showStopList && (
        <div className="bg-background/95 backdrop-blur border-t rounded-t-2xl max-h-[60vh] overflow-y-auto px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-sm">All Stops</h4>
            <Button variant="ghost" size="sm" onClick={() => setShowStopList(false)}>Done</Button>
          </div>
          <div className="space-y-1.5">
            {stops.map((stop, idx) => (
              <button
                key={stop.id}
                onClick={() => { onNavigateToStop(idx); setShowStopList(false); }}
                className={`w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-colors ${
                  idx === currentStopIndex
                    ? 'bg-primary/10 border border-primary/20'
                    : 'hover:bg-muted'
                }`}
              >
                <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${
                  idx === currentStopIndex
                    ? 'bg-primary text-primary-foreground'
                    : idx < currentStopIndex
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-muted text-muted-foreground'
                }`}>
                  {idx < currentStopIndex ? <CheckCircle2 className="h-3.5 w-3.5" /> : idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{stop.title}</p>
                  <p className="text-xs text-muted-foreground capitalize">{stop.stop_type.replace(/_/g, ' ')}</p>
                </div>
                {stop.lat && stop.lng && userLocation && (
                  <span className="text-xs text-muted-foreground">
                    {formatDistance(calculateDistance(userLocation.lat, userLocation.lng, stop.lat, stop.lng))}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Navigation Card */}
      <div className="bg-background border-t shadow-2xl">
        {/* Direction Banner */}
        {nextStop && currentStop && !isNearStop && (
          <div className="bg-blue-600 text-white px-4 py-3">
            <div className="flex items-center gap-3">
              {/* Compass Arrow */}
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <Navigation2
                  className="h-6 w-6 transition-transform duration-300"
                  style={{
                    transform: relativeBearing != null ? `rotate(${relativeBearing}deg)` : 'none',
                  }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">
                  {currentStop.direction_from_previous || currentStop.navigation_hint || `Head to ${currentStop.title}`}
                </p>
                {distanceToStop != null && (
                  <p className="text-xs text-blue-200">
                    {formatDistance(distanceToStop)} away
                    {bearingToStop != null && ` · ${getCompassDirection(bearingToStop)}`}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Arrived Banner */}
        {isNearStop && (
          <div className="bg-green-600 text-white px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">You've arrived!</p>
                <p className="text-xs text-green-200">Take your time exploring {currentStop?.title}</p>
              </div>
            </div>
          </div>
        )}

        {/* Location Error */}
        {locationError && (
          <div className="bg-amber-50 dark:bg-amber-950/30 px-4 py-2 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-400">{locationError}</p>
          </div>
        )}

        {/* Current Stop Info */}
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                {currentStopIndex + 1}
              </span>
              <div>
                <p className="font-semibold text-sm">{currentStop?.title}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-0.5">
                    <Clock className="h-3 w-3" />
                    {currentStop?.estimated_time_minutes} min
                  </span>
                  <span>{currentStopIndex + 1} of {stops.length}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setShowStopList(!showStopList)}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Expanded description */}
          {isExpanded && currentStop?.description && (
            <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
              {currentStop.description}
            </p>
          )}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-primary mb-3 block"
          >
            {isExpanded ? 'Show less' : 'Show more about this stop'}
          </button>

          {/* Progress bar */}
          <div className="w-full h-1 bg-muted rounded-full overflow-hidden mb-3">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${((currentStopIndex + 1) / stops.length) * 100}%` }}
            />
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigateToStop(currentStopIndex - 1)}
              disabled={currentStopIndex === 0}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </Button>

            {/* Open in maps */}
            {currentStop?.lat && currentStop?.lng && (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${currentStop.lat},${currentStop.lng}&travelmode=${routeMode === 'driving' ? 'driving' : routeMode === 'cycling' ? 'bicycling' : 'walking'}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="sm" className="gap-1.5 text-blue-600 border-blue-200">
                  <Navigation className="h-3.5 w-3.5" />
                  Open in Maps
                </Button>
              </a>
            )}

            {currentStopIndex < stops.length - 1 ? (
              <Button
                size="sm"
                onClick={() => onNavigateToStop(currentStopIndex + 1)}
                className="gap-1"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button size="sm" onClick={onClose} className="gap-1">
                Finish
                <CheckCircle2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
