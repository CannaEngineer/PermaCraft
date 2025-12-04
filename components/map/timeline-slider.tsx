'use client';

import { useState, useCallback, useEffect } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TimelineSliderProps {
  currentYear: number;
  onYearChange: (year: number) => void;
  minYear?: number;
  maxYear?: number;
  className?: string;
}

export function TimelineSlider({
  currentYear,
  onYearChange,
  minYear = new Date().getFullYear(),
  maxYear = new Date().getFullYear() + 20,
  className = '',
}: TimelineSliderProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1); // Years per second

  // Auto-advance animation
  useEffect(() => {
    if (!isPlaying) return;

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
  }, [isPlaying, playbackSpeed, maxYear, currentYear, onYearChange]);

  // Keyboard controls
  useEffect(() => {
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
  }, [currentYear, minYear, maxYear, onYearChange]);

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
    <div
      className={`absolute bottom-8 left-1/2 -translate-x-1/2 z-20 bg-black/60 backdrop-blur-sm border border-white/20 rounded-lg shadow-2xl p-4 w-[90%] max-w-3xl ${className}`}
      role="group"
      aria-label="Farm growth timeline"
    >
      <div className="flex flex-col gap-3">
        {/* Year Display */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-medium text-white/80">Time Machine</h3>
            <div className="text-2xl font-bold text-white tabular-nums">
              {currentYear}
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            {/* Playback Speed */}
            <select
              value={playbackSpeed}
              onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
              className="bg-white/10 text-white text-xs border border-white/20 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-green-500"
              aria-label="Playback speed"
            >
              <option value={0.5}>0.5x</option>
              <option value={1}>1x</option>
              <option value={2}>2x</option>
              <option value={5}>5x</option>
            </select>

            {/* Play/Pause */}
            <Button
              size="sm"
              variant="secondary"
              onClick={togglePlayback}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20"
              aria-label={isPlaying ? 'Pause animation' : 'Play animation'}
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>

            {/* Reset */}
            <Button
              size="sm"
              variant="secondary"
              onClick={handleReset}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20"
              aria-label="Reset to current year"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Slider */}
        <div className="relative">
          {/* Tick marks */}
          <div className="absolute -top-2 left-0 right-0 flex justify-between text-xs text-white/60 px-1">
            {Array.from({ length: 5 }, (_, i) => {
              const year = minYear + Math.floor((yearRange * i) / 4);
              return (
                <div key={year} className="flex flex-col items-center">
                  <div className="w-px h-1 bg-white/40" />
                  <span className="mt-1 tabular-nums">{year}</span>
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
            className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider-thumb mt-6"
            style={{
              background: `linear-gradient(to right, #22c55e ${progressPercent}%, rgba(255,255,255,0.2) ${progressPercent}%)`,
            }}
            aria-label={`Year selector: ${minYear} to ${maxYear}`}
            aria-valuemin={minYear}
            aria-valuemax={maxYear}
            aria-valuenow={currentYear}
            aria-valuetext={`Year ${currentYear}`}
          />
        </div>

        {/* Help Text */}
        <div className="text-xs text-white/60 text-center">
          Drag to see plant growth • Arrow keys to step • Space to play/pause • Home/End to jump
        </div>
      </div>

      <style jsx>{`
        .slider-thumb::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #22c55e;
          border: 2px solid white;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
          transition: transform 0.1s ease;
        }

        .slider-thumb::-webkit-slider-thumb:hover {
          transform: scale(1.1);
        }

        .slider-thumb::-webkit-slider-thumb:active {
          transform: scale(0.95);
        }

        .slider-thumb::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #22c55e;
          border: 2px solid white;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
          transition: transform 0.1s ease;
        }

        .slider-thumb::-moz-range-thumb:hover {
          transform: scale(1.1);
        }

        .slider-thumb::-moz-range-thumb:active {
          transform: scale(0.95);
        }
      `}</style>
    </div>
  );
}
