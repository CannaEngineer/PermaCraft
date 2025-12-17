'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { FarmMap } from '@/components/map/farm-map';
import { Button } from '@/components/ui/button';
import { SaveIcon, Send, Info, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { apiFetch } from '@/lib/api/fetch-with-retry';
import { getOperationError } from '@/lib/api/error-messages';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { queueOperation } from '@/lib/offline/queue';
import type maplibregl from 'maplibre-gl';

interface PracticeFarmEditorClientProps {
  practiceFarm: any;
  initialZones: any[];
}

export function PracticeFarmEditorClient({
  practiceFarm,
  initialZones,
}: PracticeFarmEditorClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { isOffline } = useOnlineStatus();
  const [zones, setZones] = useState<any[]>(initialZones);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isQueued, setIsQueued] = useState(false);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);

  // Convert practice farm to Farm type for FarmMap
  const farmForMap = {
    id: practiceFarm.id,
    user_id: practiceFarm.user_id,
    name: practiceFarm.name,
    description: practiceFarm.description || '',
    acres: practiceFarm.acres || 1, // Use actual acres from practice farm
    climate_zone: 'temperate',
    rainfall_inches: null,
    soil_type: null,
    center_lat: practiceFarm.center_lat,
    center_lng: practiceFarm.center_lng,
    zoom_level: practiceFarm.zoom_level,
    is_public: 0,
    created_at: practiceFarm.created_at,
    updated_at: practiceFarm.updated_at,
  };

  const handleZonesChange = useCallback(
    (newZones: any[]) => {
      setZones(newZones);
      setHasUnsavedChanges(true);

      // Auto-save after 2 seconds of inactivity
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
      }

      autoSaveTimer.current = setTimeout(() => {
        handleSave(newZones);
      }, 2000);
    },
    []
  );

  const handleSave = async (zonesToSave: any[] = zones) => {
    // If offline, queue the operation
    if (isOffline) {
      try {
        queueOperation(
          `/api/learning/practice-farms/${practiceFarm.id}/zones`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ zones: zonesToSave }),
          },
          `Save practice farm: ${practiceFarm.name}`,
          3
        );

        setIsQueued(true);
        setHasUnsavedChanges(false);
        toast({
          title: 'Queued',
          description: 'Changes will be saved when you\'re back online.',
        });
      } catch (error: any) {
        toast({
          title: 'Queue Full',
          description: error.message,
          variant: 'destructive',
        });
      }
      return;
    }

    setSaving(true);

    try {
      await apiFetch<{ success: boolean }>(
        `/api/learning/practice-farms/${practiceFarm.id}/zones`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ zones: zonesToSave }),
          maxRetries: 2,
        }
      );

      setHasUnsavedChanges(false);
      setIsQueued(false);
      toast({
        title: 'Saved!',
        description: 'Your practice farm zones have been saved',
      });
    } catch (error: any) {
      const friendlyError = getOperationError('save-practice-farm', error);
      toast({
        title: friendlyError.title,
        description: friendlyError.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitForReview = () => {
    // Navigate to submission confirmation or trigger submission flow
    router.push(`/learn/practice-farms/${practiceFarm.id}?submit=true`);
  };

  return (
    <div className="relative h-full">
      {/* Map Container */}
      <div className="h-full">
        <FarmMap
          farm={farmForMap}
          zones={zones}
          onZonesChange={handleZonesChange}
          onMapReady={(map) => {
            mapRef.current = map;
          }}
        />
      </div>

      {/* Floating Controls */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <Button
          onClick={() => handleSave()}
          disabled={saving || (!hasUnsavedChanges && !isQueued)}
          size="lg"
          className="shadow-lg min-h-[44px] touch-manipulation"
        >
          {saving ? (
            <>
              <SaveIcon className="h-5 w-5 mr-2 animate-pulse" />
              <span className="hidden sm:inline">Saving...</span>
              <span className="sm:hidden">Saving...</span>
            </>
          ) : isQueued ? (
            <>
              <Clock className="h-5 w-5 mr-2" />
              <span className="hidden sm:inline">Queued</span>
              <span className="sm:hidden">Queued</span>
            </>
          ) : hasUnsavedChanges ? (
            <>
              <SaveIcon className="h-5 w-5 mr-2" />
              <span className="hidden sm:inline">Save Changes</span>
              <span className="sm:hidden">Save</span>
            </>
          ) : (
            <>
              <SaveIcon className="h-5 w-5 mr-2" />
              <span className="hidden sm:inline">Saved</span>
              <span className="sm:hidden">Saved</span>
            </>
          )}
        </Button>

        {zones.length > 0 && !practiceFarm.submitted_for_review && (
          <Button
            onClick={handleSubmitForReview}
            size="lg"
            className="shadow-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 min-h-[44px] touch-manipulation"
          >
            <Send className="h-5 w-5 mr-2" />
            <span className="hidden sm:inline">Submit for AI Review</span>
            <span className="sm:hidden">Submit</span>
          </Button>
        )}
      </div>

      {/* Info Card */}
      <Card className="hidden md:block absolute bottom-4 left-4 z-10 max-w-xs shadow-xl bg-background/95 backdrop-blur">
        <CardContent className="p-3">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-semibold mb-1">Practice Farm Editor</p>
              <p className="text-muted-foreground">
                Draw zones within your farm boundary and submit for AI feedback. Changes auto-save.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
