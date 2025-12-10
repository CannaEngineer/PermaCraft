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
    <div className="space-y-1">
      <h4 className="text-sm font-semibold text-gray-700 mb-2 px-2">
        Permaculture Playlist ({tracks.length} tracks)
      </h4>

      <div className="space-y-1">
        {tracks.map((track, index) => {
          const isCurrentTrack = currentTrackIndex === index;
          const isCurrentlyPlaying = isCurrentTrack && isPlaying;

          return (
            <button
              key={track.id}
              onClick={() => onSelectTrack(index)}
              className={cn(
                "w-full flex items-center space-x-3 p-2 rounded-lg transition-colors text-left",
                isCurrentTrack
                  ? "bg-green-50 border border-green-200"
                  : "hover:bg-gray-50 border border-transparent"
              )}
            >
              {/* Play indicator or track number */}
              <div className="w-8 flex items-center justify-center flex-shrink-0">
                {isCurrentlyPlaying ? (
                  <div className="flex space-x-0.5">
                    <div className="w-1 h-3 bg-green-500 animate-pulse" style={{ animationDelay: '0ms' }} />
                    <div className="w-1 h-3 bg-green-500 animate-pulse" style={{ animationDelay: '150ms' }} />
                    <div className="w-1 h-3 bg-green-500 animate-pulse" style={{ animationDelay: '300ms' }} />
                  </div>
                ) : isCurrentTrack ? (
                  <Play className="h-4 w-4 text-green-600" />
                ) : (
                  <span className="text-xs text-gray-400">{index + 1}</span>
                )}
              </div>

              {/* Track info */}
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "text-sm font-medium truncate",
                    isCurrentTrack ? "text-green-700" : "text-gray-900"
                  )}
                >
                  {track.title}
                </p>
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  <span className="truncate">{track.artist}</span>
                  {track.theme && (
                    <>
                      <span>•</span>
                      <span className="capitalize">{track.theme.replace('-', ' ')}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Duration */}
              <div className="text-xs text-gray-500 flex-shrink-0">
                {track.duration}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Playlist;
