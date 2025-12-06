'use client';

import { useMemo, useState } from 'react';
import { Leaf, Sprout, Droplets, Bug, Flower2, Zap, TreeDeciduous, Heart, MapPin, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer } from 'vaul';

interface PlantingWithSpecies {
  id: string;
  permaculture_functions?: string | null;
  species_id: string;
  common_name?: string;
  scientific_name?: string;
  layer?: string;
}

interface FarmVitalsProps {
  plantings: PlantingWithSpecies[];
  className?: string;
  compact?: boolean;
  onHighlightFunction?: (functionKey: string) => void;
  onGetRecommendations?: (vitalKey: string, vitalLabel: string, currentCount: number, plantList: PlantingWithSpecies[]) => void;
}

// Importance explanations for each vital
const VITAL_IMPORTANCE: Record<string, string> = {
  nitrogen_fixers: 'Nitrogen-fixing plants convert atmospheric nitrogen into soil nutrients, reducing the need for synthetic fertilizers. They improve soil fertility naturally, making them essential for sustainable food production and soil health.',
  pollinator_plants: 'Pollinator plants attract bees, butterflies, and beneficial insects that are crucial for fertilizing crops. Without pollinators, 75% of food crops would fail. They also support biodiversity and ecosystem resilience.',
  dynamic_accumulators: 'Deep-rooted plants that mine minerals from the subsoil and bring them to the surface through leaf drop. They act as natural nutrient pumps, making previously unavailable minerals accessible to shallow-rooted plants.',
  wildlife_habitat: 'Wildlife habitat plants provide shelter, nesting sites, and food for birds, beneficial insects, and animals. They create a balanced ecosystem that naturally controls pests and supports biodiversity.',
  edible_plants: 'Edible plants provide direct food production for humans. Diversifying edible species improves food security, nutrition, and resilience to crop failures while reducing dependence on external food systems.',
  medicinal: 'Medicinal plants offer natural healthcare options, from immune support to wound healing. Having medicinal plants on-site provides first-aid resources and reduces reliance on pharmaceutical interventions.',
  erosion_control: 'Erosion control plants stabilize soil with their root systems, preventing nutrient loss and land degradation. Critical for slopes, water edges, and bare ground where topsoil erosion threatens farm productivity.',
  water_management: 'Water management plants help regulate water flow, improve infiltration, and reduce runoff. They prevent flooding, recharge groundwater, and create microclimates that conserve moisture during dry periods.'
};

/**
 * Farm Vitals Dashboard
 *
 * Gamified ecological function tracker that shows the permaculture value
 * of plantings on the farm. Encourages biodiversity and functional stacking.
 *
 * Mobile-first design with drawer/modal for details that doesn't obscure the map.
 */
