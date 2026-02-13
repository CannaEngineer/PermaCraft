'use client';

import React from 'react';
import { useAudio } from '@/components/audio/AudioProvider';
import { Button } from '@/components/ui/button';
import { SkipBack, SkipForward, Play, Pause } from 'lucide-react';

interface CompactMusicControllerProps {
  onOpenPlayer: () => void;
}

export function CompactMusicController({ onOpenPlayer }: CompactMusicControllerProps) {
  const { isPlaying, play, pause, nextTrack, prevTrack, currentTrackIndex, tracks } = useAudio();

  const currentTrack = currentTrackIndex !== null ? tracks[currentTrackIndex] : null;

  const handleTogglePlayPause = () => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  };

  return (
    <div
      onClick={onOpenPlayer}
      className="hidden md:flex items-center gap-3 px-3 py-2 border-t border-border bg-muted/50 hover:bg-muted cursor-pointer transition-colors h-14"
    >
      {/* Controls */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            prevTrack();
          }}
          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
        >
          <SkipBack className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            handleTogglePlayPause();
          }}
          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            nextTrack();
          }}
          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
        >
          <SkipForward className="h-4 w-4" />
        </Button>
      </div>

      {/* Track info with marquee */}
      <div className="flex-1 min-w-0 marquee-container">
        {currentTrack ? (
          <div className="marquee text-sm font-mono text-green-600 dark:text-green-400">
            {currentTrack.artist} - {currentTrack.title} &nbsp;&nbsp;&nbsp; {currentTrack.artist} - {currentTrack.title}
          </div>
        ) : (
          <div className="text-sm font-mono text-green-600 dark:text-green-400 text-center">
            *** READY ***
          </div>
        )}
      </div>
    </div>
  );
}
