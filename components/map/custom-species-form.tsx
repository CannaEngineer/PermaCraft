'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sprout, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Species } from '@/lib/db/schema';

const LAYER_OPTIONS: Array<{ value: string; label: string; hint: string }> = [
  { value: 'canopy', label: 'Canopy', hint: 'Tall trees (>30 ft)' },
  { value: 'understory', label: 'Understory', hint: 'Smaller trees' },
  { value: 'shrub', label: 'Shrub', hint: 'Bushes / berries' },
  { value: 'herbaceous', label: 'Herbaceous', hint: 'Soft-stem plants' },
  { value: 'groundcover', label: 'Groundcover', hint: 'Low-growing' },
  { value: 'vine', label: 'Vine', hint: 'Climbing plants' },
  { value: 'root', label: 'Root', hint: 'Tubers / bulbs' },
  { value: 'aquatic', label: 'Aquatic', hint: 'Water plants' },
];

interface CustomSpeciesFormProps {
  farmId: string;
  onCreated: (species: Species) => void;
  onCancel: () => void;
}

export function CustomSpeciesForm({ farmId, onCreated, onCancel }: CustomSpeciesFormProps) {
  const [commonName, setCommonName] = useState('');
  const [scientificName, setScientificName] = useState('');
  const [layer, setLayer] = useState('shrub');
  const [description, setDescription] = useState('');
  const [isNative, setIsNative] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!commonName.trim()) {
      setError('Please enter a common name.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const response = await fetch(`/api/farms/${farmId}/custom-species`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          common_name: commonName.trim(),
          scientific_name: scientificName.trim() || undefined,
          layer,
          description: description.trim() || undefined,
          is_native: isNative,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to create custom plant');
      }
      const data = await response.json();
      onCreated(data.species as Species);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create custom plant');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={submitting ? undefined : onCancel}
      />
      <div className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-5 pt-5 pb-3 border-b border-border/60 bg-muted/30 flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Sprout className="h-5 w-5 text-green-600" />
            <div>
              <h3 className="font-semibold">Add a custom plant</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Saved to this farm so you can place it.
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            disabled={submitting}
            className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors disabled:opacity-50"
            aria-label="Cancel"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Common name <span className="text-red-500">*</span>
            </label>
            <Input
              value={commonName}
              onChange={(e) => setCommonName(e.target.value)}
              placeholder="e.g., Heritage Persimmon"
              autoFocus
              maxLength={120}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Scientific name (optional)
            </label>
            <Input
              value={scientificName}
              onChange={(e) => setScientificName(e.target.value)}
              placeholder="e.g., Diospyros virginiana"
              maxLength={160}
              className="italic"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">
              Plant layer <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {LAYER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setLayer(opt.value)}
                  className={cn(
                    'text-left px-3 py-2 rounded-lg border transition-colors',
                    layer === opt.value
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                      : 'border-border hover:bg-muted/50'
                  )}
                >
                  <div className="text-sm font-medium">{opt.label}</div>
                  <div className="text-[11px] text-muted-foreground">{opt.hint}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Notes (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Anything you want to remember — variety origin, traits, source nursery..."
              rows={3}
              maxLength={1000}
              className="w-full text-sm border border-border rounded-md bg-background p-2 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isNative}
              onChange={(e) => setIsNative(e.target.checked)}
              className="h-4 w-4 rounded border-border accent-green-600"
            />
            <span>Native to my region</span>
          </label>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-border bg-muted/20 flex gap-2">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={submitting}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !commonName.trim()}
            className="flex-1 bg-green-600 hover:bg-green-700 gap-1.5"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add plant'}
          </Button>
        </div>
      </div>
    </div>
  );
}
