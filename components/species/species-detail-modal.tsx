'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Species } from '@/lib/db/schema';

interface SpeciesDetailModalProps {
  speciesId: string | null;
  onClose: () => void;
  onAddToFarm?: (species: Species) => void;
}

export function SpeciesDetailModal({ speciesId, onClose, onAddToFarm }: SpeciesDetailModalProps) {
  const [species, setSpecies] = useState<Species | null>(null);
  const [companions, setCompanions] = useState<Species[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (speciesId) {
      loadSpeciesDetail();
    }
  }, [speciesId]);

  const loadSpeciesDetail = async () => {
    if (!speciesId) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/species/${speciesId}`);
      const data = await response.json();
      setSpecies(data.species);
      setCompanions(data.companions || []);
    } catch (error) {
      console.error('Failed to load species detail:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!speciesId) return null;

  const functions = species?.permaculture_functions
    ? JSON.parse(species.permaculture_functions)
    : [];

  const edibleParts = species?.edible_parts
    ? JSON.parse(species.edible_parts)
    : {};

  return (
    <Dialog open={!!speciesId} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        {loading || !species ? (
          <div className="py-12 text-center">Loading...</div>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <DialogTitle className="text-2xl">{species.common_name}</DialogTitle>
                  <p className="text-muted-foreground italic">{species.scientific_name}</p>
                </div>
                {species.is_native === 1 && (
                  <Badge variant="default" className="bg-green-600">Native</Badge>
                )}
              </div>
            </DialogHeader>

            <div className="space-y-6">
              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <div className="text-sm text-muted-foreground">Layer</div>
                  <div className="font-medium capitalize">{species.layer}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Mature Size</div>
                  <div className="font-medium">
                    {species.mature_height_ft}ft H × {species.mature_width_ft}ft W
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Hardiness Zones</div>
                  <div className="font-medium">
                    {species.min_hardiness_zone}-{species.max_hardiness_zone}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Years to Maturity</div>
                  <div className="font-medium">{species.years_to_maturity || 'N/A'}</div>
                </div>
              </div>

              {/* Description */}
              {species.description && (
                <div>
                  <h3 className="font-semibold mb-2">Description</h3>
                  <p className="text-sm">{species.description}</p>
                </div>
              )}

              {/* Permaculture Functions */}
              {functions.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Permaculture Functions</h3>
                  <div className="flex flex-wrap gap-2">
                    {functions.map((fn: string) => (
                      <Badge key={fn} variant="secondary">
                        {fn.replace(/_/g, ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Zone Placement */}
              {species.zone_placement_notes && (
                <div>
                  <h3 className="font-semibold mb-2">Zone Placement</h3>
                  <p className="text-sm">{species.zone_placement_notes}</p>
                </div>
              )}

              {/* Edible Parts */}
              {Object.keys(edibleParts).length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Edible Parts</h3>
                  <ul className="text-sm space-y-1">
                    {Object.entries(edibleParts).map(([part, timing]) => (
                      <li key={part}>
                        <span className="font-medium capitalize">{part}:</span> {timing as string}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Companion Plants */}
              {companions.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Companion Plants</h3>
                  <div className="flex flex-wrap gap-2">
                    {companions.map(c => (
                      <Badge key={c.id} variant="outline">
                        {c.common_name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Sourcing */}
              {species.sourcing_notes && (
                <div>
                  <h3 className="font-semibold mb-2">Where to Source</h3>
                  <p className="text-sm">{species.sourcing_notes}</p>
                </div>
              )}

              {/* Action Button */}
              {onAddToFarm && (
                <Button
                  onClick={() => onAddToFarm(species)}
                  className="w-full"
                  size="lg"
                >
                  Add This Plant to My Farm
                </Button>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
