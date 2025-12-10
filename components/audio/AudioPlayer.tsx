'use client';

import React from 'react';
import { useAudio } from '@/components/audio/AudioProvider';
import AudioControls from '@/components/audio/AudioControls';
import ProgressBar from '@/components/audio/ProgressBar';
import Playlist from '@/components/audio/Playlist';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { X, ChevronDown } from 'lucide-react';

interface AudioPlayerProps {
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

const AudioPlayer = ({ isMobileOpen = false, onMobileClose }: AudioPlayerProps) => {
  const {
    isPlaying,
    currentTrackIndex,
    isLoading,
    tracks,
    setCurrentTrack
  } = useAudio();

  const [isDesktopExpanded, setIsDesktopExpanded] = React.useState(false);

  const currentTrack = currentTrackIndex !== null ? tracks[currentTrackIndex] : null;

  return (
    <>
      {/* Desktop Player - Fixed at bottom */}
      <div className={cn(
        "hidden md:block fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 transition-all duration-300 z-50",
        isDesktopExpanded ? "h-64" : "h-16"
      )}>
        {/* Collapsed Desktop Player Bar */}
        <div
          className={cn(
            "flex items-center justify-between p-2 h-16 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800",
            isDesktopExpanded ? "hidden" : "block"
          )}
        >
          <div className="flex items-center space-x-3 w-full">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsDesktopExpanded(true)}
              className="p-1"
            >
              <span className="text-xs text-gray-500 dark:text-gray-400">Expand Player</span>
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

        {/* Expanded Desktop Player */}
        <div className={isDesktopExpanded ? "block h-full" : "hidden"}>
          <div className="flex flex-col h-full p-4">
            {/* Header with collapse button */}
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Permaculture Music</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsDesktopExpanded(false)}
              >
                Collapse Player
              </Button>
            </div>

            {/* Track info and controls */}
            <div className="flex flex-col md:flex-row items-center gap-6 mb-4">
              <div className="flex flex-col items-center">
                <div className="bg-gray-200 dark:bg-gray-700 border-2 border-dashed rounded-xl w-16 h-16 flex items-center justify-center" />
                <div className="mt-2 text-center">
                  {currentTrack ? (
                    <>
                      <p className="font-medium">{currentTrack.title}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{currentTrack.artist}</p>
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
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Player - Slide-up drawer */}
      {isMobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="md:hidden fixed inset-0 bg-black/50 z-[70] animate-in fade-in duration-200"
            onClick={onMobileClose}
          />

          {/* Mobile Player Drawer */}
          <div className="md:hidden fixed bottom-0 left-0 right-0 z-[75] bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 rounded-t-2xl shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[80vh] flex flex-col">
            {/* Drag Handle */}
            <div className="flex justify-center py-2 border-b border-gray-200 dark:border-gray-800">
              <div className="w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-semibold">Permaculture Music</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={onMobileClose}
                className="h-8 w-8"
              >
                <ChevronDown className="h-5 w-5" />
              </Button>
            </div>

            {/* Current Track Info */}
            {currentTrack && (
              <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center space-x-4">
                  <div className="bg-gray-200 dark:bg-gray-700 border-2 border-dashed rounded-lg w-16 h-16 flex items-center justify-center flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-base truncate">{currentTrack.title}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{currentTrack.artist}</p>
                  </div>
                  {isPlaying && (
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse flex-shrink-0"></div>
                  )}
                </div>

                {/* Progress Bar */}
                <div className="mt-4">
                  <ProgressBar />
                </div>

                {/* Controls */}
                <div className="flex justify-center mt-4">
                  <AudioControls />
                </div>
              </div>
            )}

            {/* Playlist */}
            <div className="flex-1 overflow-y-auto p-4">
              <Playlist
                onSelectTrack={(index) => {
                  setCurrentTrack(index);
                }}
              />
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default AudioPlayer;
