'use client';

import { Badge } from '@/components/ui/badge';

interface SpeciesInfo {
  common_name: string;
  scientific_name: string;
  layer: string;
  is_native: number;
  count: number;
}

interface StoryWhatWeGrowProps {
  title: string;
  content: string;
  species: SpeciesInfo[];
  theme: string;
}

const LAYER_COLORS: Record<string, string> = {
  canopy: 'bg-green-800',
  understory: 'bg-green-600',
  shrub: 'bg-emerald-500',
  herbaceous: 'bg-lime-500',
  groundcover: 'bg-lime-400',
  vine: 'bg-teal-500',
  root: 'bg-amber-700',
  aquatic: 'bg-blue-500',
};

const LAYER_ORDER = ['canopy', 'understory', 'shrub', 'herbaceous', 'groundcover', 'vine', 'root', 'aquatic'];

export function StoryWhatWeGrow({ title, content, species, theme }: StoryWhatWeGrowProps) {
  // Group species by layer
  const byLayer = new Map<string, SpeciesInfo[]>();
  species.forEach(s => {
    const list = byLayer.get(s.layer) || [];
    list.push(s);
    byLayer.set(s.layer, list);
  });

  const sortedLayers = LAYER_ORDER.filter(l => byLayer.has(l));

  return (
    <section className="py-16 sm:py-20">
      <div className="max-w-4xl mx-auto px-6 sm:px-8">
        <h2 className="text-2xl sm:text-3xl font-serif font-bold mb-4">{title}</h2>
        {content && (
          <p className="text-muted-foreground text-lg mb-8 max-w-2xl">{content}</p>
        )}

        {sortedLayers.length > 0 && (
          <div className="space-y-6">
            {sortedLayers.map(layer => {
              const layerSpecies = byLayer.get(layer)!;
              return (
                <div key={layer}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-3 h-3 rounded-full ${LAYER_COLORS[layer] || 'bg-gray-400'}`} />
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                      {layer}
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {layerSpecies.map(s => (
                      <div
                        key={`${s.common_name}-${s.layer}`}
                        className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:shadow-sm transition-shadow"
                      >
                        <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${LAYER_COLORS[s.layer] || 'bg-gray-400'}`} />
                        <div className="min-w-0">
                          <div className="font-medium text-sm">{s.common_name}</div>
                          <div className="text-xs text-muted-foreground italic truncate">
                            {s.scientific_name}
                          </div>
                          <div className="flex items-center gap-1.5 mt-1">
                            {s.is_native ? (
                              <Badge variant="secondary" className="text-[10px] h-5 bg-green-100 text-green-800">
                                Native
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[10px] h-5">
                                Non-native
                              </Badge>
                            )}
                            {s.count > 1 && (
                              <span className="text-[10px] text-muted-foreground">{s.count} planted</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {sortedLayers.length === 0 && (
          <p className="text-muted-foreground italic">Species data coming soon</p>
        )}
      </div>
    </section>
  );
}
