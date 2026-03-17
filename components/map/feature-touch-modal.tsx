"use client";

import { useState } from 'react';
import { X, Edit, Trash2, MapPin, Layers, MessageSquare, ChevronRight, Leaf, Calendar, ChevronLeft, AlertTriangle, Minus, Users } from 'lucide-react';
import { ZONE_TYPES, getZoneTypeConfig } from '@/lib/map/zone-types';
import { PLANTING_LAYER_COLORS, PLANTING_LAYER_LABELS } from '@/lib/design/design-system';

export interface TouchFeature {
  id: string;
  type: 'zone' | 'planting' | 'line';
  name?: string;
  zoneType?: string;
  layerId?: string;
  /** Extended planting data (when type === 'planting') */
  plantingData?: {
    common_name: string;
    scientific_name?: string;
    layer?: string;
    planted_year?: number;
    mature_height_ft?: number;
    mature_width_ft?: number;
    years_to_maturity?: number;
    notes?: string;
    species_id?: string;
  };
  /** Extended line data (when type === 'line') */
  lineData?: {
    label?: string;
    line_type?: string;
  };
}

interface FeatureTouchModalProps {
  features: TouchFeature[];
  onSelect: (feature: TouchFeature, action: 'edit' | 'delete' | 'details' | 'comments' | 'companions') => void;
  onClose: () => void;
}

