'use client';

import { useState, useCallback, useRef } from 'react';
import {
  Camera, X, Loader2, MapPin, Image as ImageIcon,
  CheckCircle2, RotateCcw, Send,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useGeolocation, type GeolocationPosition } from '@/hooks/use-geolocation';
import {
  classifyAccuracy,
  formatAccuracy,
  formatCoordinates,
  isPositionNearFarm,
} from '@/lib/gps';
import type maplibregl from 'maplibre-gl';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GeotaggedPhotoData {
  lat: number;
  lng: number;
  accuracy: number;
  altitude: number | null;
  heading: number | null;
  /** Base64 data URL of the photo */
  imageData: string;
  /** User caption */
  caption: string;
  /** Direction the camera was pointing */
  compassDirection: string | null;
  /** Timestamp of capture */
  capturedAt: string;
}

interface GeotaggedPhotoCaptureProps {
  mapRef: React.RefObject<maplibregl.Map | null>;
  farmCenter: { lat: number; lng: number };
  farmId: string;
  onSubmit: (data: GeotaggedPhotoData) => void;
  onCancel: () => void;
  visible?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function headingToCompass(heading: number | null): string | null {
  if (heading === null) return null;
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(heading / 45) % 8;
  return directions[index];
}

// ─── Component ────────────────────────────────────────────────────────────────

type CapturePhase = 'idle' | 'photo' | 'review';

export function GeotaggedPhotoCapture({
  mapRef,
  farmCenter,
  farmId,
  onSubmit,
  onCancel,
  visible = true,
}: GeotaggedPhotoCaptureProps) {
  const [phase, setPhase] = useState<CapturePhase>('idle');
  const [capturedPosition, setCapturedPosition] = useState<GeolocationPosition | null>(null);
  const [imageData, setImageData] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [locationWarning, setLocationWarning] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    loading,
    supported,
    getCurrentPosition,
  } = useGeolocation({
    enableHighAccuracy: true,
    maximumAge: 5000, // Allow slightly cached position for speed
    timeout: 15000,
  });

  // ─── Capture GPS + open camera/file picker simultaneously ───────────────

  const handleStartCapture = useCallback(async () => {
    setLocationWarning(null);

    // Get GPS position first
    try {
      const pos = await getCurrentPosition();
      setCapturedPosition(pos);

      if (!isPositionNearFarm(pos.lat, pos.lng, farmCenter.lat, farmCenter.lng)) {
        setLocationWarning('You appear to be far from this farm.');
      }

      // Fly map to position
      const map = mapRef.current;
      if (map) {
        map.flyTo({
          center: [pos.lng, pos.lat],
          zoom: Math.max(map.getZoom(), 17),
          duration: 1000,
        });
      }

      // Open file picker (camera on mobile, file browser on desktop)
      setPhase('photo');
      // Small delay to let the UI update before triggering the native file picker
      setTimeout(() => {
        fileInputRef.current?.click();
      }, 100);
    } catch {
      // Error state is in hook
    }
  }, [getCurrentPosition, farmCenter, mapRef]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setPhase('idle');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImageData(reader.result as string);
      setPhase('review');
    };
    reader.readAsDataURL(file);

