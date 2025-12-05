"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Search, Leaf } from 'lucide-react';
import type { Species } from '@/lib/db/schema';
import { getGuildCompanions, groupSpeciesByLayer, LAYER_ORDER } from '@/lib/species/species-utils';

const FUNCTION_BADGE_STYLES: Record<string, string> = {
  nitrogen_fixer: 'bg-blue-100 text-blue-800 border-blue-300',
  pollinator_attractor: 'bg-purple-100 text-purple-800 border-purple-300',
  dynamic_accumulator: 'bg-green-100 text-green-800 border-green-300',
  pest_deterrent: 'bg-red-100 text-red-800 border-red-300',
  wildlife_habitat: 'bg-amber-100 text-amber-800 border-amber-300',
};

const FUNCTION_LABELS: Record<string, string> = {
  nitrogen_fixer: 'N-Fixer',
  pollinator_attractor: 'Pollinator',
  dynamic_accumulator: 'Accumulator',
  pest_deterrent: 'Pest Control',
  wildlife_habitat: 'Wildlife',
};

function FunctionBadges({ permacultureFunctions }: { permacultureFunctions: string | null }) {
  if (!permacultureFunctions) return null;

  try {
    const functions: string[] = JSON.parse(permacultureFunctions);
    // Show max 3 badges
    const displayFunctions = functions.slice(0, 3);

    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {displayFunctions.map((func: string) => (
          <Badge
            key={func}
            variant="outline"
            className={`text-xs px-2 py-0.5 ${FUNCTION_BADGE_STYLES[func] || 'bg-gray-100 text-gray-800'}`}
          >
            {FUNCTION_LABELS[func] || func.replace(/_/g, ' ')}
          </Badge>
        ))}
      </div>
    );
  } catch {
    return null;
  }
}

interface SpeciesPickerPanelProps {
  farmId: string;
  onSelectSpecies: (species: Species) => void;
  onClose: () => void;
  companionFilterFor?: string; // Common name of plant to show companions for
}

