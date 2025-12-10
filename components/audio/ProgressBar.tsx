'use client';

import React from 'react';
import { useAudio } from '@/components/audio/AudioProvider';
import { Slider } from '@/components/ui/slider';

const ProgressBar = () => {
  const { currentTime, duration, setCurrentTime, currentTrackIndex } = useAudio();

  const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || !isFinite(seconds)) {
      return '0:00';
    }
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSeek = (value: number[]) => {
    setCurrentTime(value[0]);
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="w-full">
      {/* Progress Slider */}
      <div className="flex items-center space-x-2">
        <span className="text-xs text-gray-600 min-w-[40px]">
          {formatTime(currentTime)}
        </span>

        <Slider
          value={[currentTime]}
          min={0}
          max={duration || 100}
          step={0.1}
          onValueChange={handleSeek}
          disabled={currentTrackIndex === null || duration === 0}
          className="flex-1 cursor-pointer"
        />

        <span className="text-xs text-gray-600 min-w-[40px]">
          {formatTime(duration)}
        </span>
      </div>

      {/* Visual Progress Bar (optional alternative/supplement) */}
      <div className="mt-1 w-full h-1 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-green-500 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;
