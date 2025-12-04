'use client';

import { useMemo } from 'react';
import { Leaf, Sprout, Droplets, Bug, Flower2, Zap, TreeDeciduous, Heart } from 'lucide-react';

interface PlantingWithSpecies {
  id: string;
  permaculture_functions?: string | null;
  species_id: string;
  common_name?: string;
}

interface FarmVitalsProps {
  plantings: PlantingWithSpecies[];
  className?: string;
  compact?: boolean;
}

/**
 * Farm Vitals Dashboard
 *
 * Gamified ecological function tracker that shows the permaculture value
 * of plantings on the farm. Encourages biodiversity and functional stacking.
 *
 * Key functions tracked:
 * - Nitrogen Fixers: Legumes that improve soil
 * - Pollinator Support: Plants that attract beneficial insects
 * - Dynamic Accumulators: Deep-rooted plants that mine minerals
 * - Wildlife Habitat: Shelter and food for fauna
 * - Edible Production: Food crops
 * - Medicinal Plants: Healthcare plants
 * - Erosion Control: Soil stabilizers
 * - Water Management: Plants that help with hydrology
 */
export function FarmVitals({ plantings, className = '', compact = false }: FarmVitalsProps) {
  // Aggregate permaculture functions from all plantings
  const vitals = useMemo(() => {
    const functionCounts: Record<string, number> = {};
    const functionDetails: Record<string, Set<string>> = {};

    plantings.forEach((planting) => {
      if (!planting.permaculture_functions) return;

      try {
        const functions: string[] = JSON.parse(planting.permaculture_functions);
        functions.forEach((fn) => {
          functionCounts[fn] = (functionCounts[fn] || 0) + 1;

          if (!functionDetails[fn]) {
            functionDetails[fn] = new Set();
          }
          functionDetails[fn].add(planting.common_name || planting.species_id);
        });
      } catch (error) {
        console.error('Failed to parse permaculture_functions:', error);
      }
    });

    // Group functions into categories with icons and colors
    const categories = [
      {
        label: 'Nitrogen Fixers',
        icon: Sprout,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        count: (functionCounts['nitrogen_fixer'] || 0) + (functionCounts['nitrogen_fixing'] || 0),
        importance: 'high',
        tooltip: 'Legumes that enrich soil with nitrogen',
      },
      {
        label: 'Pollinator Plants',
        icon: Bug,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        count: (functionCounts['pollinator_support'] || 0) + (functionCounts['pollinator'] || 0),
        importance: 'high',
        tooltip: 'Attract bees, butterflies, and beneficial insects',
      },
      {
        label: 'Dynamic Accumulators',
        icon: Zap,
        color: 'text-purple-600',
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-200',
        count: functionCounts['dynamic_accumulator'] || 0,
        importance: 'medium',
        tooltip: 'Deep-rooted plants that mine minerals from subsoil',
      },
      {
        label: 'Wildlife Habitat',
        icon: TreeDeciduous,
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-50',
        borderColor: 'border-emerald-200',
        count: (functionCounts['wildlife_habitat'] || 0) + (functionCounts['wildlife_food'] || 0),
        importance: 'medium',
        tooltip: 'Provides shelter and food for birds and animals',
      },
      {
        label: 'Edible Plants',
        icon: Leaf,
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        count: (functionCounts['edible_fruit'] || 0) + (functionCounts['edible_nuts'] || 0) + (functionCounts['edible'] || 0),
        importance: 'high',
        tooltip: 'Direct food production for humans',
      },
      {
        label: 'Medicinal',
        icon: Heart,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        count: functionCounts['medicinal'] || 0,
        importance: 'low',
        tooltip: 'Plants with healing properties',
      },
      {
        label: 'Erosion Control',
        icon: Flower2,
        color: 'text-amber-600',
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-200',
        count: (functionCounts['erosion_control'] || 0) + (functionCounts['groundcover'] || 0),
        importance: 'medium',
        tooltip: 'Stabilizes soil on slopes and bare ground',
      },
      {
        label: 'Water Management',
        icon: Droplets,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        count: (functionCounts['water_retention'] || 0) + (functionCounts['wetland'] || 0),
        importance: 'low',
        tooltip: 'Helps manage water flow and retention',
      },
    ];

    // Filter to only show categories with counts > 0 or high importance
    const displayCategories = categories.filter(cat =>
      cat.count > 0 || cat.importance === 'high'
    );

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

  // Full view for farm editor
  return (
    <div className={`grid grid-cols-2 md:grid-cols-4 gap-3 ${className}`}>
      {vitals.categories.map((cat) => {
        const Icon = cat.icon;
        const isZero = cat.count === 0;

        return (
          <div
            key={cat.label}
            className={`rounded-lg border p-3 transition-all ${
              isZero
                ? 'bg-muted/30 border-muted opacity-60'
                : `${cat.bgColor} ${cat.borderColor} hover:shadow-md`
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
            {cat.importance === 'high' && isZero && (
              <div className="text-xs text-amber-600 mt-1">
                ⚠️ Consider adding
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
