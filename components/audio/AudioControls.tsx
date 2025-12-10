'use client';

import React from 'react';
import { useAudio } from '@/components/audio/AudioProvider';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX
} from 'lucide-react';

interface AudioControlsProps {
  isCompact?: boolean;
}

const AudioControls = ({ isCompact = false }: AudioControlsProps) => {
  const {
    isPlaying,
    play,
    pause,
    nextTrack,
    prevTrack,
    volume,
    setVolume,
    currentTrackIndex
  } = useAudio();

  const [showVolumeSlider, setShowVolumeSlider] = React.useState(false);

  const handlePlayPause = () => {
    if (currentTrackIndex === null) {
      // If no track is selected, don't do anything
      return;
    }
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  };

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0]);
  };

  const toggleMute = () => {
    if (volume > 0) {
      setVolume(0);
    } else {
      setVolume(0.7);
    }
  };

  if (isCompact) {
    return (
      <div className="flex items-center space-x-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={prevTrack}
          disabled={currentTrackIndex === null}
          className="h-8 w-8 p-0"
        >
          <SkipBack className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={handlePlayPause}
          disabled={currentTrackIndex === null}
          className="h-8 w-8 p-0"
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={nextTrack}
          disabled={currentTrackIndex === null}
          className="h-8 w-8 p-0"
        >
          <SkipForward className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-4">
      {/* Previous Track */}
      <Button
        variant="ghost"
        size="icon"
        onClick={prevTrack}
        disabled={currentTrackIndex === null}
      >
        <SkipBack className="h-5 w-5" />
      </Button>

      {/* Play/Pause */}
      <Button
        variant="default"
        size="icon"
        onClick={handlePlayPause}
        disabled={currentTrackIndex === null}
        className="h-12 w-12"
      >
        {isPlaying ? (
          <Pause className="h-6 w-6" />
        ) : (
          <Play className="h-6 w-6" />
        )}
      </Button>

      {/* Next Track */}
      <Button
        variant="ghost"
        size="icon"
        onClick={nextTrack}
        disabled={currentTrackIndex === null}
      >
        <SkipForward className="h-5 w-5" />
      </Button>

      {/* Volume Control */}
      <div className="flex items-center space-x-2 ml-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleMute}
          onMouseEnter={() => setShowVolumeSlider(true)}
        >
          {volume === 0 ? (
            <VolumeX className="h-5 w-5" />
          ) : (
            <Volume2 className="h-5 w-5" />
          )}
        </Button>

        {showVolumeSlider && (
          <div
            className="w-24"
            onMouseLeave={() => setShowVolumeSlider(false)}
          >
            <Slider
              value={[volume]}
              min={0}
              max={1}
              step={0.01}
              onValueChange={handleVolumeChange}
              className="cursor-pointer"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default AudioControls;
