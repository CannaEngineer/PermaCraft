'use client';

import React from 'react';
import { useAudio } from '@/components/audio/AudioProvider';
import AudioControls from '@/components/audio/AudioControls';
import ProgressBar from '@/components/audio/ProgressBar';
import Playlist from '@/components/audio/Playlist';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { X, ChevronDown, ChevronUp, Minimize2 } from 'lucide-react';

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

  const [isDesktopExpanded, setIsDesktopExpanded] = React.useState(true);

  const currentTrack = currentTrackIndex !== null ? tracks[currentTrackIndex] : null;

  return (
    <>
      {/* Desktop Player - Winamp-style, Fixed at bottom */}
      <div className={cn(
        "hidden md:block fixed bottom-0 left-0 right-0 transition-all duration-300 z-[30]",
        isDesktopExpanded ? "h-80" : "h-16"
      )}
      style={{
        background: isDesktopExpanded
          ? 'linear-gradient(180deg, #2d3748 0%, #1a202c 100%)'
          : 'linear-gradient(90deg, #2d3748 0%, #1a202c 100%)'
      }}
      >
        {/* Collapsed Desktop Player Bar */}
        <div
          className={cn(
            "flex items-center justify-between px-3 h-16",
            isDesktopExpanded ? "hidden" : "flex"
          )}
        >
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsDesktopExpanded(true)}
              className="text-green-400 hover:text-green-300 hover:bg-gray-700"
            >
              <ChevronUp className="h-4 w-4 mr-1" />
              <span className="text-xs">Expand</span>
            </Button>

            {currentTrack ? (
              <div className="flex items-center flex-1 min-w-0 space-x-3">
                {isPlaying ? (
                  <div className="flex space-x-0.5 items-end h-4">
                    <div className="w-1 bg-green-400 rounded-sm animate-pulse" style={{ height: '60%', animationDelay: '0ms' }} />
                    <div className="w-1 bg-green-400 rounded-sm animate-pulse" style={{ height: '100%', animationDelay: '150ms' }} />
                    <div className="w-1 bg-green-400 rounded-sm animate-pulse" style={{ height: '80%', animationDelay: '300ms' }} />
                  </div>
                ) : (
                  <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-green-400 truncate">{currentTrack.title}</p>
                  <p className="text-xs text-gray-400 truncate">{currentTrack.artist}</p>
                </div>
              </div>
            ) : (
              <div className="flex-1 text-sm text-gray-400 italic">
                No track selected
              </div>
            )}

            <div className="flex items-center">
              <AudioControls isCompact={true} />
            </div>
          </div>
        </div>

        {/* Expanded Desktop Player - Winamp Style */}
        <div className={cn("h-full flex flex-col", isDesktopExpanded ? "flex" : "hidden")}>
          {/* Title Bar */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700 bg-gradient-to-r from-gray-700 to-gray-800">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <h3 className="text-sm font-bold text-green-400 tracking-wide">PERMACRAFT MUSIC PLAYER</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsDesktopExpanded(false)}
              className="h-6 text-gray-400 hover:text-white hover:bg-gray-700"
            >
              <Minimize2 className="h-3 w-3" />
            </Button>
          </div>

          {/* Main Player Area */}
          <div className="flex flex-1 min-h-0">
            {/* Left: Track Display & Controls */}
            <div className="w-80 border-r border-gray-700 flex flex-col p-4 bg-gray-800/50">
              {/* VU Meter / Display */}
              <div className="bg-black/40 border border-gray-600 rounded p-3 mb-4 h-20 flex items-center justify-center">
                {currentTrack ? (
                  <div className="text-center w-full">
                    <div className="text-green-400 font-mono text-sm truncate px-2">{currentTrack.title}</div>
                    <div className="text-green-500/70 font-mono text-xs truncate px-2 mt-1">{currentTrack.artist}</div>
                  </div>
                ) : (
                  <div className="text-green-500/50 font-mono text-xs">*** READY ***</div>
                )}
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <ProgressBar />
              </div>

              {/* Controls */}
              <div className="flex justify-center mb-4">
                <AudioControls />
              </div>

              {/* Track Info */}
              {currentTrack && (
                <div className="mt-auto bg-black/30 border border-gray-600 rounded p-3">
                  <div className="text-xs text-gray-400 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Theme:</span>
                      <span className="text-green-400 capitalize">{currentTrack.theme?.replace('-', ' ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Duration:</span>
                      <span className="text-green-400">{currentTrack.duration}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Playlist */}
            <div className="flex-1 flex flex-col min-w-0 bg-gray-900/30">
              <div className="p-3 border-b border-gray-700 bg-gray-800/30">
                <h4 className="text-xs font-bold text-green-400 tracking-wider">
                  PLAYLIST • {tracks.length} TRACKS
                </h4>
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                <Playlist
                  onSelectTrack={(index) => {
                    setCurrentTrack(index);
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Player - Slide-up drawer - Winamp Style */}
      {isMobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="md:hidden fixed inset-0 bg-black/50 z-[70] animate-in fade-in duration-200"
            onClick={onMobileClose}
          />

          {/* Mobile Player Drawer */}
          <div
            className="md:hidden fixed bottom-0 left-0 right-0 z-[75] rounded-t-2xl shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[85vh] flex flex-col"
            style={{
              background: 'linear-gradient(180deg, #2d3748 0%, #1a202c 100%)'
            }}
          >
            {/* Drag Handle */}
            <div className="flex justify-center py-2 border-b border-gray-700">
              <div className="w-12 h-1 bg-gray-600 rounded-full" />
            </div>

            {/* Title Bar */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 bg-gradient-to-r from-gray-700 to-gray-800">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <h3 className="text-sm font-bold text-green-400 tracking-wide">PERMACRAFT MUSIC</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onMobileClose}
                className="h-7 text-gray-400 hover:text-white hover:bg-gray-700"
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>

            {/* VU Display & Track Info */}
            <div className="p-4 border-b border-gray-700">
              <div className="bg-black/40 border border-gray-600 rounded p-3 mb-4">
                {currentTrack ? (
                  <div className="text-center">
                    <div className="text-green-400 font-mono text-sm truncate">{currentTrack.title}</div>
                    <div className="text-green-500/70 font-mono text-xs truncate mt-1">{currentTrack.artist}</div>
                  </div>
                ) : (
                  <div className="text-green-500/50 font-mono text-xs text-center">*** SELECT TRACK ***</div>
                )}
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <ProgressBar />
              </div>

              {/* Controls */}
              <div className="flex justify-center">
                <AudioControls />
              </div>
            </div>

            {/* Playlist */}
            <div className="flex-1 overflow-y-auto p-3 bg-gray-900/30">
              <div className="mb-2">
                <h4 className="text-xs font-bold text-green-400 tracking-wider">
                  PLAYLIST • {tracks.length} TRACKS
                </h4>
              </div>
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
