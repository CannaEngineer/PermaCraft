import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import type { Species } from '@/lib/db/schema';
import { Leaf, MapPin, Layers, Droplets, Sun } from 'lucide-react';

interface SpeciesCardProps {
  species: Species;
  onClick?: () => void;
}

const layerIcons: Record<string, any> = {
  canopy: '🌳',
  understory: '🌲',
  shrub: '🌿',
  herbaceous: '🌱',
  groundcover: '🍃',
  vine: '🌾',
  root: '🥕',
  aquatic: '💧',
};

const getLayerColor = (layer: string) => {
  const colors: Record<string, string> = {
    canopy: 'bg-green-700/10 text-green-700 border-green-200',
    understory: 'bg-green-600/10 text-green-600 border-green-200',
    shrub: 'bg-green-500/10 text-green-500 border-green-200',
    herbaceous: 'bg-green-400/10 text-green-400 border-green-200',
    groundcover: 'bg-lime-500/10 text-lime-600 border-lime-200',
    vine: 'bg-amber-500/10 text-amber-600 border-amber-200',
    root: 'bg-orange-500/10 text-orange-600 border-orange-200',
    aquatic: 'bg-blue-500/10 text-blue-600 border-blue-200',
  };
  return colors[layer] || 'bg-gray-500/10 text-gray-600 border-gray-200';
};

export function SpeciesCard({ species, onClick }: SpeciesCardProps) {
  const regions = species.broad_regions
    ? JSON.parse(species.broad_regions).slice(0, 2)
    : [];

  const functions = species.permaculture_functions
    ? JSON.parse(species.permaculture_functions).slice(0, 3)
    : [];

  const layerIcon = layerIcons[species.layer] || '🌱';
  const layerColorClass = getLayerColor(species.layer);

  return (
    <Card
      className="group hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden border-2 hover:border-primary/50 hover:scale-[1.02]"
      onClick={onClick}
    >
      {/* Header - COMPACT: no emoji, reduced height */}
      <div className={`h-16 relative ${layerColorClass} border-b`}>
        {/* Remove gradient overlay */}
        {/* Remove large emoji icon */}

        <div className="absolute top-2 right-2">
          {species.is_native === 1 ? (
            <Badge className="bg-green-600 hover:bg-green-700 text-xs px-2 py-0.5">
              Native  {/* NO EMOJI */}
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-xs px-2 py-0.5">
              Naturalized
            </Badge>
          )}
        </div>
      </div>

      <CardHeader className="pb-2 pt-2">  {/* Reduced from pb-3 pt-4 */}
        <div className="space-y-0.5">      {/* Reduced from space-y-1 */}
          <h3 className="font-bold text-sm leading-tight line-clamp-2 group-hover:text-primary transition-colors">
            {species.common_name}
          </h3>
          <p className="text-xs text-muted-foreground italic line-clamp-1">
            {species.scientific_name}
          </p>
        </div>
      </CardHeader>

      <CardContent className="space-y-2 py-3">  {/* Reduced from space-y-3 */}
        {/* Layer Badge */}
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={`text-xs capitalize ${layerColorClass}`}>
            <Layers className="w-3 h-3 mr-1" />
            {species.layer}
          </Badge>
        </div>

        {/* Key Info Grid */}
        <div className="grid grid-cols-2 gap-1.5 text-xs">  {/* Reduced from gap-2 */}
          {/* Hardiness Zones */}
          {species.min_hardiness_zone && species.max_hardiness_zone && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">
                Zones {species.min_hardiness_zone}-{species.max_hardiness_zone}
              </span>
            </div>
          )}

          {/* Sun Requirements */}
          {species.sun_requirements && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Sun className="w-3 h-3 flex-shrink-0" />
              <span className="truncate capitalize">
                {species.sun_requirements}
              </span>
            </div>
          )}

          {/* Water Requirements */}
          {species.water_requirements && (
            <div className="flex items-center gap-1 text-muted-foreground col-span-2">
              <Droplets className="w-3 h-3 flex-shrink-0" />
              <span className="truncate capitalize">
                {species.water_requirements}
              </span>
            </div>
          )}
        </div>

        {/* Regions */}
        {regions.length > 0 && (
          <div className="flex flex-wrap gap-1">  {/* Already gap-1, good */}
            {regions.map((region: string) => (
              <Badge key={region} variant="outline" className="text-xs px-1.5 py-0 bg-muted/50">
                {region}
              </Badge>
            ))}
          </div>
        )}

        {/* Functions */}
        {functions.length > 0 && (
          <div className="pt-1.5 border-t">  {/* Reduced from pt-2 */}
            <div className="flex flex-wrap gap-1">  {/* Already gap-1, good */}
              {functions.map((fn: string) => (
                <Badge
                  key={fn}
                  variant="secondary"
                  className="text-xs px-1.5 py-0 bg-primary/5 text-primary border-primary/20"
                >
                  {fn.replace(/_/g, ' ')}
                </Badge>
              ))}
            </div>
          </div>
        )}

      </CardContent>
    </Card>
  );
}
