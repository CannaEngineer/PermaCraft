'use client';

import { useState, useCallback, useEffect } from 'react';
import { Play, Pause, RotateCcw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TimeMachineOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  currentYear: number;
  onYearChange: (year: number) => void;
  minYear?: number;
  maxYear?: number;
}

/**
 * Time Machine Overlay Component
 *
 * Floats at the bottom of the map, allowing users to see plant growth
 * projections while manipulating the timeline. Designed to be non-intrusive
 * while providing full controls.
 */
export function TimeMachineOverlay({
  isOpen,
  onClose,
  currentYear,
  onYearChange,
  minYear = new Date().getFullYear(),
  maxYear = new Date().getFullYear() + 20,
}: TimeMachineOverlayProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1); // Years per second

  // Auto-advance animation
  useEffect(() => {
    if (!isPlaying || !isOpen) return;

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
  }, [isPlaying, isOpen, playbackSpeed, maxYear, currentYear, onYearChange]);

  // Keyboard controls (only when overlay is open)
  useEffect(() => {
    if (!isOpen) return;

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
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentYear, minYear, maxYear, onYearChange, onClose]);

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

  if (!isOpen) return null;

  return (
    <div
      className="absolute bottom-24 left-1/2 -translate-x-1/2 z-30 bg-card/95 backdrop-blur-md border border-border rounded-xl shadow-2xl p-4 w-[95%] max-w-3xl"
      role="group"
      aria-label="Farm growth timeline"
    >
      <div className="flex flex-col gap-3">
        {/* Header with Year and Close Button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-medium text-muted-foreground">Time Machine</h3>
            <div className="text-3xl md:text-4xl font-bold text-primary tabular-nums">
              {currentYear}
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 rounded-full"
            aria-label="Close time machine"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Slider */}
        <div className="relative">
          {/* Tick marks */}
          <div className="flex justify-between text-xs text-muted-foreground mb-2 px-1">
            {Array.from({ length: 5 }, (_, i) => {
              const year = minYear + Math.floor((yearRange * i) / 4);
              return (
                <span key={year} className="tabular-nums">
                  {year}
                </span>
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

        {/* Controls */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {/* Reset */}
            <Button
              size="sm"
              variant="outline"
              onClick={handleReset}
              aria-label="Reset to current year"
              className="hidden sm:flex"
            >
              <RotateCcw className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Reset</span>
            </Button>

            {/* Mobile Reset (icon only) */}
            <Button
              size="sm"
              variant="outline"
              onClick={handleReset}
              aria-label="Reset to current year"
              className="sm:hidden"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>

            {/* Play/Pause */}
            <Button
              size="sm"
              onClick={togglePlayback}
              aria-label={isPlaying ? 'Pause animation' : 'Play animation'}
            >
              {isPlaying ? (
                <>
                  <Pause className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Pause</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Play</span>
                </>
              )}
            </Button>

            {/* Playback Speed */}
            <select
              value={playbackSpeed}
              onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
              className="h-9 px-2 sm:px-3 rounded-md border border-input bg-background text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label="Playback speed"
            >
              <option value={0.5}>0.5x</option>
              <option value={1}>1x</option>
              <option value={2}>2x</option>
              <option value={5}>5x</option>
              <option value={10}>10x</option>
            </select>
          </div>

          {/* Help Text - Desktop only */}
          <div className="hidden md:block text-xs text-muted-foreground">
            ← → arrows • Space play/pause • Esc close
          </div>
        </div>
      </div>

      <style jsx>{`
        .slider-thumb::-webkit-slider-thumb {
          appearance: none;
          width: 22px;
          height: 22px;
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
          width: 22px;
          height: 22px;
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
    </div>
  );
}
