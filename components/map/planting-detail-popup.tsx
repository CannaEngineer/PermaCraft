"use client";

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Trash2, Calendar, MapPin, Users, BookOpen, Crosshair } from 'lucide-react';
import { formatAccuracy, classifyAccuracy } from '@/lib/gps';

interface PlantingDetailPopupProps {
  planting: {
    id: string;
    species_id: string;
    common_name: string;
    scientific_name: string;
    layer: string;
    mature_width_ft?: number;
    mature_height_ft?: number;
    years_to_maturity?: number;
    planted_year: number;
    current_year: number;
    name?: string;
    notes?: string;
    zone_id?: string;
    lat: number;
    lng: number;
    // Variety + GPS provenance (added in migration 106). Optional because old
    // plantings predate these fields; fields gracefully hide when absent.
    variety_id?: string | null;
    variety_name?: string | null;
    parent_variety_name?: string | null;
    placement_method?: 'gps' | 'map_click' | 'manual' | 'imported' | null;
    placement_accuracy_meters?: number | null;
    placement_altitude_meters?: number | null;
    species_is_custom?: number | null;
  };
  onClose: () => void;
  onDelete?: (plantingId: string) => void;
  onShowCompanions?: (plantingCommonName: string) => void;
}

export function PlantingDetailPopup({ planting, onClose, onDelete, onShowCompanions }: PlantingDetailPopupProps) {
  const router = useRouter();
  const currentYear = new Date().getFullYear();
  const plantAge = currentYear - planting.planted_year;
  const yearsToMaturity = planting.years_to_maturity || 10;
  const maturityProgress = Math.min((plantAge / yearsToMaturity) * 100, 100);

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-[60]"
        onClick={onClose}
      />

      {/* Popup */}
      <div className="relative z-[65] bg-card rounded-xl shadow-2xl border border-border w-96 max-w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-4 bg-muted/50 border-b border-border">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h3 className="font-semibold text-lg">
                {planting.name || planting.common_name}
              </h3>
              {planting.name && (
                <p className="text-sm text-muted-foreground">{planting.common_name}</p>
              )}
              {planting.scientific_name && planting.species_is_custom !== 1 && (
                <p className="text-xs text-muted-foreground italic mt-1">
                  {planting.scientific_name}
                </p>
              )}
              {planting.variety_name && (
                <p className="text-xs text-foreground mt-1">
                  Variety:{' '}
                  <span className="font-medium">
                    {planting.parent_variety_name
                      ? `${planting.parent_variety_name} → ${planting.variety_name}`
                      : planting.variety_name}
                  </span>
                </p>
              )}
            </div>
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-muted-foreground/20 text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Layer Badge */}
          <div>
            <Badge variant="secondary" className="capitalize">
              {planting.layer}
            </Badge>
          </div>

          {/* Plant Info Grid */}
          <div className="grid grid-cols-2 gap-3">
            {planting.mature_height_ft && (
              <div>
                <div className="text-xs text-muted-foreground mb-1">Mature Height</div>
                <div className="font-medium">{planting.mature_height_ft} ft</div>
              </div>
            )}
            {planting.mature_width_ft && (
              <div>
                <div className="text-xs text-muted-foreground mb-1">Mature Width</div>
                <div className="font-medium">{planting.mature_width_ft} ft</div>
              </div>
            )}
          </div>

          {/* Age & Maturity */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Planted:</span>
              <span className="font-medium">{planting.planted_year}</span>
              <span className="text-muted-foreground">({plantAge} {plantAge === 1 ? 'year' : 'years'} old)</span>
            </div>

            {/* Maturity Progress Bar */}
            <div>
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>Growth Progress</span>
                <span>{maturityProgress.toFixed(0)}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-600 transition-all"
                  style={{ width: `${maturityProgress}%` }}
                />
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {plantAge < yearsToMaturity
                  ? `${yearsToMaturity - plantAge} years to maturity`
                  : 'Mature'}
              </div>
            </div>
          </div>

          {/* Location + GPS provenance */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span className="font-mono">
                {planting.lat.toFixed(6)}, {planting.lng.toFixed(6)}
              </span>
            </div>
            {(planting.placement_method || planting.placement_accuracy_meters != null) && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground pl-6">
                <Crosshair className="h-3 w-3" />
                {planting.placement_method === 'gps' ? (
                  <span>
                    Captured by GPS
                    {typeof planting.placement_accuracy_meters === 'number'
                      ? ` (${formatAccuracy(planting.placement_accuracy_meters)}, ${classifyAccuracy(planting.placement_accuracy_meters).label.toLowerCase()})`
                      : ''}
                    {typeof planting.placement_altitude_meters === 'number'
                      ? ` · alt ${planting.placement_altitude_meters.toFixed(1)}m`
                      : ''}
                  </span>
                ) : planting.placement_method === 'map_click' ? (
                  <span>Placed by map click</span>
                ) : (
                  <span>Placement: {planting.placement_method}</span>
                )}
              </div>
            )}
          </div>

          {/* Notes */}
          {planting.notes && (
            <div>
              <div className="text-xs text-muted-foreground mb-1">Notes</div>
              <div className="text-sm bg-muted/50 rounded p-2">
                {planting.notes}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-3 bg-muted/30 border-t border-border space-y-2">
          {/* Learn More Button */}
          <Button
            onClick={() => {
              router.push(`/plants/${planting.species_id}`);
              onClose();
            }}
            variant="outline"
            size="sm"
            className="w-full"
          >
            <BookOpen className="h-4 w-4 mr-2" />
            Learn more about {planting.common_name}
          </Button>

          {/* Guild Companions Button */}
          {onShowCompanions && (
            <Button
              onClick={() => {
                onShowCompanions(planting.common_name);
                onClose();
              }}
              variant="default"
              size="sm"
              className="w-full bg-green-600 hover:bg-green-700"
            >
              <Users className="h-4 w-4 mr-2" />
              Show Guild Companions for {planting.common_name}
            </Button>
          )}

          {/* Close/Delete Actions */}
          {onDelete && (
            <div className="flex gap-2">
              <Button
                onClick={onClose}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  if (confirm('Are you sure you want to remove this planting?')) {
                    onDelete(planting.id);
                    onClose();
                  }
                }}
                variant="destructive"
                size="sm"
                className="flex-1"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Remove
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