    // Reset the input so the same file can be re-selected
    e.target.value = '';
  }, []);

  const handleRetake = useCallback(() => {
    setImageData(null);
    setPhase('photo');
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 100);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!capturedPosition || !imageData) return;
    setSubmitting(true);

    try {
      const data: GeotaggedPhotoData = {
        lat: capturedPosition.lat,
        lng: capturedPosition.lng,
        accuracy: capturedPosition.accuracy,
        altitude: capturedPosition.altitude,
        heading: capturedPosition.heading,
        imageData,
        caption: caption.trim(),
        compassDirection: headingToCompass(capturedPosition.heading),
        capturedAt: new Date().toISOString(),
      };

      onSubmit(data);
    } finally {
      setSubmitting(false);
      setPhase('idle');
      setImageData(null);
      setCaption('');
      setCapturedPosition(null);
    }
  }, [capturedPosition, imageData, caption, onSubmit]);

  const handleCancel = useCallback(() => {
    setPhase('idle');
    setImageData(null);
    setCaption('');
    setCapturedPosition(null);
    setLocationWarning(null);
    onCancel();
  }, [onCancel]);

  if (!visible || !supported) return null;

  const accuracyInfo = capturedPosition ? classifyAccuracy(capturedPosition.accuracy) : null;

  // Hidden file input — uses camera on mobile
  const fileInput = (
    <input
      ref={fileInputRef}
      type="file"
      accept="image/*"
      capture="environment"
      onChange={handleFileChange}
      className="hidden"
      aria-hidden="true"
    />
  );

  // ─── Idle: Show FAB ───────────────────────────────────────────────────

  if (phase === 'idle') {
    return (
      <>
        {fileInput}
        <button
          onClick={handleStartCapture}
          disabled={loading}
          className={cn(
            'fixed z-[45] flex items-center gap-2 rounded-full shadow-xl transition-all duration-200',
            'bg-pink-600 text-white hover:bg-pink-700 active:scale-95',
            'focus:outline-none focus:ring-4 focus:ring-pink-600/30',
            'disabled:opacity-70 disabled:cursor-wait',
            'bottom-[208px] left-5 md:bottom-32 md:left-8',
            'h-14 px-4',
          )}
          aria-label="Take geotagged photo"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Camera className="h-5 w-5" />
          )}
          <span className="text-sm font-semibold pr-1">
            {loading ? 'Locating...' : 'Photo'}
          </span>
        </button>
      </>
    );
  }

  // ─── Photo selection waiting state ─────────────────────────────────────

  if (phase === 'photo') {
    return (
      <>
        {fileInput}
        <div className="fixed inset-x-0 bottom-0 z-[55] flex justify-center p-4 pb-6 md:pb-8">
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-[2px] -z-10 animate-in fade-in duration-200"
            onClick={handleCancel}
          />
          <div className="w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl overflow-hidden p-6 text-center animate-in slide-in-from-bottom-4 fade-in duration-300">
            <Camera className="h-10 w-10 text-pink-600 mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground mb-1">Take or Choose a Photo</p>
            <p className="text-xs text-muted-foreground mb-4">
              Your GPS location has been captured. Select a photo to geotag.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={handleCancel}>
                Cancel
              </Button>
              <Button size="sm" className="flex-1 gap-1.5" onClick={() => fileInputRef.current?.click()}>
                <ImageIcon className="h-4 w-4" />
                Choose Photo
              </Button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ─── Review: preview photo + add caption ───────────────────────────────

  return (
    <>
      {fileInput}
      <div className="fixed inset-x-0 bottom-0 z-[55] flex justify-center p-4 pb-6 md:pb-8">
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-[2px] -z-10 animate-in fade-in duration-200"
          onClick={handleCancel}
        />
        <div className="w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-300 max-h-[85vh] flex flex-col">
          {/* Photo preview */}
          <div className="relative flex-shrink-0">
            {imageData && (
              <img
                src={imageData}
                alt="Captured photo"
                className="w-full h-48 object-cover"
              />
            )}
            {/* GPS badge overlay */}
            {capturedPosition && accuracyInfo && (
              <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm rounded-lg px-2.5 py-1.5 flex items-center gap-2">
                <MapPin className="h-3 w-3 text-white" />
                <span className="text-[11px] text-white font-mono">
                  {formatCoordinates(capturedPosition.lat, capturedPosition.lng)}
                </span>
                <div className={cn('h-1.5 w-1.5 rounded-full', accuracyInfo.bgColor)} />
              </div>
            )}
            {/* Compass direction badge */}
            {capturedPosition?.heading !== null && capturedPosition?.heading !== undefined && (
              <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm rounded-lg px-2 py-1.5">
                <span className="text-[11px] text-white font-medium">
                  Facing {headingToCompass(capturedPosition.heading)}
                </span>
              </div>
            )}
            {/* Retake button */}
            <button
              onClick={handleRetake}
              className="absolute top-2 right-2 h-8 w-8 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-black/70 transition-colors"
              aria-label="Retake photo"
            >
              <RotateCcw className="h-4 w-4 text-white" />
            </button>
          </div>

          {/* Caption + location info */}
          <div className="p-4 space-y-3 flex-1 overflow-y-auto">
            {locationWarning && (
              <p className="text-[11px] text-amber-600 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg px-2.5 py-1.5">{locationWarning}</p>
            )}

            <div>
              <Label htmlFor="photo-caption" className="text-xs">Caption</Label>
              <Input
                id="photo-caption"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="What are you documenting?"
                className="text-sm mt-1"
                autoFocus
              />
            </div>

            {/* Location metadata */}
            {capturedPosition && (
              <div className="bg-muted/50 rounded-lg p-2.5 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                <span>Accuracy: {formatAccuracy(capturedPosition.accuracy)}</span>
                {capturedPosition.altitude !== null && (
                  <span>Altitude: {capturedPosition.altitude.toFixed(1)}m</span>
                )}
                {capturedPosition.heading !== null && (
                  <span>Heading: {Math.round(capturedPosition.heading)}&deg; ({headingToCompass(capturedPosition.heading)})</span>
                )}
                <span>Time: {new Date().toLocaleTimeString()}</span>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="p-3 border-t border-border/50 flex gap-2 flex-shrink-0">
            <Button variant="outline" size="sm" className="flex-1" onClick={handleCancel}>
              Discard
            </Button>
            <Button
              size="sm"
              className="flex-1 gap-1.5 bg-pink-600 hover:bg-pink-700"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Save Photo
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
