'use client';

import React from 'react';
import { useAudio } from '@/components/audio/AudioProvider';
import { Button } from '@/components/ui/button';
import { Play, Music } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlaylistProps {
  onSelectTrack: (index: number) => void;
}

const Playlist = ({ onSelectTrack }: PlaylistProps) => {
  const { tracks, currentTrackIndex, isPlaying } = useAudio();

  if (tracks.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        <Music className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>No tracks available</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {tracks.map((track, index) => {
        const isCurrentTrack = currentTrackIndex === index;
        const isCurrentlyPlaying = isCurrentTrack && isPlaying;

        return (
          <button
            key={track.id}
            onClick={() => onSelectTrack(index)}
            className={cn(
              "w-full flex items-center space-x-3 p-4 rounded transition-all text-left border",
              isCurrentTrack
                ? "bg-gradient-to-r from-green-900/40 to-green-800/30 border-green-500/50 shadow-lg"
                : "bg-gray-800/40 border-gray-700/50 hover:bg-gray-700/40 hover:border-gray-600/50"
            )}
          >
            {/* Play indicator or track number */}
            <div className="w-12 flex items-center justify-center flex-shrink-0">
              {isCurrentlyPlaying ? (
                <div className="flex space-x-1 items-end h-6">
                  <div className="w-1.5 bg-green-400 rounded-sm animate-pulse" style={{ height: '50%', animationDelay: '0ms' }} />
                  <div className="w-1.5 bg-green-400 rounded-sm animate-pulse" style={{ height: '100%', animationDelay: '150ms' }} />
                  <div className="w-1.5 bg-green-400 rounded-sm animate-pulse" style={{ height: '75%', animationDelay: '300ms' }} />
                </div>
              ) : isCurrentTrack ? (
                <Play className="h-6 w-6 text-green-400" fill="currentColor" />
              ) : (
                <span className="text-lg font-mono text-gray-500">{String(index + 1).padStart(2, '0')}</span>
              )}
            </div>

            {/* Track info */}
            <div className="flex-1 min-w-0">
              <p
                className={cn(
                  "text-base font-semibold truncate mb-1",
                  isCurrentTrack ? "text-green-400" : "text-gray-200"
                )}
              >
                {track.title}
              </p>
              <div className="flex items-center space-x-2 text-sm">
                <span className={cn("truncate", isCurrentTrack ? "text-green-400/80" : "text-gray-400")}>
                  {track.artist}
                </span>
                {track.theme && (
                  <>
                    <span className="text-gray-600">•</span>
                    <span className={cn("capitalize", isCurrentTrack ? "text-green-400/70" : "text-gray-500")}>
                      {track.theme.replace('-', ' ')}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Duration */}
            <div className={cn(
              "text-sm font-mono flex-shrink-0",
              isCurrentTrack ? "text-green-400" : "text-gray-500"
            )}>
              {track.duration}
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default Playlist;