export function FeatureTouchModal({ features, onSelect, onClose }: FeatureTouchModalProps) {
  const [selectedFeature, setSelectedFeature] = useState<TouchFeature | null>(
    features.length === 1 ? features[0] : null
  );
  const [confirmDelete, setConfirmDelete] = useState(false);

  const showPicker = features.length > 1 && !selectedFeature;

  const getFeatureLabel = (f: TouchFeature) => {
    if (f.type === 'planting' && f.plantingData?.common_name) {
      return f.name || f.plantingData.common_name;
    }
    if (f.name) return f.name;
    if (f.type === 'zone' && f.zoneType) {
      const config = getZoneTypeConfig(f.zoneType);
      return config.label;
    }
    if (f.type === 'planting') return 'Planting';
    if (f.type === 'line') return f.lineData?.label || 'Line';
    return 'Feature';
  };

  const getFeatureColor = (f: TouchFeature) => {
    if (f.type === 'zone' && f.zoneType) {
      return getZoneTypeConfig(f.zoneType).fillColor;
    }
    if (f.type === 'planting' && f.plantingData?.layer) {
      return PLANTING_LAYER_COLORS[f.plantingData.layer] || '#22c55e';
    }
    if (f.type === 'line') return '#8b5cf6';
    if (f.type === 'planting') return '#22c55e';
    return '#64748b';
  };

  const getFeatureIcon = (f: TouchFeature) => {
    if (f.type === 'zone') return MapPin;
    if (f.type === 'planting') return Leaf;
    if (f.type === 'line') return Minus;
    return Layers;
  };

  const getFeatureTypeLabel = (f: TouchFeature) => {
    if (f.type === 'zone' && f.zoneType) {
      return getZoneTypeConfig(f.zoneType).label;
    }
    if (f.type === 'planting' && f.plantingData?.layer) {
      return PLANTING_LAYER_LABELS[f.plantingData.layer] || 'Plant';
    }
    if (f.type === 'line' && f.lineData?.line_type) {
      return f.lineData.line_type.charAt(0).toUpperCase() + f.lineData.line_type.slice(1);
    }
    return f.type.charAt(0).toUpperCase() + f.type.slice(1);
  };

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    if (selectedFeature) {
      onSelect(selectedFeature, 'delete');
    }
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
          <div className="flex items-center gap-2 min-w-0">
            {/* Back arrow when viewing single feature from a multi-feature set */}
            {features.length > 1 && selectedFeature && (
              <button
                onClick={() => { setSelectedFeature(null); setConfirmDelete(false); }}
                className="h-7 w-7 flex items-center justify-center rounded-full hover:bg-muted transition-colors flex-shrink-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            <h3 className="text-sm font-semibold truncate">
              {showPicker ? `${features.length} Features Here` : getFeatureLabel(selectedFeature!)}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {showPicker ? (
          /* Overlapping feature picker */
          <div className="p-2 space-y-0.5 overflow-y-auto max-h-[50vh]">
            <p className="px-2 py-1.5 text-xs text-muted-foreground">
              Multiple features overlap here. Tap one to select:
            </p>
            {features.map((f) => {
              const Icon = getFeatureIcon(f);
              return (
                <button
                  key={`${f.type}-${f.id}`}
                  onClick={() => setSelectedFeature(f)}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-muted/50 active:bg-muted/70 transition-colors text-left"
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: getFeatureColor(f) + '20' }}
                  >
                    <Icon className="h-4 w-4" style={{ color: getFeatureColor(f) }} />
                  </div>
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
              );
            })}
          </div>
        ) : selectedFeature ? (
          <div className="overflow-y-auto max-h-[55vh]">
            {/* Feature info card */}
            <div className="px-4 pt-3 pb-2">
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: getFeatureColor(selectedFeature) + '20' }}
                >
                  {(() => { const Icon = getFeatureIcon(selectedFeature); return <Icon className="h-5 w-5" style={{ color: getFeatureColor(selectedFeature) }} />; })()}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold block truncate">
                    {getFeatureLabel(selectedFeature)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {getFeatureTypeLabel(selectedFeature)}
                  </span>
                  {/* Planting scientific name */}
                  {selectedFeature.type === 'planting' && selectedFeature.plantingData?.scientific_name && (
                    <span className="text-xs text-muted-foreground italic block mt-0.5">
                      {selectedFeature.plantingData.scientific_name}
                    </span>
                  )}
                </div>
              </div>

              {/* Planting quick stats */}
              {selectedFeature.type === 'planting' && selectedFeature.plantingData && (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {selectedFeature.plantingData.planted_year && (
                    <div className="bg-muted/50 rounded-lg px-2.5 py-2 text-center">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground mx-auto mb-0.5" />
                      <div className="text-xs font-medium">{selectedFeature.plantingData.planted_year}</div>
                      <div className="text-[10px] text-muted-foreground">Planted</div>
                    </div>
                  )}
                  {selectedFeature.plantingData.mature_height_ft && (
                    <div className="bg-muted/50 rounded-lg px-2.5 py-2 text-center">
                      <div className="text-xs font-medium">{selectedFeature.plantingData.mature_height_ft} ft</div>
                      <div className="text-[10px] text-muted-foreground">Height</div>
                    </div>
                  )}
                  {selectedFeature.plantingData.mature_width_ft && (
                    <div className="bg-muted/50 rounded-lg px-2.5 py-2 text-center">
                      <div className="text-xs font-medium">{selectedFeature.plantingData.mature_width_ft} ft</div>
                      <div className="text-[10px] text-muted-foreground">Width</div>
                    </div>
                  )}
                </div>
              )}

              {/* Planting maturity progress */}
              {selectedFeature.type === 'planting' && selectedFeature.plantingData?.planted_year && selectedFeature.plantingData?.years_to_maturity && (
                <div className="mt-2">
                  {(() => {
                    const currentYear = new Date().getFullYear();
                    const age = currentYear - selectedFeature.plantingData!.planted_year!;
                    const maturity = selectedFeature.plantingData!.years_to_maturity!;
                    const progress = Math.min((age / maturity) * 100, 100);
                    return (
                      <div>
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                          <span>Growth</span>
                          <span>{progress.toFixed(0)}% {progress >= 100 ? '(Mature)' : ''}</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${progress}%`,
                              backgroundColor: getFeatureColor(selectedFeature),
                            }}
                          />
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Planting notes */}
              {selectedFeature.type === 'planting' && selectedFeature.plantingData?.notes && (
                <div className="mt-2 text-xs text-muted-foreground bg-muted/30 rounded-lg px-2.5 py-2 line-clamp-2">
                  {selectedFeature.plantingData.notes}
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-border/30 mx-4" />

            {/* Actions */}
            <div className="p-2 space-y-0.5">
              {/* View Details / Edit */}
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

              {/* Guild Companions (planting only) */}
              {selectedFeature.type === 'planting' && selectedFeature.plantingData && (
                <button
                  onClick={() => onSelect(selectedFeature, 'companions')}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-green-50 dark:hover:bg-green-950/20 active:bg-green-100 dark:active:bg-green-950/40 transition-colors text-left"
                >
                  <Users className="h-4.5 w-4.5 text-green-600" />
                  <span className="text-sm font-medium text-green-700 dark:text-green-400">Guild Companions</span>
                </button>
              )}

              {/* Delete with confirmation */}
              {!confirmDelete ? (
                <button
                  onClick={handleDelete}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 active:bg-red-100 dark:active:bg-red-950/50 transition-colors text-left"
                >
                  <Trash2 className="h-4.5 w-4.5 text-red-500" />
                  <span className="text-sm font-medium text-red-600 dark:text-red-400">Delete</span>
                </button>
              ) : (
                <div className="px-3 py-2 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 animate-in fade-in duration-150">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
                    <span className="text-xs text-red-600 dark:text-red-400">
                      Delete {getFeatureLabel(selectedFeature)}?
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfirmDelete(false)}
                      className="flex-1 text-xs px-3 py-2 rounded-lg bg-background border border-border hover:bg-muted transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDelete}
                      className="flex-1 text-xs px-3 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* Safe area padding for mobile */}
        <div className="h-2 md:h-0" />
      </div>
    </div>
  );
}
