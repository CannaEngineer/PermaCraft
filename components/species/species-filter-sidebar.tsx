'use client';

import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';

const LAYERS = [
  'canopy',
  'understory',
  'shrub',
  'herbaceous',
  'groundcover',
  'vine',
  'root',
  'aquatic'
];

const FUNCTIONS = [
  'nitrogen_fixer',
  'wildlife_habitat',
  'edible_fruit',
  'edible_nuts',
  'pollinator_support',
  'erosion_control',
  'medicinal'
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
    <div className="space-y-6 p-4 border-r bg-card">
      <div>
        <h3 className="font-semibold mb-3">Native Status</h3>
        <RadioGroup value={nativeFilter} onValueChange={onNativeFilterChange}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="all" id="all" />
            <Label htmlFor="all">All Plants</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="native" id="native" />
            <Label htmlFor="native">Native Only</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="naturalized" id="naturalized" />
            <Label htmlFor="naturalized">Naturalized/Non-Native</Label>
          </div>
        </RadioGroup>
      </div>

      <div>
        <h3 className="font-semibold mb-3">Layer</h3>
        <div className="space-y-2">
          {LAYERS.map(layer => (
            <div key={layer} className="flex items-center space-x-2">
              <Checkbox
                id={`layer-${layer}`}
                checked={layerFilter.includes(layer)}
                onCheckedChange={() => handleLayerToggle(layer)}
              />
              <Label
                htmlFor={`layer-${layer}`}
                className="capitalize cursor-pointer"
              >
                {layer}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-semibold mb-3">Functions</h3>
        <div className="space-y-2">
          {FUNCTIONS.map(fn => (
            <div key={fn} className="flex items-center space-x-2">
              <Checkbox
                id={`fn-${fn}`}
                checked={functionFilter.includes(fn)}
                onCheckedChange={() => handleFunctionToggle(fn)}
              />
              <Label
                htmlFor={`fn-${fn}`}
                className="capitalize cursor-pointer text-sm"
              >
                {fn.replace(/_/g, ' ')}
              </Label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
