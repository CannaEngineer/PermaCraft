import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import type { Species } from '@/lib/db/schema';

interface SpeciesCardProps {
  species: Species;
  onClick?: () => void;
}

export function SpeciesCard({ species, onClick }: SpeciesCardProps) {
  const regions = species.broad_regions
    ? JSON.parse(species.broad_regions).join(', ')
    : 'Various';

  const functions = species.permaculture_functions
    ? JSON.parse(species.permaculture_functions)
    : [];

  return (
    <Card
      className="hover:shadow-lg transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold text-base leading-tight">
              {species.common_name}
            </h3>
            <p className="text-sm text-muted-foreground italic">
              {species.scientific_name}
            </p>
          </div>
          {species.is_native === 1 && (
            <Badge variant="default" className="bg-green-600 shrink-0">
              Native
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          <div>
            <span className="font-medium">Layer:</span>{' '}
            <span className="capitalize">{species.layer}</span>
          </div>
          <div>
            <span className="font-medium">Zones:</span>{' '}
            {species.min_hardiness_zone && species.max_hardiness_zone
              ? `${species.min_hardiness_zone}-${species.max_hardiness_zone}`
              : 'Not specified'}
          </div>
          <div>
            <span className="font-medium">Regions:</span>{' '}
            {regions}
          </div>
          {functions.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {functions.slice(0, 3).map((fn: string) => (
                <Badge key={fn} variant="outline" className="text-xs">
                  {fn.replace(/_/g, ' ')}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
