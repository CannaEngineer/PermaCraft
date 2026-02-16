// components/varieties/variety-selector.tsx
'use client';

import { useState, useEffect } from 'react';
import { Star, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { PlantVarietyWithSpecies } from '@/lib/db/schema';
import { VarietyDetailModal } from './variety-detail-modal';

interface VarietySelectorProps {
  speciesId: string;
  speciesName: string;
  onSelectVariety: (variety: PlantVarietyWithSpecies) => void;
  onSkip: () => void;
}

export function VarietySelector({
  speciesId,
  speciesName,
  onSelectVariety,
  onSkip
}: VarietySelectorProps) {
  const [varieties, setVarieties] = useState<PlantVarietyWithSpecies[]>([]);
  const [selectedVariety, setSelectedVariety] = useState<PlantVarietyWithSpecies | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVarieties();
  }, [speciesId]);

  const loadVarieties = async () => {
    try {
      const response = await fetch(`/api/species/${speciesId}/varieties`);
      const data = await response.json();
      setVarieties(data.varieties || []);
    } catch (error) {
      console.error('Failed to load varieties:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-4 text-center text-sm text-muted-foreground">Loading varieties...</div>;
  }

  if (varieties.length === 0) {
    // No varieties available, auto-skip
    onSkip();
    return null;
  }

  return (
    <div className="p-4 space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Choose a {speciesName} Variety</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Select a specific cultivar or skip to use general species
        </p>
      </div>

      {/* Variety grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
        {varieties.map(variety => {
          const hasAwards = variety.awards && JSON.parse(variety.awards).length > 0;

          return (
            <button
              key={variety.id}
              onClick={() => setSelectedVariety(variety)}
              className="text-left p-3 bg-card border border-border rounded-lg hover:border-primary hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="font-medium">{variety.variety_name}</div>
                  {variety.variety_type && (
                    <div className="text-xs text-muted-foreground capitalize mt-1">
                      {variety.variety_type.replace('_', ' ')}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {hasAwards && (
                    <Award className="h-4 w-4 text-yellow-600" />
                  )}
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
            </button>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-3 border-t">
        <Button variant="outline" onClick={onSkip} className="flex-1">
          Skip (Use General Species)
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
