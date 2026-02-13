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
  mode?: 'sidebar' | 'bottom';
}

const AudioPlayer = ({ isMobileOpen = false, onMobileClose, mode = 'sidebar' }: AudioPlayerProps) => {
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
      {/* Desktop Player - Sidebar mode (Winamp-style) */}
      {mode === 'sidebar' && (
        <div
          className="hidden md:flex flex-col transition-all duration-300"
          style={{
            background: 'linear-gradient(180deg, #2d3748 0%, #1a202c 100%)'
          }}
        >
          {/* Title Bar */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700 bg-gradient-to-r from-gray-700 to-gray-800">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <h3 className="text-xs font-bold text-green-400 tracking-wide">MUSIC</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsDesktopExpanded(!isDesktopExpanded)}
              className="h-6 text-gray-400 hover:text-white hover:bg-gray-700"
            >
              {isDesktopExpanded ? <Minimize2 className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
            </Button>
          </div>

          {/* VU Meter / Display */}
          <div className="p-3">
            <div className="bg-black/40 border border-gray-600 rounded p-2 flex items-center justify-center min-h-[60px]">
              {currentTrack ? (
                <div className="text-center w-full">
                  <div className="text-green-400 font-mono text-xs truncate px-1">{currentTrack.title}</div>
                  <div className="text-green-500/70 font-mono text-[10px] truncate px-1 mt-0.5">{currentTrack.artist}</div>
                </div>
              ) : (
                <div className="text-green-500/50 font-mono text-xs">*** READY ***</div>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="px-3 pb-2">
            <ProgressBar />
          </div>

          {/* Controls */}
          <div className="flex justify-center pb-3">
            <AudioControls isCompact={true} />
          </div>

          {/* Expanded Playlist */}
          {isDesktopExpanded && (
            <div className="flex-1 flex flex-col min-w-0 bg-gray-900/30 border-t border-gray-700 max-h-64">
              <div className="p-2 border-b border-gray-700 bg-gray-800/30">
                <h4 className="text-[10px] font-bold text-green-400 tracking-wider">
                  PLAYLIST • {tracks.length}
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
          )}

          {/* Track Info - only when not expanded */}
          {!isDesktopExpanded && currentTrack && (
            <div className="px-3 pb-3">
              <div className="bg-black/30 border border-gray-600 rounded p-2">
                <div className="text-[10px] text-gray-400 space-y-0.5">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Theme:</span>
                    <span className="text-green-400 capitalize truncate ml-2">{currentTrack.theme?.replace('-', ' ')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Duration:</span>
                    <span className="text-green-400">{currentTrack.duration}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

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
                <h3 className="text-sm font-bold text-green-400 tracking-wide">PERMACULTURE.STUDIO MUSIC</h3>
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
