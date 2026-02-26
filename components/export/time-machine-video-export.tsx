// components/export/time-machine-video-export.tsx
'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Video, Loader2 } from 'lucide-react';
import maplibregl from 'maplibre-gl';
import {
  exportTimeMachineVideo,
  downloadVideo,
  isVideoEncoderSupported,
} from '@/lib/export/video-export';

interface TimeMachineVideoExportProps {
  map: maplibregl.Map | null;
  farmName: string;
  minYear: number;
  maxYear: number;
  currentYear: number;
  setCurrentYear: (year: number) => void;
  hasPlantings: boolean;
}

const DURATION_OPTIONS = [
  { label: '15s', seconds: 15 },
  { label: '30s', seconds: 30 },
  { label: '60s', seconds: 60 },
] as const;

export function TimeMachineVideoExport({
  map,
  farmName,
  minYear,
  maxYear,
  currentYear,
  setCurrentYear,
  hasPlantings,
}: TimeMachineVideoExportProps) {
  const [duration, setDuration] = useState<15 | 30 | 60>(30);
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState<{ year: number; total: number; phase: string } | null>(null);
  const { toast } = useToast();

  // Track currentYear in a ref so handleExport captures it at click time
  // without needing currentYear in the useCallback dep array (which would
  // cause the callback to rebuild on every year tick during export).
  const currentYearRef = useRef(currentYear);
  useEffect(() => { currentYearRef.current = currentYear; }, [currentYear]);

  // Guard state updates after component unmounts (e.g. panel closed mid-export)
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const handleExport = useCallback(async () => {
    const originalYear = currentYearRef.current; // Captured at click time via ref

    if (!map) {
      toast({ title: 'Map not ready', variant: 'destructive' });
      return;
    }
    if (!isVideoEncoderSupported()) {
      toast({
        title: 'Video export requires Chrome 94+, Edge 94+, or Safari 16+',
        variant: 'destructive',
      });
      return;
    }

    setIsExporting(true);
    setProgress({ year: minYear, total: maxYear - minYear + 1, phase: 'capturing' });

    try {
      const blob = await exportTimeMachineVideo({
        map,
        farmName,
        minYear,
        maxYear,
        durationSeconds: duration,
        setYear: setCurrentYear,
        onProgress: (year, total, phase) => setProgress({ year, total, phase }),
      });

      const filename = `${farmName.replace(/\s+/g, '-')}-growth-${duration}s.mp4`;
      downloadVideo(blob, filename);
      toast({ title: 'Time lapse exported!' });
    } catch (error: unknown) {
      console.error('Video export failed:', error);
      const message = error instanceof Error
        ? error.message
        : 'Video export failed. Please try again.';
      toast({ title: message, variant: 'destructive' });
    } finally {
      if (mountedRef.current) {
        setCurrentYear(originalYear);
        setIsExporting(false);
        setProgress(null);
      }
    }
  }, [map, farmName, minYear, maxYear, duration, setCurrentYear, toast]);

  const disabled = !map || !hasPlantings || isExporting;

  return (
    <div className="space-y-3">
      {/* Duration selector */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Duration:</span>
        <div className="flex gap-1">
          {DURATION_OPTIONS.map(({ label, seconds }) => (
            <Button
              key={seconds}
              size="sm"
              variant={duration === seconds ? 'default' : 'outline'}
              className="h-7 px-2 text-xs"
              onClick={() => setDuration(seconds)}
              disabled={isExporting}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* Export button */}
      <Button
        onClick={handleExport}
        disabled={disabled}
        className="w-full"
        variant="outline"
        title={!hasPlantings ? 'Add plantings to export a growth timeline' : undefined}
      >
        {isExporting ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Video className="h-4 w-4 mr-2" />
        )}
        {isExporting
          ? progress?.phase === 'capturing'
            ? `Capturing year ${progress.year} of ${progress.total}…`
            : 'Encoding video…'
          : 'Export Time Lapse MP4'}
      </Button>

      {!hasPlantings && (
        <p className="text-xs text-muted-foreground text-center">
          Add plantings to the map to export a growth timeline.
        </p>
      )}
    </div>
  );
}
