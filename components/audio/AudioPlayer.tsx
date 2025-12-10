'use client';

import React from 'react';
import { useAudio } from '@/components/audio/AudioProvider';
import AudioControls from '@/components/audio/AudioControls';
import ProgressBar from '@/components/audio/ProgressBar';
import Playlist from '@/components/audio/Playlist';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const AudioPlayer = () => {
  const { 
    isPlaying, 
    currentTrackIndex, 
    isLoading, 
    tracks,
    setCurrentTrack 
  } = useAudio();
  
  const [isExpanded, setIsExpanded] = React.useState(false);
  
  const currentTrack = currentTrackIndex !== null ? tracks[currentTrackIndex] : null;

  return (
    <div className={cn(
      "fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 transition-all duration-300 z-50",
      isExpanded ? "h-64" : "h-16"
    )}>
      {/* Collapsed Player Bar */}
      <div 
        className={cn(
          "flex items-center justify-between p-2 h-full transition-colors hover:bg-gray-50",
          isExpanded ? "hidden" : "block"
        )}
      >
        <div className="flex items-center space-x-3 w-full">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(true)}
            className="p-1"
          >
            <span className="text-xs text-gray-500">Expand Player</span>
          </Button>
          
          {currentTrack ? (
            <div className="flex items-center flex-1 min-w-0">
              <div className="flex items-center space-x-2 min-w-0">
                {isPlaying ? (
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                ) : (
                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{currentTrack.title}</p>
                  <p className="text-xs text-gray-500 truncate">{currentTrack.artist}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 text-sm text-gray-500 italic">
              No track selected
            </div>
          )}
          
          <div className="flex items-center space-x-2">
            <AudioControls isCompact={true} />
          </div>
        </div>
      </div>
      
      {/* Expanded Player */}
      <div className={isExpanded ? "block h-full" : "hidden"}>
        <div className="flex flex-col h-full p-4">
          {/* Header with collapse button */}
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Permaculture Music</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(false)}
            >
              Collapse Player
            </Button>
          </div>
          
          {/* Track info and controls */}
          <div className="flex flex-col md:flex-row items-center gap-6 mb-4">
            <div className="flex flex-col items-center">
              <div className="bg-gray-200 border-2 border-dashed rounded-xl w-16 h-16 flex items-center justify-center" />
              <div className="mt-2 text-center">
                {currentTrack ? (
                  <>
                    <p className="font-medium">{currentTrack.title}</p>
                    <p className="text-sm text-gray-600">{currentTrack.artist}</p>
                  </>
                ) : (
                  <p className="text-gray-500 italic">Select a track</p>
                )}
              </div>
            </div>
            
            <div className="flex-1 max-w-md">
              <ProgressBar />
              <div className="flex justify-center mt-4">
                <AudioControls />
              </div>
            </div>
          </div>
          
          {/* Playlist */}
          <div className="flex-1 overflow-y-auto">
            <Playlist 
              onSelectTrack={(index) => {
                setCurrentTrack(index);
                if (!isPlaying) {
                  // If not playing, start playback after selecting track
                  setTimeout(() => {
                    // We can't directly call play here because the audio context is managed in the provider
                    // The setCurrentTrack function will start playback if it was already playing
                  }, 100);
                }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AudioPlayer;