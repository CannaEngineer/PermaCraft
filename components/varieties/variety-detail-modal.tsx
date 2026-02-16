// components/varieties/variety-detail-modal.tsx
'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Award, Star, TrendingUp, DollarSign, MapPin, Calendar } from 'lucide-react';
import type { PlantVarietyWithSpecies } from '@/lib/db/schema';
import { cn } from '@/lib/utils';

interface VarietyDetailModalProps {
  variety: PlantVarietyWithSpecies;
  open: boolean;
  onClose: () => void;
  onSelect?: (variety: PlantVarietyWithSpecies) => void;
}

export function VarietyDetailModal({
  variety,
  open,
  onClose,
  onSelect
}: VarietyDetailModalProps) {
  // Parse JSON fields
  const characteristics = variety.elite_characteristics
    ? JSON.parse(variety.elite_characteristics)
    : {};

  const awards = variety.awards
    ? JSON.parse(variety.awards)
    : [];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-2xl">
                {variety.species_common_name} '{variety.variety_name}'
              </DialogTitle>
              <p className="text-sm text-muted-foreground italic mt-1">
                {variety.species_scientific_name}
              </p>
            </div>

            {variety.expert_rating && (
              <div className="flex items-center gap-1 bg-primary/10 px-3 py-1.5 rounded-full">
                <Star className="h-4 w-4 text-primary fill-primary" />
                <span className="font-bold text-primary">
                  {variety.expert_rating}/10
                </span>
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Image */}
          {variety.image_url && (
            <div className="aspect-video rounded-lg overflow-hidden bg-muted">
              <img
                src={variety.image_url}
                alt={variety.variety_name}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Type & breeding info */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="capitalize">
              {variety.variety_type.replace('_', ' ')}
            </Badge>
            {variety.breeding_program && (
              <Badge variant="outline">
                {variety.breeding_program}
              </Badge>
            )}
            {variety.introduction_year && (
              <Badge variant="outline">
                <Calendar className="h-3 w-3 mr-1" />
                Introduced {variety.introduction_year}
              </Badge>
            )}
          </div>

          {/* Description */}
          {variety.description && (
            <div>
              <h3 className="text-sm font-semibold mb-2">Description</h3>
              <p className="text-sm text-muted-foreground">{variety.description}</p>
            </div>
          )}

          {/* Elite characteristics */}
          {Object.keys(characteristics).length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Elite Characteristics
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(characteristics).map(([key, value]) => (
                  <div key={key} className="bg-muted/50 rounded-lg p-3">
                    <div className="text-xs text-muted-foreground capitalize">
                      {key.replace(/_/g, ' ')}
                    </div>
                    <div className="text-sm font-medium mt-1">
                      {Array.isArray(value) ? value.join(', ') : String(value)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Awards */}
          {awards.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Award className="h-4 w-4 text-yellow-600" />
                Awards & Recognition
              </h3>
              <div className="space-y-2">
                {awards.map((award: any, i: number) => (
                  <div key={i} className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                    <div className="font-medium text-sm">{award.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {award.organization} • {award.year}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Flavor notes (for edibles) */}
          {variety.flavor_notes && (
            <div>
              <h3 className="text-sm font-semibold mb-2">Flavor Profile</h3>
              <p className="text-sm text-muted-foreground">{variety.flavor_notes}</p>
            </div>
          )}

          {/* Hardiness & performance */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            {variety.hardiness_zone_min && variety.hardiness_zone_max && (
              <div>
                <div className="text-muted-foreground">Hardiness Zones</div>
                <div className="font-medium">
                  {variety.hardiness_zone_min} - {variety.hardiness_zone_max}
                </div>
              </div>
            )}

            {variety.yield_rating && (
              <div>
                <div className="text-muted-foreground">Yield</div>
                <div className="font-medium capitalize">{variety.yield_rating}</div>
              </div>
            )}

            {variety.chill_hours_required && (
              <div>
                <div className="text-muted-foreground">Chill Hours</div>
                <div className="font-medium">{variety.chill_hours_required} hours</div>
              </div>
            )}

            {variety.availability && (
              <div>
                <div className="text-muted-foreground">Availability</div>
                <div className="font-medium capitalize">{variety.availability}</div>
              </div>
            )}
          </div>

          {/* Sourcing */}
          {variety.sourcing_notes && (
            <div>
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Where to Buy
              </h3>
              <p className="text-sm text-muted-foreground">{variety.sourcing_notes}</p>
              {variety.average_price_usd && (
                <div className="mt-2 flex items-center gap-2 text-sm">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span>Typical price: ${variety.average_price_usd}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Close
          </Button>
          {onSelect && (
            <Button onClick={() => onSelect(variety)} className="flex-1">
              Select This Variety
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
