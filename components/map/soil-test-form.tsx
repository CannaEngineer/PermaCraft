'use client';

import { useState, useCallback } from 'react';
import {
  TestTube2, X, ChevronRight, Loader2, MapPin,
  Droplets, Thermometer, Layers,
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
  accuracyCircleGeoJSON,
} from '@/lib/gps';
import type maplibregl from 'maplibre-gl';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SoilTestData {
  lat: number;
  lng: number;
  accuracy: number;
  altitude: number | null;
  /** pH value 0-14 */
  ph: number | null;
  /** Soil texture class */
  texture: string | null;
  /** Organic matter percentage */
  organicMatter: number | null;
  /** Drainage rating */
  drainage: string | null;
  /** Nitrogen level (ppm or qualitative) */
  nitrogen: string | null;
  /** Phosphorus level */
  phosphorus: string | null;
  /** Potassium level */
  potassium: string | null;
  /** Depth of sample in inches */
  depthInches: number | null;
  /** Color description */
  color: string | null;
  /** Moisture level at time of test */
  moisture: string | null;
  /** Free-text notes */
  notes: string;
  /** Label/name for this test location */
  label: string;
  /** Timestamp */
  testedAt: string;
}

interface SoilTestFormProps {
  mapRef: React.RefObject<maplibregl.Map | null>;
  farmCenter: { lat: number; lng: number };
  onSubmit: (data: SoilTestData) => void;
  onCancel: () => void;
  visible?: boolean;
}

// ─── Soil property options ───────────────────────────────────────────────────

const TEXTURE_OPTIONS = [
  { value: 'sand', label: 'Sand', description: 'Gritty, drains fast' },
  { value: 'loamy_sand', label: 'Loamy Sand', description: 'Mostly sand, some silt' },
  { value: 'sandy_loam', label: 'Sandy Loam', description: 'Light, good drainage' },
  { value: 'loam', label: 'Loam', description: 'Balanced, ideal' },
  { value: 'silt_loam', label: 'Silt Loam', description: 'Smooth, holds moisture' },
  { value: 'silt', label: 'Silt', description: 'Very smooth, powdery' },
  { value: 'clay_loam', label: 'Clay Loam', description: 'Sticky when wet' },
  { value: 'sandy_clay_loam', label: 'Sandy Clay Loam', description: 'Sandy but sticky' },
  { value: 'silty_clay_loam', label: 'Silty Clay Loam', description: 'Smooth & sticky' },
  { value: 'sandy_clay', label: 'Sandy Clay', description: 'Gritty & sticky' },
  { value: 'silty_clay', label: 'Silty Clay', description: 'Smooth & very sticky' },
  { value: 'clay', label: 'Clay', description: 'Very sticky, slow drain' },
];

const DRAINAGE_OPTIONS = [
  { value: 'excellent', label: 'Excellent', color: 'text-blue-600' },
  { value: 'good', label: 'Good', color: 'text-green-600' },
  { value: 'moderate', label: 'Moderate', color: 'text-amber-600' },
  { value: 'poor', label: 'Poor', color: 'text-orange-600' },
  { value: 'very_poor', label: 'Very Poor', color: 'text-red-600' },
];

const MOISTURE_OPTIONS = [
  { value: 'dry', label: 'Dry' },
  { value: 'slightly_moist', label: 'Slightly Moist' },
  { value: 'moist', label: 'Moist' },
  { value: 'wet', label: 'Wet' },
  { value: 'saturated', label: 'Saturated' },
];

const NPK_OPTIONS = [
  { value: 'very_low', label: 'Very Low' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'very_high', label: 'Very High' },
];

// ─── Steps ────────────────────────────────────────────────────────────────────

type FormStep = 'capture' | 'basics' | 'nutrients' | 'notes';

// ─── Component ────────────────────────────────────────────────────────────────