export function FarmVitals({ plantings, className = '', compact = false, onHighlightFunction, onGetRecommendations }: FarmVitalsProps) {
  const [selectedVital, setSelectedVital] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile on mount
  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Aggregate permaculture functions from all plantings
  const vitals = useMemo(() => {
    const functionCounts: Record<string, number> = {};
    const functionPlants: Record<string, PlantingWithSpecies[]> = {};

    plantings.forEach((planting) => {
      if (!planting.permaculture_functions) return;

      try {
        const functions: string[] = JSON.parse(planting.permaculture_functions);
        functions.forEach((fn) => {
          functionCounts[fn] = (functionCounts[fn] || 0) + 1;

          if (!functionPlants[fn]) {
            functionPlants[fn] = [];
          }
          functionPlants[fn].push(planting);
        });
      } catch (error) {
        console.error('Failed to parse permaculture_functions:', error);
      }
    });

    // Group functions into categories with icons and colors
    const categories = [
      {
        label: 'Nitrogen Fixers',
        key: 'nitrogen_fixers',
        icon: Sprout,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        hoverBg: 'hover:bg-green-100',
        count: (functionCounts['nitrogen_fixer'] || 0) + (functionCounts['nitrogen_fixing'] || 0),
        plants: [...(functionPlants['nitrogen_fixer'] || []), ...(functionPlants['nitrogen_fixing'] || [])],
        importance: 'high' as const,
        tooltip: 'Legumes that enrich soil with nitrogen',
      },
      {
        label: 'Pollinator Plants',
        key: 'pollinator_plants',
        icon: Bug,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        hoverBg: 'hover:bg-yellow-100',
        count: (functionCounts['pollinator_support'] || 0) + (functionCounts['pollinator'] || 0) + (functionCounts['pollinator_attractor'] || 0),
        plants: [...(functionPlants['pollinator_support'] || []), ...(functionPlants['pollinator'] || []), ...(functionPlants['pollinator_attractor'] || [])],
        importance: 'high' as const,
        tooltip: 'Attract bees, butterflies, and beneficial insects',
      },
      {
        label: 'Dynamic Accumulators',
        key: 'dynamic_accumulators',
        icon: Zap,
        color: 'text-purple-600',
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-200',
        hoverBg: 'hover:bg-purple-100',
        count: functionCounts['dynamic_accumulator'] || 0,
        plants: functionPlants['dynamic_accumulator'] || [],
        importance: 'medium' as const,
        tooltip: 'Deep-rooted plants that mine minerals from subsoil',
      },
      {
        label: 'Wildlife Habitat',
        key: 'wildlife_habitat',
        icon: TreeDeciduous,
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-50',
        borderColor: 'border-emerald-200',
        hoverBg: 'hover:bg-emerald-100',
        count: (functionCounts['wildlife_habitat'] || 0) + (functionCounts['wildlife_food'] || 0),
        plants: [...(functionPlants['wildlife_habitat'] || []), ...(functionPlants['wildlife_food'] || [])],
        importance: 'medium' as const,
        tooltip: 'Provides shelter and food for birds and animals',
      },
      {
        label: 'Edible Plants',
        key: 'edible_plants',
        icon: Leaf,
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        hoverBg: 'hover:bg-orange-100',
        count: (functionCounts['edible_fruit'] || 0) + (functionCounts['edible_nuts'] || 0) + (functionCounts['edible'] || 0),
        plants: [...(functionPlants['edible_fruit'] || []), ...(functionPlants['edible_nuts'] || []), ...(functionPlants['edible'] || [])],
        importance: 'high' as const,
        tooltip: 'Direct food production for humans',
      },
      {
        label: 'Medicinal',
        key: 'medicinal',
        icon: Heart,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        hoverBg: 'hover:bg-red-100',
        count: functionCounts['medicinal'] || 0,
        plants: functionPlants['medicinal'] || [],
        importance: 'low' as const,
        tooltip: 'Plants with healing properties',
      },
      {
        label: 'Erosion Control',
        key: 'erosion_control',
        icon: Flower2,
        color: 'text-amber-600',
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-200',
        hoverBg: 'hover:bg-amber-100',
        count: (functionCounts['erosion_control'] || 0) + (functionCounts['groundcover'] || 0),
        plants: [...(functionPlants['erosion_control'] || []), ...(functionPlants['groundcover'] || [])],
        importance: 'medium' as const,
        tooltip: 'Stabilizes soil on slopes and bare ground',
      },
      {
        label: 'Water Management',
        key: 'water_management',
        icon: Droplets,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        hoverBg: 'hover:bg-blue-100',
        count: (functionCounts['water_retention'] || 0) + (functionCounts['wetland'] || 0),
        plants: [...(functionPlants['water_retention'] || []), ...(functionPlants['wetland'] || [])],
        importance: 'low' as const,
        tooltip: 'Helps manage water flow and retention',
      },
    ];

    // Show all categories - users can learn about zero-count vitals too
    const displayCategories = categories;

    return {
      categories: displayCategories,
      totalPlantings: plantings.length,
      totalFunctions: Object.values(functionCounts).reduce((sum, count) => sum + count, 0),
    };
  }, [plantings]);

  if (plantings.length === 0) {
    return (
      <div className={`text-sm text-muted-foreground italic ${className}`}>
        No plantings yet - add plants to see farm vitals
      </div>
    );
  }

  if (compact) {
    // Compact view for farm cards
    const topThree = vitals.categories
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    return (
      <div className={`flex items-center gap-2 flex-wrap ${className}`}>
        {topThree.map((cat) => {
          const Icon = cat.icon;
          return (
            <div
              key={cat.label}
              className="flex items-center gap-1 text-xs"
              title={cat.tooltip}
            >
              <Icon className={`h-3 w-3 ${cat.color}`} />
              <span className="font-medium">{cat.count}</span>
            </div>
          );
        })}
        {vitals.totalPlantings > 0 && (
          <span className="text-xs text-muted-foreground">
            • {vitals.totalPlantings} plants
          </span>
        )}
      </div>
    );
  }

  // Find selected vital data
  const selectedVitalData = selectedVital
    ? vitals.categories.find(c => c.key === selectedVital)
    : null;

  // Detail content component
  const VitalDetailContent = selectedVitalData ? (() => {
    const cat = selectedVitalData;
    const Icon = cat.icon;
    const uniquePlants = Array.from(
      new Map(cat.plants.map(p => [p.id, p])).values()
    );

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-lg ${cat.bgColor} ${cat.borderColor} border`}>
            <Icon className={`h-6 w-6 ${cat.color}`} />
          </div>
          <div>
            <h3 className="font-semibold text-lg">{cat.label}</h3>
            <p className="text-sm text-muted-foreground">
              {cat.count} {cat.count === 1 ? 'plant' : 'plants'} providing this function
            </p>
          </div>
        </div>

        {/* Why It's Important */}
        <div className="p-4 bg-muted/50 rounded-lg border border-border">
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <span className="text-lg">💡</span> Why This Matters
          </h4>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {VITAL_IMPORTANCE[cat.key]}
          </p>
        </div>

        {/* Plant List or Empty State */}
        <div>
          {uniquePlants.length > 0 ? (
            <>
              <h4 className="text-sm font-semibold mb-3">
                Plants in this category ({uniquePlants.length}):
              </h4>
              <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto pr-2">
                {uniquePlants.map((plant) => (
                  <div
                    key={plant.id}
                    className="flex items-start gap-2 p-3 bg-muted/30 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                  >
                    <Leaf className={`h-4 w-4 ${cat.color} flex-shrink-0 mt-0.5`} />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm">
                        {plant.common_name || 'Unknown'}
                      </div>
                      {plant.scientific_name && (
                        <div className="text-xs text-muted-foreground italic">
                          {plant.scientific_name}
                        </div>
                      )}
                      {plant.layer && (
                        <div className="text-xs text-muted-foreground capitalize mt-0.5">
                          {plant.layer} layer
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <div className="flex items-start gap-2">
                <span className="text-2xl">🌱</span>
                <div>
                  <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-1">
                    No {cat.label} Yet
                  </h4>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    Consider adding plants to provide this important ecological function.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2">
          {/* Get AI Recommendations */}
          {onGetRecommendations && (
            <Button
              onClick={() => {
                onGetRecommendations(cat.key, cat.label, cat.count, uniquePlants);
                setSelectedVital(null);
              }}
              className="w-full"
              variant="default"
            >
              <span className="mr-2">🤖</span>
              {cat.count === 0
                ? `Get AI Recommendations for ${cat.label}`
                : `Get More ${cat.label} Recommendations`
              }
            </Button>
          )}

          {/* Highlight on Map - Only show if plants exist */}
          {onHighlightFunction && cat.count > 0 && (
            <Button
              onClick={() => {
                onHighlightFunction(cat.key);
                setSelectedVital(null);
              }}
              className="w-full"
              variant="outline"
            >
              <MapPin className="h-4 w-4 mr-2" />
              Highlight These {cat.count} Plants on Map
            </Button>
          )}
        </div>
      </div>
    );
  }) : null;

  // Full view for farm editor with drawer/modal for details
  return (
    <>
      <div className={`grid grid-cols-2 md:grid-cols-4 gap-3 ${className}`}>
        {vitals.categories.map((cat) => {
          const Icon = cat.icon;
          const isZero = cat.count === 0;

          return (
            <button
              key={cat.label}
              onClick={() => setSelectedVital(cat.key)}
              className={`rounded-lg border p-3 transition-all text-left cursor-pointer ${
                isZero
                  ? 'bg-muted/30 border-muted hover:bg-muted/50 hover:border-muted-foreground/20'
                  : `${cat.bgColor} ${cat.borderColor} ${cat.hoverBg} hover:shadow-md`
              }`}
              title={cat.tooltip}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`h-4 w-4 ${isZero ? 'text-muted-foreground' : cat.color}`} />
                <span className="text-xs font-medium text-muted-foreground">
                  {cat.label}
                </span>
              </div>
              <div className={`text-2xl font-bold tabular-nums ${isZero ? 'text-muted-foreground' : cat.color}`}>
                {cat.count}
              </div>
              <div className="text-xs mt-1">
                {cat.importance === 'high' && isZero ? (
                  <span className="text-amber-600">⚠️ Tap to learn why</span>
                ) : isZero ? (
                  <span className="text-muted-foreground">Tap to learn more</span>
                ) : (
                  <span className="text-muted-foreground">Tap for details</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Mobile: Drawer from bottom */}
      {isMobile && selectedVitalData && (
        <Drawer.Root open={!!selectedVital} onOpenChange={(open) => !open && setSelectedVital(null)}>
          <Drawer.Portal>
            <Drawer.Overlay className="fixed inset-0 bg-black/40 z-40" />
            <Drawer.Content className="bg-card flex flex-col rounded-t-xl h-[85vh] mt-24 fixed bottom-0 left-0 right-0 z-50">
              {/* Handle */}
              <div className="flex-shrink-0 p-4">
                <div className="mx-auto w-12 h-1.5 rounded-full bg-muted mb-4" />
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto px-4 pb-8">
                {VitalDetailContent && <VitalDetailContent />}
              </div>
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>
      )}

      {/* Desktop: Dialog/Modal */}
      {!isMobile && selectedVitalData && (
        <Dialog open={!!selectedVital} onOpenChange={(open) => !open && setSelectedVital(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="sr-only">{selectedVitalData.label} Details</DialogTitle>
            </DialogHeader>
            {VitalDetailContent && <VitalDetailContent />}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
