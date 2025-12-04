'use client';

import { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Play, Pause, RotateCcw, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TimeMachineModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentYear: number;
  onYearChange: (year: number) => void;
  minYear?: number;
  maxYear?: number;
}

export function TimeMachineModal({
  open,
  onOpenChange,
  currentYear,
  onYearChange,
  minYear = new Date().getFullYear(),
  maxYear = new Date().getFullYear() + 20,
}: TimeMachineModalProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1); // Years per second

  // Auto-advance animation
  useEffect(() => {
    if (!isPlaying || !open) return;

    const interval = setInterval(() => {
      const next = currentYear + 1;
      if (next > maxYear) {
        setIsPlaying(false);
        onYearChange(maxYear);
      } else {
        onYearChange(next);
      }
    }, 1000 / playbackSpeed);

    return () => clearInterval(interval);
  }, [isPlaying, open, playbackSpeed, maxYear, currentYear, onYearChange]);

  // Keyboard controls (only when modal is open)
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture keys if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          onYearChange(Math.max(minYear, currentYear - 1));
          break;
        case 'ArrowRight':
          e.preventDefault();
          onYearChange(Math.min(maxYear, currentYear + 1));
          break;
        case ' ':
          e.preventDefault();
          setIsPlaying((prev) => !prev);
          break;
        case 'Home':
          e.preventDefault();
          onYearChange(minYear);
          break;
        case 'End':
          e.preventDefault();
          onYearChange(maxYear);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, currentYear, minYear, maxYear, onYearChange]);

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onYearChange(parseInt(e.target.value, 10));
    },
    [onYearChange]
  );

  const handleReset = useCallback(() => {
    setIsPlaying(false);
    onYearChange(minYear);
  }, [minYear, onYearChange]);

  const togglePlayback = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  const yearRange = maxYear - minYear;
  const progressPercent = ((currentYear - minYear) / yearRange) * 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Time Machine
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Year Display */}
          <div className="flex items-center justify-center">
            <div className="text-6xl font-bold text-primary tabular-nums">
              {currentYear}
            </div>
          </div>

          {/* Slider */}
          <div className="space-y-4">
            <div className="relative">
              {/* Tick marks */}
              <div className="flex justify-between text-xs text-muted-foreground mb-2">
                {Array.from({ length: 5 }, (_, i) => {
                  const year = minYear + Math.floor((yearRange * i) / 4);
                  return (
                    <div key={year} className="flex flex-col items-center">
                      <span className="tabular-nums">{year}</span>
                    </div>
                  );
                })}
              </div>

              {/* Range input */}
              <input
                type="range"
                min={minYear}
                max={maxYear}
                value={currentYear}
                onChange={handleSliderChange}
                className="w-full h-3 bg-muted rounded-lg appearance-none cursor-pointer slider-thumb"
                style={{
                  background: `linear-gradient(to right, hsl(var(--primary)) ${progressPercent}%, hsl(var(--muted)) ${progressPercent}%)`,
                }}
                aria-label={`Year selector: ${minYear} to ${maxYear}`}
                aria-valuemin={minYear}
                aria-valuemax={maxYear}
                aria-valuenow={currentYear}
                aria-valuetext={`Year ${currentYear}`}
              />
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4">
            {/* Reset */}
            <Button
              size="lg"
              variant="outline"
              onClick={handleReset}
              aria-label="Reset to current year"
            >
              <RotateCcw className="h-5 w-5 mr-2" />
              Reset
            </Button>

            {/* Play/Pause */}
            <Button
              size="lg"
              onClick={togglePlayback}
              aria-label={isPlaying ? 'Pause animation' : 'Play animation'}
              className="min-w-32"
            >
              {isPlaying ? (
                <>
                  <Pause className="h-5 w-5 mr-2" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="h-5 w-5 mr-2" />
                  Play
                </>
              )}
            </Button>

            {/* Playback Speed */}
            <select
              value={playbackSpeed}
              onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
              className="h-11 px-4 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label="Playback speed"
            >
              <option value={0.5}>0.5x</option>
              <option value={1}>1x</option>
              <option value={2}>2x</option>
              <option value={5}>5x</option>
              <option value={10}>10x</option>
            </select>
          </div>

          {/* Help Text */}
          <div className="text-sm text-muted-foreground text-center space-y-1">
            <p>Drag the slider to see how your plants will grow over time</p>
            <p className="text-xs">
              ← → Arrow keys to step • Space to play/pause • Home/End to jump
            </p>
          </div>
        </div>

        <style jsx>{`
          .slider-thumb::-webkit-slider-thumb {
            appearance: none;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background: hsl(var(--primary));
            border: 3px solid hsl(var(--background));
            cursor: pointer;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
            transition: transform 0.1s ease;
          }

          .slider-thumb::-webkit-slider-thumb:hover {
            transform: scale(1.15);
          }

          .slider-thumb::-webkit-slider-thumb:active {
            transform: scale(0.95);
          }

          .slider-thumb::-moz-range-thumb {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background: hsl(var(--primary));
            border: 3px solid hsl(var(--background));
            cursor: pointer;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
            transition: transform 0.1s ease;
          }

          .slider-thumb::-moz-range-thumb:hover {
            transform: scale(1.15);
          }

          .slider-thumb::-moz-range-thumb:active {
            transform: scale(0.95);
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}
