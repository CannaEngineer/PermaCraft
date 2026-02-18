'use client';

import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, ArrowRight, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PhaseAssignmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  farmId: string;
  phases: any[];
  plantings: any[];
  zones: any[];
  onUpdated: () => void;
}

/**
 * Modal for reassigning features (plantings, zones) between phases.
 * Mobile-friendly with large touch targets and simple tap-to-assign UX.
 */
export function PhaseAssignmentModal({
  open,
  onOpenChange,
  farmId,
  phases,
  plantings,
  zones,
  onUpdated,
}: PhaseAssignmentModalProps) {
  const [selectedFeature, setSelectedFeature] = useState<{ id: string; type: 'planting' | 'zone'; name: string; currentPhase: string | null } | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Map features to their current phase
  const featurePhaseMap = useMemo(() => {
    const map = new Map<string, string | null>();

    // Group plantings by planted_year matching phases
    plantings.forEach(p => {
      const matchedPhase = phases.find(phase => {
        const startYear = phase.start_date ? new Date(phase.start_date * 1000).getFullYear() : null;
        const endYear = phase.end_date ? new Date(phase.end_date * 1000).getFullYear() : null;
        if (startYear && endYear) return p.planted_year >= startYear && p.planted_year <= endYear;
        if (startYear) return p.planted_year >= startYear;
        return false;
      });
      map.set(p.id, matchedPhase?.id || null);
    });

    return map;
  }, [plantings, phases]);

  // Build feature list with phase assignments
  const features = useMemo(() => {
    const items: { id: string; type: 'planting' | 'zone'; name: string; subtitle?: string; phaseId: string | null; phaseName: string }[] = [];

    plantings.forEach(p => {
      const phaseId = featurePhaseMap.get(p.id) || null;
      const phase = phases.find(ph => ph.id === phaseId);
      items.push({
        id: p.id,
        type: 'planting',
        name: p.common_name || p.name || 'Unnamed Plant',
        subtitle: p.scientific_name,
        phaseId,
        phaseName: phase?.name || 'Unscheduled',
      });
    });

    return items;
  }, [plantings, phases, featurePhaseMap]);

  // Group by phase for display
  const grouped = useMemo(() => {
    const groups: Record<string, typeof features> = {};
    phases.forEach(p => { groups[p.name] = []; });
    groups['Unscheduled'] = [];

    features.forEach(f => {
      const key = f.phaseName;
      if (!groups[key]) groups[key] = [];
      groups[key].push(f);
    });

    return groups;
  }, [features, phases]);

  async function handleAssignToPhase(phaseId: string | null) {
    if (!selectedFeature) return;
    setSaving(true);

    try {
      // For plantings, update the planted_year to match the target phase
      if (selectedFeature.type === 'planting') {
        const targetPhase = phases.find(p => p.id === phaseId);
        const newYear = targetPhase?.start_date
          ? new Date(targetPhase.start_date * 1000).getFullYear()
          : new Date().getFullYear();

        await fetch(`/api/farms/${farmId}/plantings/${selectedFeature.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planted_year: newYear }),
        });
      }

      toast({ title: `Moved "${selectedFeature.name}" to ${phaseId ? phases.find(p => p.id === phaseId)?.name : 'Unscheduled'}` });
      setSelectedFeature(null);
      onUpdated();
    } catch (error) {
      console.error('Failed to reassign phase:', error);
      toast({ title: 'Failed to move item', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85dvh] flex flex-col p-0">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle>{selectedFeature ? 'Move to Phase' : 'Manage Phases'}</DialogTitle>
          <DialogDescription>
            {selectedFeature
              ? `Choose a phase for "${selectedFeature.name}"`
              : 'Tap a feature to move it to a different phase.'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {selectedFeature ? (
            /* Phase picker view */
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedFeature(null)}
                className="mb-3"
              >
                Back to list
              </Button>

              <div className="space-y-1.5">
                {phases.map(phase => (
                  <button
                    key={phase.id}
                    onClick={() => handleAssignToPhase(phase.id)}
                    disabled={saving}
                    className="w-full flex items-center gap-3 p-3.5 rounded-lg border hover:bg-accent transition-colors text-left touch-manipulation"
                  >
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0 border"
                      style={{ backgroundColor: phase.color || '#666' }}
                    />
                    <span className="flex-1 text-sm font-medium">{phase.name}</span>
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
                <button
                  onClick={() => handleAssignToPhase(null)}
                  disabled={saving}
                  className="w-full flex items-center gap-3 p-3.5 rounded-lg border border-dashed hover:bg-accent transition-colors text-left touch-manipulation"
                >
                  <div className="w-4 h-4 rounded-full flex-shrink-0 bg-muted border" />
                  <span className="flex-1 text-sm font-medium text-muted-foreground">Unscheduled</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            </div>
          ) : (
            /* Feature list grouped by phase */
            <div className="space-y-4">
              {Object.entries(grouped).map(([phaseName, items]) => {
                const phase = phases.find(p => p.name === phaseName);
                return (
                  <div key={phaseName}>
                    <div className="flex items-center gap-2 mb-2">
                      {phase?.color && (
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: phase.color }}
                        />
                      )}
                      <h3 className="text-sm font-semibold">{phaseName}</h3>
                      <Badge variant="secondary" className="text-xs">{items.length}</Badge>
                    </div>
                    {items.length === 0 ? (
                      <p className="text-xs text-muted-foreground pl-5 py-2">No features in this phase</p>
                    ) : (
                      <div className="space-y-1">
                        {items.map(item => (
                          <button
                            key={item.id}
                            onClick={() => setSelectedFeature({
                              id: item.id,
                              type: item.type,
                              name: item.name,
                              currentPhase: item.phaseId,
                            })}
                            className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors text-left touch-manipulation"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{item.name}</p>
                              {item.subtitle && <p className="text-xs text-muted-foreground italic truncate">{item.subtitle}</p>}
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {features.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No features to organize. Add plants or zones first.
                </p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
