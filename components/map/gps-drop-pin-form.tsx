'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Leaf, TestTube2, Eye, MapPin, Camera, Hammer,
  X, ChevronRight, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  type GPSMarkerType,
  GPS_MARKER_TYPES,
  type AccuracyInfo,
  formatCoordinates,
  formatAccuracy,
} from '@/lib/gps';
import type { GeolocationPosition } from '@/hooks/use-geolocation';

const MARKER_ICONS: Record<GPSMarkerType, React.ReactNode> = {
  planting: <Leaf className="h-5 w-5" />,
  soil_test: <TestTube2 className="h-5 w-5" />,
  observation: <Eye className="h-5 w-5" />,
  waypoint: <MapPin className="h-5 w-5" />,
  photo: <Camera className="h-5 w-5" />,
  infrastructure: <Hammer className="h-5 w-5" />,
};

export interface GPSDropPinFormData {
  markerType: GPSMarkerType;
  lat: number;
  lng: number;
  accuracy: number;
  altitude: number | null;
  notes: string;
  /** For planting type — triggers species picker after form submit */
  wantsSpeciesPicker: boolean;
}

interface GPSDropPinFormProps {
  position: GeolocationPosition;
  accuracyInfo: AccuracyInfo;
  onSubmit: (data: GPSDropPinFormData) => void;
  onCancel: () => void;
  /** If true, shows a loading state on the submit button */
  submitting?: boolean;
  /** Default marker type to pre-select */
  defaultMarkerType?: GPSMarkerType;
}

export function GPSDropPinForm({
  position,
  accuracyInfo,
  onSubmit,
  onCancel,
  submitting = false,
  defaultMarkerType = 'planting',
}: GPSDropPinFormProps) {
  const [markerType, setMarkerType] = useState<GPSMarkerType>(defaultMarkerType);
  const [notes, setNotes] = useState('');
  const [step, setStep] = useState<'type' | 'details'>('type');

  const handleSubmit = () => {
    onSubmit({
      markerType,
      lat: position.lat,
      lng: position.lng,
      accuracy: position.accuracy,
      altitude: position.altitude,
      notes: notes.trim(),
      wantsSpeciesPicker: markerType === 'planting',
    });
  };

  const config = GPS_MARKER_TYPES[markerType];

  return (
    <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden w-full max-w-sm animate-in slide-in-from-bottom-4 fade-in duration-300">
      {/* Header with coordinates */}
      <div className="px-4 pt-4 pb-3 border-b border-border/50 bg-muted/30">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-foreground">Drop Pin at My Location</h3>
          <button
            onClick={onCancel}
            className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
            aria-label="Cancel"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Coordinates + accuracy */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="font-mono">{formatCoordinates(position.lat, position.lng)}</span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <div className={cn('h-2 w-2 rounded-full flex-shrink-0', accuracyInfo.bgColor)} />
          <span className={cn('text-xs font-medium', accuracyInfo.color)}>
            {accuracyInfo.label} — {formatAccuracy(position.accuracy)}
          </span>
        </div>
        {position.altitude !== null && (
          <div className="text-xs text-muted-foreground mt-1">
            Altitude: {position.altitude.toFixed(1)}m
          </div>
        )}
      </div>

      {step === 'type' ? (
        /* Step 1: Choose marker type */
        <div className="p-3">
          <p className="text-xs text-muted-foreground mb-2 px-1">What are you marking?</p>
          <div className="grid grid-cols-2 gap-2">
            {Object.values(GPS_MARKER_TYPES).map((typeConfig) => (
              <button
                key={typeConfig.type}
                onClick={() => {
                  setMarkerType(typeConfig.type);
                  setStep('details');
                }}
                className={cn(
                  'flex items-center gap-2.5 p-3 rounded-xl border transition-all text-left',
                  'hover:bg-muted/50 active:scale-[0.98]',
                  markerType === typeConfig.type
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                    : 'border-border/50',
                )}
              >
                <div className={cn('flex-shrink-0', typeConfig.color)}>
                  {MARKER_ICONS[typeConfig.type]}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground">{typeConfig.label}</div>
                  <div className="text-[11px] text-muted-foreground leading-tight truncate">
                    {typeConfig.description}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        /* Step 2: Details */
        <div className="p-4">
          {/* Selected type indicator */}
          <button
            onClick={() => setStep('type')}
            className="flex items-center gap-2 mb-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <div className={cn('flex-shrink-0', config.color)}>
              {MARKER_ICONS[markerType]}
            </div>
            <span className="font-medium text-foreground">{config.label}</span>
            <span className="text-xs">(tap to change)</span>
          </button>

          {/* Notes input */}
          <div className="space-y-3">
            <div>
              <label htmlFor="gps-notes" className="text-xs font-medium text-muted-foreground mb-1 block">
                {markerType === 'planting' ? 'Notes (species selected next)' : 'Notes'}
              </label>
              <Input
                id="gps-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={
                  markerType === 'planting' ? 'e.g., Planted near the oak tree...'
                  : markerType === 'soil_test' ? 'e.g., pH 6.5, clay loam...'
                  : markerType === 'observation' ? 'e.g., Good drainage here...'
                  : 'Add details...'
                }
                className="text-sm"
                autoFocus
              />
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep('type')}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={submitting}
                className={cn(
                  'flex-1 gap-1.5',
                  markerType === 'planting' && 'bg-green-600 hover:bg-green-700',
                )}
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    {markerType === 'planting' ? 'Choose Species' : 'Drop Pin'}
                    <ChevronRight className="h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
