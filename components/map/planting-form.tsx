"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, ChevronDown, Leaf } from 'lucide-react';
import type { Species, Zone } from '@/lib/db/schema';

interface PlantingFormProps {
  species: Species;
  position: { x: number; y: number }; // Screen coordinates
  zones: Zone[];
  onSubmit: (data: {
    custom_name?: string;
    planted_year: number;
    zone_id?: string;
    notes?: string;
  }) => void;
  onCancel: () => void;
}

export function PlantingForm({ species, position, zones, onSubmit, onCancel }: PlantingFormProps) {
  const currentYear = new Date().getFullYear();
  const [customName, setCustomName] = useState('');
  const [plantedYear, setPlantedYear] = useState(currentYear);
  const [zoneId, setZoneId] = useState('');
  const [notes, setNotes] = useState('');
  const [showDetails, setShowDetails] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      custom_name: customName.trim() || undefined,
      planted_year: plantedYear,
      zone_id: zoneId || undefined,
      notes: notes.trim() || undefined
    });
  };

  // Quick plant - submit immediately with defaults
  const handleQuickPlant = () => {
    onSubmit({
      planted_year: currentYear,
    });
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-[60]"
        onClick={onCancel}
      />

      {/* Form - Side-anchored panel (left on desktop, bottom on mobile) */}
      <div className="fixed inset-y-0 left-0 z-[65] w-[340px] max-w-[90vw] max-md:inset-x-0 max-md:inset-y-auto max-md:bottom-0 max-md:w-full max-md:max-h-[70dvh] animate-in slide-in-from-left duration-200 max-md:slide-in-from-bottom max-md:pb-[env(safe-area-inset-bottom)]">
        <form
          onSubmit={handleSubmit}
          className="bg-card rounded-lg shadow-2xl border border-border h-full overflow-hidden flex flex-col max-md:rounded-t-2xl max-md:rounded-b-none"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header with species info */}
          <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-b border-border">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                  <Leaf className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">{species.common_name}</h4>
                  <p className="text-xs text-muted-foreground italic">{species.scientific_name}</p>
                </div>
              </div>
              <Button
                type="button"
                onClick={onCancel}
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 -mr-1 -mt-1"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Quick Plant Button - Primary Action */}
          <div className="p-4 pb-2">
            <Button
              type="button"
              onClick={handleQuickPlant}
              size="lg"
              className="w-full h-12 bg-green-600 hover:bg-green-700 text-white text-base font-semibold rounded-xl shadow-md shadow-green-600/20"
            >
              Plant Here
            </Button>
          </div>

          {/* Optional details toggle */}
          <div className="px-4 pb-2">
            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
            >
              <ChevronDown className={`h-3 w-3 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
              {showDetails ? 'Hide details' : 'Add name, notes, or zone...'}
            </button>
          </div>

          {/* Collapsible Detail Fields */}
          {showDetails && (
            <div className="flex-1 overflow-y-auto px-4 pb-3 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
              {/* Custom Name */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Custom Name
                </label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder={`e.g., "Oak by shed"`}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-background"
                />
              </div>

              {/* Planted Year */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Planted Year
                </label>
                <input
                  type="number"
                  value={plantedYear}
                  onChange={(e) => setPlantedYear(parseInt(e.target.value) || currentYear)}
                  min={1900}
                  max={currentYear}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-background"
                />
              </div>

              {/* Zone Association */}
              {zones.length > 0 && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Zone
                  </label>
                  <select
                    value={zoneId}
                    onChange={(e) => setZoneId(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-background"
                  >
                    <option value="">None</option>
                    {zones.map((zone) => (
                      <option key={zone.id} value={zone.id}>
                        {zone.name || `Zone ${zone.id.slice(0, 8)}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Care notes, observations..."
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-background resize-none"
                />
              </div>

              {/* Save with details button */}
              <Button
                type="submit"
                size="default"
                className="w-full h-10 bg-green-600 hover:bg-green-700 rounded-xl"
              >
                Plant with Details
              </Button>
            </div>
          )}

          {/* Keyboard hint on desktop */}
          {!showDetails && (
            <div className="px-4 pb-3">
              <p className="text-[10px] text-muted-foreground text-center">
                Click &quot;Plant Here&quot; for quick placement, or add optional details below
              </p>
            </div>
          )}
        </form>
      </div>
    </>
  );
}
