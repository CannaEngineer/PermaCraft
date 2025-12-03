"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      custom_name: customName.trim() || undefined,
      planted_year: plantedYear,
      zone_id: zoneId || undefined,
      notes: notes.trim() || undefined
    });
  };

  // Calculate position to keep form on screen
  const formStyle: React.CSSProperties = {
    position: 'fixed',
    left: `${position.x}px`,
    top: `${position.y}px`,
    transform: 'translate(-50%, -100%) translateY(-10px)', // Center horizontally, place above click
    zIndex: 1000
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-[999]"
        onClick={onCancel}
      />

      {/* Form */}
      <div style={formStyle} className="z-[1000]">
        <form
          onSubmit={handleSubmit}
          className="bg-card rounded-lg shadow-2xl border border-border w-80 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-3 bg-muted/50 border-b border-border flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-sm">{species.common_name}</h4>
              <p className="text-xs text-muted-foreground italic">{species.scientific_name}</p>
            </div>
            <Button
              type="button"
              onClick={onCancel}
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>

          {/* Form Fields */}
          <div className="p-4 space-y-3">
            {/* Custom Name */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Custom Name (optional)
              </label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder={`e.g., "Oak by shed"`}
                className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-background"
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
                className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-background"
              />
            </div>

            {/* Zone Association */}
            {zones.length > 0 && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Zone (optional)
                </label>
                <select
                  value={zoneId}
                  onChange={(e) => setZoneId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-background"
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
                Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes about this planting..."
                rows={2}
                className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-background resize-none"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="p-3 bg-muted/30 border-t border-border flex gap-2">
            <Button
              type="button"
              onClick={onCancel}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              Plant Here
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}
