"use client";

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Trash2, Calendar, MapPin } from 'lucide-react';

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
  };
  onClose: () => void;
  onDelete?: (plantingId: string) => void;
}

export function PlantingDetailPopup({ planting, onClose, onDelete }: PlantingDetailPopupProps) {
  const currentYear = new Date().getFullYear();
  const plantAge = currentYear - planting.planted_year;
  const yearsToMaturity = planting.years_to_maturity || 10;
  const maturityProgress = Math.min((plantAge / yearsToMaturity) * 100, 100);

  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[1001]">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-[1000]"
        onClick={onClose}
      />

      {/* Popup */}
      <div className="relative z-[1001] bg-card rounded-lg shadow-2xl border border-border w-96 overflow-hidden">
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
              <p className="text-xs text-muted-foreground italic mt-1">
                {planting.scientific_name}
              </p>
            </div>
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
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

          {/* Location */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>
              {planting.lat.toFixed(6)}, {planting.lng.toFixed(6)}
            </span>
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
        {onDelete && (
          <div className="p-3 bg-muted/30 border-t border-border flex gap-2">
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
  );
}
