'use client';

import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';

const LAYERS = [
  { value: 'canopy', label: 'Canopy', icon: '🌳', desc: 'Tall trees' },
  { value: 'understory', label: 'Understory', icon: '🌲', desc: 'Small trees' },
  { value: 'shrub', label: 'Shrub', icon: '🌿', desc: 'Bushes' },
  { value: 'herbaceous', label: 'Herbaceous', icon: '🌱', desc: 'Herbs' },
  { value: 'groundcover', label: 'Groundcover', icon: '🍃', desc: 'Low plants' },
  { value: 'vine', label: 'Vine', icon: '🌾', desc: 'Climbing' },
  { value: 'root', label: 'Root', icon: '🥕', desc: 'Root crops' },
  { value: 'aquatic', label: 'Aquatic', icon: '💧', desc: 'Water plants' },
];

const FUNCTIONS = [
  { value: 'nitrogen_fixer', label: 'Nitrogen Fixer', icon: '🌱' },
  { value: 'wildlife_habitat', label: 'Wildlife Habitat', icon: '🦋' },
  { value: 'edible_fruit', label: 'Edible Fruit', icon: '🍎' },
  { value: 'edible_nuts', label: 'Edible Nuts', icon: '🥜' },
  { value: 'pollinator_support', label: 'Pollinator Support', icon: '🐝' },
  { value: 'erosion_control', label: 'Erosion Control', icon: '🏔️' },
  { value: 'medicinal', label: 'Medicinal', icon: '💊' },
];

interface SpeciesFilterSidebarProps {
  nativeFilter: 'all' | 'native' | 'naturalized';
  onNativeFilterChange: (value: 'all' | 'native' | 'naturalized') => void;
  layerFilter: string[];
  onLayerFilterChange: (layers: string[]) => void;
  functionFilter: string[];
  onFunctionFilterChange: (functions: string[]) => void;
}

export function SpeciesFilterSidebar({
  nativeFilter,
  onNativeFilterChange,
  layerFilter,
  onLayerFilterChange,
  functionFilter,
  onFunctionFilterChange
}: SpeciesFilterSidebarProps) {
  const handleLayerToggle = (layer: string) => {
    if (layerFilter.includes(layer)) {
      onLayerFilterChange(layerFilter.filter(l => l !== layer));
    } else {
      onLayerFilterChange([...layerFilter, layer]);
    }
  };

  const handleFunctionToggle = (fn: string) => {
    if (functionFilter.includes(fn)) {
      onFunctionFilterChange(functionFilter.filter(f => f !== fn));
    } else {
      onFunctionFilterChange([...functionFilter, fn]);
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6 bg-card">
      {/* Native Status */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm">Native Status</h3>
          {nativeFilter !== 'all' && (
            <Badge variant="secondary" className="text-xs">
              1 active
            </Badge>
          )}
        </div>
        <RadioGroup value={nativeFilter} onValueChange={onNativeFilterChange}>
          <div className="space-y-2">
            <label
              htmlFor="all"
              className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                nativeFilter === 'all'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50 hover:bg-accent'
              }`}
            >
              <RadioGroupItem value="all" id="all" className="flex-shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-sm">All Plants</p>
                <p className="text-xs text-muted-foreground">No preference</p>
              </div>
            </label>

            <label
              htmlFor="native"
              className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                nativeFilter === 'native'
                  ? 'border-green-600 bg-green-500/5'
                  : 'border-border hover:border-green-600/50 hover:bg-accent'
              }`}
            >
              <RadioGroupItem value="native" id="native" className="flex-shrink-0" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm">Native Only</p>
                  <span className="text-lg">🌿</span>
                </div>
                <p className="text-xs text-muted-foreground">Indigenous species</p>
              </div>
            </label>

            <label
              htmlFor="naturalized"
              className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                nativeFilter === 'naturalized'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50 hover:bg-accent'
              }`}
            >
              <RadioGroupItem value="naturalized" id="naturalized" className="flex-shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-sm">Non-Native</p>
                <p className="text-xs text-muted-foreground">Introduced species</p>
              </div>
            </label>
          </div>
        </RadioGroup>
      </div>

      {/* Divider */}
      <div className="border-t" />

      {/* Layer Filter */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm">Plant Layer</h3>
          {layerFilter.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {layerFilter.length} active
            </Badge>
          )}
        </div>
        <div className="grid grid-cols-1 gap-2">
          {LAYERS.map(layer => {
            const isChecked = layerFilter.includes(layer.value);
            return (
              <label
                key={layer.value}
                htmlFor={`layer-${layer.value}`}
                className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  isChecked
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50 hover:bg-accent'
                }`}
              >
                <Checkbox
                  id={`layer-${layer.value}`}
                  checked={isChecked}
                  onCheckedChange={() => handleLayerToggle(layer.value)}
                  className="flex-shrink-0"
                />
                <span className="text-2xl">{layer.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm capitalize">{layer.label}</p>
                  <p className="text-xs text-muted-foreground">{layer.desc}</p>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t" />

      {/* Functions Filter */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm">Functions</h3>
          {functionFilter.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {functionFilter.length} active
            </Badge>
          )}
        </div>
        <div className="grid grid-cols-1 gap-2">
          {FUNCTIONS.map(fn => {
            const isChecked = functionFilter.includes(fn.value);
            return (
              <label
                key={fn.value}
                htmlFor={`fn-${fn.value}`}
                className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  isChecked
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50 hover:bg-accent'
                }`}
              >
                <Checkbox
                  id={`fn-${fn.value}`}
                  checked={isChecked}
                  onCheckedChange={() => handleFunctionToggle(fn.value)}
                  className="flex-shrink-0"
                />
                <span className="text-xl">{fn.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{fn.label}</p>
                </div>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}