export function SpeciesPickerPanel({ farmId, onSelectSpecies, onClose, companionFilterFor }: SpeciesPickerPanelProps) {
  const [nativeSpecies, setNativeSpecies] = useState<{
    perfect_match: Species[];
    good_match: Species[];
  }>({ perfect_match: [], good_match: [] });
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'perfect' | 'good' | 'all'>('perfect');

  useEffect(() => {
    loadNativeSpecies();
  }, [farmId]);

  const loadNativeSpecies = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/farms/${farmId}/native-species`);
      const data = await response.json();
      setNativeSpecies({
        perfect_match: data.perfect_match || [],
        good_match: data.good_match || []
      });
    } catch (error) {
      console.error('Failed to load native species:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredSpecies = () => {
    let species: Species[] = [];

    if (activeTab === 'perfect') {
      species = nativeSpecies.perfect_match;
    } else if (activeTab === 'good') {
      species = nativeSpecies.good_match;
    } else {
      species = [...nativeSpecies.perfect_match, ...nativeSpecies.good_match];
    }

    // Filter by companion plants if requested (bidirectional)
    if (companionFilterFor) {
      // Find the focal plant species to get its companion list
      const focalPlantSpecies = species.find(s =>
        s.common_name.toLowerCase() === companionFilterFor.toLowerCase()
      );

      species = getGuildCompanions(
        companionFilterFor,
        focalPlantSpecies?.companion_plants || null,
        species
      );
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      species = species.filter(s =>
        s.common_name.toLowerCase().includes(query) ||
        s.scientific_name.toLowerCase().includes(query)
      );
    }

    return species;
  };

  const filteredSpecies = getFilteredSpecies();

  // Group by layer when showing companions
  const groupedByLayer = companionFilterFor
    ? groupSpeciesByLayer(filteredSpecies)
    : null;

  return (
    <div className="absolute top-4 right-4 z-20 w-96 max-h-[80vh] bg-card rounded-lg shadow-xl border border-border overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between bg-muted/50">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Leaf className="h-5 w-5 text-green-600" />
            <h3 className="font-semibold">
              {companionFilterFor ? 'Guild Companions' : 'Select a Plant'}
            </h3>
          </div>
          {companionFilterFor && (
            <p className="text-xs text-muted-foreground mt-1 truncate">
              Good partners for <span className="font-medium text-green-600">{companionFilterFor}</span>
            </p>
          )}
        </div>
        <Button
          onClick={onClose}
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 flex-shrink-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Search Bar */}
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search plants..."
            className="w-full pl-9 pr-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-background"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border bg-muted/30">
        <button
          onClick={() => setActiveTab('perfect')}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'perfect'
              ? 'border-b-2 border-green-600 text-green-600'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Perfect Match ({nativeSpecies.perfect_match.length})
        </button>
        <button
          onClick={() => setActiveTab('good')}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'good'
              ? 'border-b-2 border-green-600 text-green-600'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Good Match ({nativeSpecies.good_match.length})
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'all'
              ? 'border-b-2 border-green-600 text-green-600'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          All
        </button>
      </div>

      {/* Species List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">
            Loading plants...
          </div>
        ) : filteredSpecies.length === 0 ? (
          companionFilterFor ? (
            /* Empty state for no companions */
            <div className="text-center py-12 space-y-4">
              <div className="text-muted-foreground">
                No guild companions found for <span className="font-semibold">{companionFilterFor}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                This plant may work well on its own, or companion data needs to be added.
              </p>
              <Button
                onClick={onClose}
                variant="outline"
                size="sm"
              >
                Browse All Plants
              </Button>
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              {searchQuery ? 'No plants found matching your search.' : 'No plants available.'}
            </div>
          )
        ) : companionFilterFor && groupedByLayer ? (
          /* Layer-grouped view for companions */
          <div className="p-4">
            {LAYER_ORDER.map(layer => {
              const layerSpecies = groupedByLayer[layer];
              if (layerSpecies.length === 0) return null;

              return (
                <div key={layer} className="mb-6">
                  <h3 className="font-semibold text-sm text-muted-foreground mb-3 capitalize">
                    {layer} Layer ({layerSpecies.length})
                  </h3>
                  <div className="space-y-2">
                    {layerSpecies.map(s => (
                      <button
                        key={s.id}
                        onClick={() => onSelectSpecies(s)}
                        className="w-full text-left p-3 rounded-lg border hover:bg-accent transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">
                              {s.common_name}
                            </div>
                            <div className="text-xs text-muted-foreground italic truncate">
                              {s.scientific_name}
                            </div>
                            {s.is_native === 1 && (
                              <Badge variant="default" className="mt-1 text-xs bg-green-600">
                                Native
                              </Badge>
                            )}
                            <FunctionBadges permacultureFunctions={s.permaculture_functions} />
                          </div>
                          <Badge variant="secondary" className="text-xs capitalize shrink-0">
                            {s.layer}
                          </Badge>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Existing flat list view */
          <div className="p-2 space-y-1">
            {filteredSpecies.map((species) => (
              <button
                key={species.id}
                onClick={() => onSelectSpecies(species)}
                className="w-full p-3 rounded-md hover:bg-muted transition-colors text-left group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate group-hover:text-green-600 transition-colors">
                      {species.common_name}
                    </div>
                    <div className="text-xs text-muted-foreground italic truncate">
                      {species.scientific_name}
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {species.is_native === 1 && (
                        <Badge variant="default" className="bg-green-600 text-xs">
                          Native
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {species.layer}
                      </span>
                      {species.mature_height_ft && (
                        <span className="text-xs text-muted-foreground">
                          {species.mature_height_ft}ft
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer Hint */}
      <div className="p-3 border-t border-border bg-muted/30">
        <p className="text-xs text-muted-foreground text-center">
          Click a plant to select it, then click on the map to place it
        </p>
      </div>
    </div>
  );
}
