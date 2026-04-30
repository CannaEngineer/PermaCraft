// components/varieties/variety-selector.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Star, Award, ChevronRight, Plus, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { PlantVarietyWithSpecies } from '@/lib/db/schema';
import { VarietyDetailModal } from './variety-detail-modal';
import { cn } from '@/lib/utils';

interface VarietySelectorProps {
  speciesId: string;
  speciesName: string;
  /** Optional farm scope so user-created varieties for this farm appear too. */
  farmId?: string;
  onSelectVariety: (variety: PlantVarietyWithSpecies) => void;
  onSkip: () => void;
}

interface VarietyLevel {
  parentId: string | null;
  parentName: string | null;
}

/**
 * VarietySelector
 *
 * Lets the user pick a variety/cultivar, drill into nested sub-varieties, or
 * add a custom variety on the spot. The drill-down handles cases like
 * Chestnut → "Colossal" → user's own sub-selection within Colossal.
 */
export function VarietySelector({
  speciesId,
  speciesName,
  farmId,
  onSelectVariety,
  onSkip,
}: VarietySelectorProps) {
  // breadcrumb of parent ids — top of stack is the level we're currently
  // browsing. Empty stack = root (top-level varieties for the species).
  const [breadcrumb, setBreadcrumb] = useState<VarietyLevel[]>([
    { parentId: null, parentName: null },
  ]);
  const [varieties, setVarieties] = useState<PlantVarietyWithSpecies[]>([]);
  const [selectedVariety, setSelectedVariety] = useState<PlantVarietyWithSpecies | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoSkipped, setAutoSkipped] = useState(false);

  // Custom variety inline form
  const [customMode, setCustomMode] = useState(false);
  const [customName, setCustomName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const currentLevel = breadcrumb[breadcrumb.length - 1];

  const loadVarieties = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set(
        'parent_variety_id',
        currentLevel.parentId === null ? 'null' : currentLevel.parentId
      );
      if (farmId) params.set('farm_id', farmId);
      const response = await fetch(`/api/species/${speciesId}/varieties?${params.toString()}`);
      const data = await response.json();
      setVarieties(data.varieties || []);
    } catch (error) {
      console.error('Failed to load varieties:', error);
      setVarieties([]);
    } finally {
      setLoading(false);
    }
  }, [speciesId, farmId, currentLevel.parentId]);

  useEffect(() => {
    loadVarieties();
  }, [loadVarieties]);

  // Auto-skip only at the top level when there's nothing to choose from. Once
  // the user has drilled into a variety, an empty sub-variety list is normal
  // (most varieties have no children) — we don't bail back out.
  useEffect(() => {
    if (loading || autoSkipped) return;
    if (
      breadcrumb.length === 1 &&
      varieties.length === 0 &&
      !customMode
    ) {
      setAutoSkipped(true);
      onSkip();
    }
  }, [loading, varieties.length, breadcrumb.length, customMode, onSkip, autoSkipped]);

  const handleDrillIn = (variety: PlantVarietyWithSpecies) => {
    setBreadcrumb((prev) => [
      ...prev,
      { parentId: variety.id, parentName: variety.variety_name },
    ]);
  };

  const handleBack = () => {
    if (breadcrumb.length <= 1) return;
    setBreadcrumb((prev) => prev.slice(0, -1));
  };

  const handleCreateCustom = async () => {
    const trimmed = customName.trim();
    if (!trimmed) {
      setCreateError('Enter a name first.');
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      const response = await fetch(`/api/species/${speciesId}/varieties`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variety_name: trimmed,
          parent_variety_id: currentLevel.parentId,
          farm_id: farmId,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to add variety');
      }
      const data = await response.json();
      const created = data.variety as PlantVarietyWithSpecies;
      // Auto-select the newly-created variety so the user can place the plant.
      onSelectVariety({
        ...created,
        // Synthesize joined fields the API doesn't return on POST so the
        // downstream consumer (which expects PlantVarietyWithSpecies) is happy.
        species_common_name: speciesName,
        species_scientific_name: '',
        species_layer: '',
      });
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to add variety');
    } finally {
      setCreating(false);
    }
  };

  if (autoSkipped) return null;

  return (
    <div className="p-4 space-y-4">
      {/* Breadcrumb header */}
      <div>
        {breadcrumb.length > 1 && (
          <button
            onClick={handleBack}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-1"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to {breadcrumb[breadcrumb.length - 2].parentName || speciesName}
          </button>
        )}
        <h3 className="text-lg font-semibold">
          {currentLevel.parentName
            ? `Sub-varieties of ${currentLevel.parentName}`
            : `Choose a ${speciesName} variety`}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          {currentLevel.parentName
            ? 'Pick a more specific sub-variety, or use this one as-is.'
            : 'Pick a cultivar, drill into a variety to see its sub-types, or skip to use the general species.'}
        </p>
      </div>

      {/* Variety grid */}
      {loading ? (
        <div className="p-6 text-center text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
          Loading varieties...
        </div>
      ) : varieties.length === 0 ? (
        <div className="p-4 text-sm text-muted-foreground text-center bg-muted/30 rounded-lg">
          No {currentLevel.parentName ? 'sub-varieties' : 'varieties'} on file yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
          {varieties.map((variety) => {
            const hasAwards = !!variety.awards && (() => {
              try { return JSON.parse(variety.awards!).length > 0; } catch { return false; }
            })();

            return (
              <div
                key={variety.id}
                className="text-left p-3 bg-card border border-border rounded-lg hover:border-primary hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <button
                    onClick={() => setSelectedVariety(variety)}
                    className="flex-1 text-left min-w-0"
                  >
                    <div className="font-medium truncate">{variety.variety_name}</div>
                    <div className="flex items-center gap-2 mt-1">
                      {variety.variety_type && (
                        <div className="text-xs text-muted-foreground capitalize">
                          {variety.variety_type.replace('_', ' ')}
                        </div>
                      )}
                      {variety.is_custom === 1 && (
                        <span className="text-[10px] uppercase tracking-wide bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full">
                          Yours
                        </span>
                      )}
                    </div>
                  </button>

                  <div className="flex flex-col items-end gap-1">
                    {hasAwards && <Award className="h-4 w-4 text-yellow-600" />}
                    {variety.expert_rating && (
                      <div className="flex items-center gap-1 bg-primary/10 px-2 py-0.5 rounded-full">
                        <Star className="h-3 w-3 text-primary fill-primary" />
                        <span className="text-xs font-bold text-primary">
                          {variety.expert_rating}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {variety.description && (
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                    {variety.description}
                  </p>
                )}

                <button
                  onClick={() => handleDrillIn(variety)}
                  className="mt-2 flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  Sub-varieties <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Add custom variety inline */}
      {customMode ? (
        <div className="border border-border rounded-lg p-3 bg-muted/20 space-y-2">
          <div className="text-sm font-medium">
            New {currentLevel.parentName ? 'sub-variety' : 'variety'} of{' '}
            {currentLevel.parentName || speciesName}
          </div>
          <Input
            autoFocus
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="e.g., Colossal A1, Heritage strain..."
            disabled={creating}
            maxLength={120}
          />
          {createError && (
            <div className="text-xs text-red-600">{createError}</div>
          )}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => {
                setCustomMode(false);
                setCustomName('');
                setCreateError(null);
              }}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={handleCreateCustom}
              disabled={creating || !customName.trim()}
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add & use'}
            </Button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setCustomMode(true)}
          className={cn(
            'w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg',
            'border border-dashed border-border hover:border-primary hover:bg-primary/5',
            'text-sm text-muted-foreground hover:text-foreground transition-colors',
          )}
        >
          <Plus className="h-4 w-4" />
          Add my own {currentLevel.parentName ? 'sub-variety' : 'variety'}
        </button>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-3 border-t">
        <Button variant="outline" onClick={onSkip} className="flex-1">
          {currentLevel.parentName
            ? `Use ${currentLevel.parentName} as-is`
            : 'Skip (use general species)'}
        </Button>
      </div>

      {/* Detail modal */}
      {selectedVariety && (
        <VarietyDetailModal
          variety={selectedVariety}
          open={!!selectedVariety}
          onClose={() => setSelectedVariety(null)}
          onSelect={(v) => {
            onSelectVariety(v);
            setSelectedVariety(null);
          }}
        />
      )}
    </div>
  );
}
