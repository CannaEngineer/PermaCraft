'use client';

import { useState, useCallback, useEffect } from 'react';
import { Play, Pause, RotateCcw, X, Clock } from 'lucide-react';
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
 * Compact vertical control that sits on the right edge of the map.
 * Designed to be minimally intrusive while providing full timeline controls.
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
  const [isExpanded, setIsExpanded] = useState(false);

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
        case 'ArrowDown':
          e.preventDefault();
          onYearChange(Math.max(minYear, currentYear - 1));
          break;
        case 'ArrowUp':
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
      className="absolute right-4 top-1/2 -translate-y-1/2 z-30 flex items-center gap-2"
      role="group"
      aria-label="Farm growth timeline"
    >
      {/* Expanded Controls Panel (shows on hover or when expanded) */}
      {isExpanded && (
        <div className="bg-card/95 backdrop-blur-md border border-border rounded-lg shadow-xl p-3 animate-in slide-in-from-right-2 duration-200">
          <div className="flex flex-col gap-3 min-w-[200px]">
            {/* Controls Row */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleReset}
                aria-label="Reset to current year"
                className="h-8 w-8 p-0"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>

              <Button
                size="sm"
                onClick={togglePlayback}
                aria-label={isPlaying ? 'Pause animation' : 'Play animation'}
                className="h-8 px-3"
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>

              <select
                value={playbackSpeed}
                onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                className="h-8 px-2 rounded-md border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                aria-label="Playback speed"
              >
                <option value={0.5}>0.5x</option>
                <option value={1}>1x</option>
                <option value={2}>2x</option>
                <option value={5}>5x</option>
                <option value={10}>10x</option>
              </select>
            </div>

            <div className="text-xs text-muted-foreground text-center">
              ↑↓ arrows • Space • Esc
            </div>
          </div>
        </div>
      )}

      {/* Vertical Slider with Year Display */}
      <div
        className="bg-card/95 backdrop-blur-md border border-border rounded-lg shadow-xl p-2 flex flex-col items-center gap-2"
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
      >
        {/* Close Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-7 w-7 rounded-full hover:bg-destructive/10"
          aria-label="Close time machine"
        >
          <X className="h-4 w-4" />
        </Button>

        {/* Year Display */}
        <div className="flex flex-col items-center gap-1 py-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <div className="text-2xl font-bold text-primary tabular-nums -rotate-0">
            {currentYear}
          </div>
        </div>

        {/* Vertical Slider Container */}
        <div className="relative h-64 w-12 flex items-center justify-center">
          {/* Year ticks */}
          <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-[10px] text-muted-foreground pr-1">
            {Array.from({ length: 5 }, (_, i) => {
              const year = maxYear - Math.floor((yearRange * i) / 4);
              return (
                <span key={year} className="tabular-nums leading-none">
                  {year.toString().slice(2)}
                </span>
              );
            })}
          </div>

          {/* Vertical Range Input */}
          <input
            type="range"
            min={minYear}
            max={maxYear}
            value={currentYear}
            onChange={handleSliderChange}
            className="vertical-slider h-full w-3 appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to top, hsl(var(--primary)) ${progressPercent}%, hsl(var(--muted)) ${progressPercent}%)`,
            } as React.CSSProperties}
            aria-label={`Year selector: ${minYear} to ${maxYear}`}
            aria-valuemin={minYear}
            aria-valuemax={maxYear}
            aria-valuenow={currentYear}
            aria-valuetext={`Year ${currentYear}`}
          />
        </div>

        {/* Range Labels */}
        <div className="flex flex-col items-center gap-1 text-[10px] text-muted-foreground">
          <span className="tabular-nums">{minYear}</span>
          <span>-</span>
          <span className="tabular-nums">{maxYear}</span>
        </div>
      </div>

      <style jsx>{`
        .vertical-slider {
          writing-mode: bt-lr;
          -webkit-appearance: slider-vertical;
          appearance: slider-vertical;
        }

        .vertical-slider::-webkit-slider-thumb {
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: hsl(var(--primary));
          border: 2px solid hsl(var(--background));
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
          transition: transform 0.1s ease;
        }

        .vertical-slider::-webkit-slider-thumb:hover {
          transform: scale(1.2);
        }

        .vertical-slider::-webkit-slider-thumb:active {
          transform: scale(0.9);
        }

        .vertical-slider::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: hsl(var(--primary));
          border: 2px solid hsl(var(--background));
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
          transition: transform 0.1s ease;
        }

        .vertical-slider::-moz-range-thumb:hover {
          transform: scale(1.2);
        }

        .vertical-slider::-moz-range-thumb:active {
          transform: scale(0.9);
        }

        /* Firefox vertical slider support */
        .vertical-slider {
          -moz-appearance: slider-vertical;
        }
      `}</style>
    </div>
  );
}