export function SoilTestForm({
  mapRef,
  farmCenter,
  onSubmit,
  onCancel,
  visible = true,
}: SoilTestFormProps) {
  const [step, setStep] = useState<FormStep>('capture');
  const [capturedPosition, setCapturedPosition] = useState<GeolocationPosition | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [locationWarning, setLocationWarning] = useState<string | null>(null);

  // Form fields
  const [label, setLabel] = useState('');
  const [ph, setPh] = useState('');
  const [texture, setTexture] = useState<string | null>(null);
  const [drainage, setDrainage] = useState<string | null>(null);
  const [moisture, setMoisture] = useState<string | null>(null);
  const [organicMatter, setOrganicMatter] = useState('');
  const [depthInches, setDepthInches] = useState('6');
  const [color, setColor] = useState('');
  const [nitrogen, setNitrogen] = useState<string | null>(null);
  const [phosphorus, setPhosphorus] = useState<string | null>(null);
  const [potassium, setPotassium] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  const {
    loading,
    supported,
    getCurrentPosition,
  } = useGeolocation({
    enableHighAccuracy: true,
    maximumAge: 0,
    timeout: 20000,
  });

  const handleCapture = useCallback(async () => {
    setLocationWarning(null);
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
          zoom: Math.max(map.getZoom(), 18),
          duration: 1200,
        });
      }

      setStep('basics');
    } catch {
      // Error is in hook state
    }
  }, [getCurrentPosition, farmCenter, mapRef]);

  const handleSubmit = useCallback(() => {
    if (!capturedPosition) return;
    setSubmitting(true);

    const data: SoilTestData = {
      lat: capturedPosition.lat,
      lng: capturedPosition.lng,
      accuracy: capturedPosition.accuracy,
      altitude: capturedPosition.altitude,
      ph: ph ? parseFloat(ph) : null,
      texture,
      organicMatter: organicMatter ? parseFloat(organicMatter) : null,
      drainage,
      nitrogen,
      phosphorus,
      potassium,
      depthInches: depthInches ? parseFloat(depthInches) : null,
      color: color.trim() || null,
      moisture,
      notes: notes.trim(),
      label: label.trim() || `Soil test ${new Date().toLocaleDateString()}`,
      testedAt: new Date().toISOString(),
    };

    onSubmit(data);
    setSubmitting(false);
  }, [capturedPosition, ph, texture, organicMatter, drainage, nitrogen, phosphorus, potassium, depthInches, color, moisture, notes, label, onSubmit]);

  const handleCancel = useCallback(() => {
    setStep('capture');
    setCapturedPosition(null);
    onCancel();
  }, [onCancel]);

  if (!visible || !supported) return null;

  const accuracyInfo = capturedPosition ? classifyAccuracy(capturedPosition.accuracy) : null;

  // ─── Capture step: "I'm Here" style button ─────────────────────────────

  if (step === 'capture') {
    return (
      <button
        onClick={handleCapture}
        disabled={loading}
        className={cn(
          'fixed z-[45] flex items-center gap-2 rounded-full shadow-xl transition-all duration-200',
          'bg-amber-700 text-white hover:bg-amber-800 active:scale-95',
          'focus:outline-none focus:ring-4 focus:ring-amber-700/30',
          'disabled:opacity-70 disabled:cursor-wait',
          'bottom-[148px] left-5 md:bottom-20 md:left-8',
          'h-14 px-4',
        )}
        aria-label="Mark soil test location"
      >
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <TestTube2 className="h-5 w-5" />
        )}
        <span className="text-sm font-semibold pr-1">
          {loading ? 'Locating...' : 'Soil Test'}
        </span>
      </button>
    );
  }

  // ─── Multi-step form ─────────────────────────────────────────────────────

  return (
    <div className="fixed inset-x-0 bottom-0 z-[55] flex justify-center p-4 pb-6 md:pb-8">
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-[2px] -z-10 animate-in fade-in duration-200"
        onClick={handleCancel}
      />
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-300 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-border/50 bg-muted/30 flex-shrink-0">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <TestTube2 className="h-4 w-4 text-amber-700" />
              Soil Test
            </h3>
            <button onClick={handleCancel} className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors" aria-label="Cancel">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
          {capturedPosition && accuracyInfo && (
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="font-mono flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {formatCoordinates(capturedPosition.lat, capturedPosition.lng)}
              </span>
              <span className={cn('font-medium', accuracyInfo.color)}>
                {formatAccuracy(capturedPosition.accuracy)}
              </span>
            </div>
          )}
          {locationWarning && (
            <p className="text-[11px] text-amber-600 mt-1">{locationWarning}</p>
          )}

          {/* Step indicator */}
          <div className="flex gap-1 mt-2">
            {(['basics', 'nutrients', 'notes'] as const).map((s, i) => (
              <div
                key={s}
                className={cn(
                  'h-1 flex-1 rounded-full transition-colors',
                  step === s ? 'bg-amber-600' :
                  (['basics', 'nutrients', 'notes'].indexOf(step) > i ? 'bg-amber-400' : 'bg-border'),
                )}
              />
            ))}
          </div>
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto p-4">
          {step === 'basics' && (
            <div className="space-y-3">
              <div>
                <Label htmlFor="soil-label" className="text-xs">Location Label</Label>
                <Input
                  id="soil-label"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g., Garden bed #3, South field..."
                  className="text-sm mt-1"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="soil-ph" className="text-xs">pH Value</Label>
                  <Input
                    id="soil-ph"
                    type="number"
                    step="0.1"
                    min="0"
                    max="14"
                    value={ph}
                    onChange={(e) => setPh(e.target.value)}
                    placeholder="6.5"
                    className="text-sm mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="soil-depth" className="text-xs">Sample Depth (in)</Label>
                  <Input
                    id="soil-depth"
                    type="number"
                    step="1"
                    min="1"
                    max="48"
                    value={depthInches}
                    onChange={(e) => setDepthInches(e.target.value)}
                    placeholder="6"
                    className="text-sm mt-1"
                  />
                </div>
              </div>

              {/* Texture picker */}
              <div>
                <Label className="text-xs">Soil Texture</Label>
                <div className="grid grid-cols-3 gap-1.5 mt-1">
                  {TEXTURE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setTexture(texture === opt.value ? null : opt.value)}
                      className={cn(
                        'px-2 py-1.5 rounded-lg border text-left transition-all text-[11px]',
                        'hover:bg-muted/50 active:scale-[0.98]',
                        texture === opt.value
                          ? 'border-amber-500 bg-amber-50 dark:bg-amber-950 ring-1 ring-amber-500/20'
                          : 'border-border/50',
                      )}
                    >
                      <span className="font-medium block leading-tight">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Drainage */}
              <div>
                <Label className="text-xs">Drainage</Label>
                <div className="flex gap-1.5 mt-1">
                  {DRAINAGE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setDrainage(drainage === opt.value ? null : opt.value)}
                      className={cn(
                        'flex-1 px-2 py-1.5 rounded-lg border text-center transition-all text-[11px] font-medium',
                        'hover:bg-muted/50 active:scale-[0.98]',
                        drainage === opt.value
                          ? 'border-amber-500 bg-amber-50 dark:bg-amber-950 ring-1 ring-amber-500/20'
                          : 'border-border/50',
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Moisture */}
              <div>
                <Label className="text-xs">Current Moisture</Label>
                <div className="flex gap-1.5 mt-1 flex-wrap">
                  {MOISTURE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setMoisture(moisture === opt.value ? null : opt.value)}
                      className={cn(
                        'px-2.5 py-1.5 rounded-lg border transition-all text-[11px] font-medium',
                        'hover:bg-muted/50 active:scale-[0.98]',
                        moisture === opt.value
                          ? 'border-amber-500 bg-amber-50 dark:bg-amber-950 ring-1 ring-amber-500/20'
                          : 'border-border/50',
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 'nutrients' && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                If you have test results, select the N-P-K levels. Otherwise skip to notes.
              </p>

              {/* N-P-K selectors */}
              {[
                { key: 'nitrogen', label: 'Nitrogen (N)', value: nitrogen, setter: setNitrogen, icon: <Layers className="h-3.5 w-3.5" /> },
                { key: 'phosphorus', label: 'Phosphorus (P)', value: phosphorus, setter: setPhosphorus, icon: <Droplets className="h-3.5 w-3.5" /> },
                { key: 'potassium', label: 'Potassium (K)', value: potassium, setter: setPotassium, icon: <Thermometer className="h-3.5 w-3.5" /> },
              ].map(({ key, label: fieldLabel, value, setter, icon }) => (
                <div key={key}>
                  <Label className="text-xs flex items-center gap-1.5">{icon} {fieldLabel}</Label>
                  <div className="flex gap-1.5 mt-1">
                    {NPK_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setter(value === opt.value ? null : opt.value)}
                        className={cn(
                          'flex-1 px-2 py-1.5 rounded-lg border text-center transition-all text-[11px] font-medium',
                          'hover:bg-muted/50 active:scale-[0.98]',
                          value === opt.value
                            ? 'border-amber-500 bg-amber-50 dark:bg-amber-950 ring-1 ring-amber-500/20'
                            : 'border-border/50',
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="soil-om" className="text-xs">Organic Matter (%)</Label>
                  <Input
                    id="soil-om"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={organicMatter}
                    onChange={(e) => setOrganicMatter(e.target.value)}
                    placeholder="3.5"
                    className="text-sm mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="soil-color" className="text-xs">Soil Color</Label>
                  <Input
                    id="soil-color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    placeholder="Dark brown"
                    className="text-sm mt-1"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 'notes' && (
            <div className="space-y-3">
              <div>
                <Label htmlFor="soil-notes" className="text-xs">Notes</Label>
                <textarea
                  id="soil-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Observations: compaction, earthworm presence, smell, root depth, rocks..."
                  rows={4}
                  className="w-full text-sm mt-1 rounded-lg border border-border bg-background px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  autoFocus
                />
              </div>

              {/* Summary of what's been filled */}
              <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                <p className="text-xs font-medium text-foreground">Test Summary</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[11px] text-muted-foreground">
                  {ph && <span>pH: {ph}</span>}
                  {texture && <span>Texture: {TEXTURE_OPTIONS.find(t => t.value === texture)?.label}</span>}
                  {drainage && <span>Drainage: {drainage}</span>}
                  {moisture && <span>Moisture: {moisture}</span>}
                  {nitrogen && <span>N: {nitrogen}</span>}
                  {phosphorus && <span>P: {phosphorus}</span>}
                  {potassium && <span>K: {potassium}</span>}
                  {organicMatter && <span>OM: {organicMatter}%</span>}
                  {color && <span>Color: {color}</span>}
                  {depthInches && <span>Depth: {depthInches}in</span>}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer navigation */}
        <div className="p-3 border-t border-border/50 flex gap-2 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => {
              if (step === 'basics') handleCancel();
              else if (step === 'nutrients') setStep('basics');
              else if (step === 'notes') setStep('nutrients');
            }}
          >
            {step === 'basics' ? 'Cancel' : 'Back'}
          </Button>

          {step !== 'notes' ? (
            <Button
              size="sm"
              className="flex-1 gap-1.5"
              onClick={() => {
                if (step === 'basics') setStep('nutrients');
                else if (step === 'nutrients') setStep('notes');
              }}
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button
              size="sm"
              className="flex-1 gap-1.5 bg-amber-700 hover:bg-amber-800"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <TestTube2 className="h-4 w-4" />
                  Save Test
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
