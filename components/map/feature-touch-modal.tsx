"use client";

import { useState } from 'react';
import { X, Edit, Trash2, MapPin, Layers, MessageSquare, ChevronRight } from 'lucide-react';
import { ZONE_TYPES, getZoneTypeConfig } from '@/lib/map/zone-types';

export interface TouchFeature {
  id: string;
  type: 'zone' | 'planting' | 'line';
  name?: string;
  zoneType?: string;
  layerId?: string;
}

interface FeatureTouchModalProps {
  features: TouchFeature[];
  onSelect: (feature: TouchFeature, action: 'edit' | 'delete' | 'details' | 'comments') => void;
  onClose: () => void;
}

export function FeatureTouchModal({ features, onSelect, onClose }: FeatureTouchModalProps) {
  const [selectedFeature, setSelectedFeature] = useState<TouchFeature | null>(
    features.length === 1 ? features[0] : null
  );

  const showPicker = features.length > 1 && !selectedFeature;

  const getFeatureLabel = (f: TouchFeature) => {
    if (f.name) return f.name;
    if (f.type === 'zone' && f.zoneType) {
      const config = getZoneTypeConfig(f.zoneType);
      return config.label;
    }
    if (f.type === 'planting') return 'Planting';
    if (f.type === 'line') return 'Line';
    return 'Feature';
  };

  const getFeatureColor = (f: TouchFeature) => {
    if (f.type === 'zone' && f.zoneType) {
      return getZoneTypeConfig(f.zoneType).fillColor;
    }
    if (f.type === 'line') return '#8b5cf6';
    if (f.type === 'planting') return '#22c55e';
    return '#64748b';
  };

  const getFeatureTypeLabel = (f: TouchFeature) => {
    if (f.type === 'zone' && f.zoneType) {
      return getZoneTypeConfig(f.zoneType).label;
    }
    return f.type.charAt(0).toUpperCase() + f.type.slice(1);
  };

  return (
    <div className="fixed inset-0 z-[75] flex items-end justify-center md:items-center md:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-[75] bg-background rounded-t-2xl md:rounded-2xl shadow-2xl border border-border/50 w-full md:w-96 max-h-[70vh] overflow-hidden animate-in slide-in-from-bottom-4 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
          <h3 className="text-sm font-semibold">
            {showPicker ? `${features.length} Overlapping Features` : getFeatureLabel(selectedFeature!)}
          </h3>
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {showPicker ? (
          /* Overlapping feature picker */
          <div className="p-2 space-y-1 overflow-y-auto max-h-[50vh]">
            <p className="px-2 py-1 text-xs text-muted-foreground">
              Tap a feature to select it:
            </p>
            {features.map((f) => (
              <button
                key={`${f.type}-${f.id}`}
                onClick={() => setSelectedFeature(f)}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-muted/50 active:bg-muted/70 transition-colors text-left"
              >
                <div
                  className="w-5 h-5 rounded-md border border-black/10 flex-shrink-0"
                  style={{ backgroundColor: getFeatureColor(f) }}
                />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium block truncate">
                    {getFeatureLabel(f)}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {getFeatureTypeLabel(f)}
                  </span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </button>
            ))}
          </div>
        ) : selectedFeature ? (
          /* Action buttons for the selected feature */
          <div className="p-2 space-y-1">
            {/* Feature info */}
            <div className="flex items-center gap-3 px-3 py-2 mb-1">
              <div
                className="w-6 h-6 rounded-md border border-black/10 flex-shrink-0"
                style={{ backgroundColor: getFeatureColor(selectedFeature) }}
              />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium block truncate">
                  {getFeatureLabel(selectedFeature)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {getFeatureTypeLabel(selectedFeature)}
                </span>
              </div>
            </div>

            {/* Back button if multiple features */}
            {features.length > 1 && (
              <button
                onClick={() => setSelectedFeature(null)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs text-muted-foreground hover:bg-muted/50 transition-colors"
              >
                <Layers className="h-4 w-4" />
                <span>Back to overlapping features</span>
              </button>
            )}

            {/* Edit / Details */}
            <button
              onClick={() => onSelect(selectedFeature, 'details')}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-muted/50 active:bg-muted/70 transition-colors text-left"
            >
              <Edit className="h-4.5 w-4.5 text-blue-500" />
              <span className="text-sm font-medium">View Details / Edit</span>
            </button>

            {/* Comments */}
            <button
              onClick={() => onSelect(selectedFeature, 'comments')}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-muted/50 active:bg-muted/70 transition-colors text-left"
            >
              <MessageSquare className="h-4.5 w-4.5 text-violet-500" />
              <span className="text-sm font-medium">Comments</span>
            </button>

            {/* Delete */}
            <button
              onClick={() => onSelect(selectedFeature, 'delete')}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 active:bg-red-100 dark:active:bg-red-950/50 transition-colors text-left"
            >
              <Trash2 className="h-4.5 w-4.5 text-red-500" />
              <span className="text-sm font-medium text-red-600 dark:text-red-400">Delete</span>
            </button>
          </div>
        ) : null}

        {/* Safe area padding for mobile */}
        <div className="h-2 md:h-0" />
      </div>
    </div>
  );
}
