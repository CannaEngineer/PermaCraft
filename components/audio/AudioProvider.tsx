'use client';

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { AudioState, AudioContextType, Track } from '@/types/audio';
import tracksData from '@/data/tracks.json';

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
};

export const AudioProvider = ({ children }: { children: ReactNode }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [state, setState] = useState<AudioState>({
    isPlaying: false,
    currentTrackIndex: null,
    currentTime: 0,
    duration: 0,
    volume: 0.7, // Default to 70% volume
    isLoading: false,
    error: null,
  });

  // Initialize with tracks from data file
  const [tracks] = useState<Track[]>(tracksData as Track[]);

  // Update public URLs based on R2 configuration
  useEffect(() => {
    if (typeof window !== 'undefined' && process.env.R2_PUBLIC_URL) {
      const updatedTracks = tracks.map(track => ({
        ...track,
        publicUrl: `${process.env.R2_PUBLIC_URL}/${track.key}`
      }));
      
      // Update the tracks state if URLs have changed
      // In a real implementation, you'd update the state here
    }
  }, [tracks]);

  // Handle audio events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const setAudioData = () => {
      setState(prev => ({
        ...prev,
        duration: audio.duration || 0,
        currentTime: audio.currentTime,
      }));
    };

    const setAudioTime = () => {
      setState(prev => ({
        ...prev,
        currentTime: audio.currentTime,
      }));
    };

    const handleEnded = () => {
      handleNextTrack();
    };

    const handleError = () => {
      setState(prev => ({
        ...prev,
        isPlaying: false,
        error: 'Error playing audio',
      }));
    };

    audio.addEventListener('loadeddata', setAudioData);
    audio.addEventListener('timeupdate', setAudioTime);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('loadeddata', setAudioData);
      audio.removeEventListener('timeupdate', setAudioTime);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, []);

  const play = () => {
    if (audioRef.current) {
      audioRef.current.play().catch(error => {
        console.error('Error playing audio:', error);
        setState(prev => ({ ...prev, error: 'Playback failed' }));
      });
      setState(prev => ({ ...prev, isPlaying: true }));
    }
  };

  const pause = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setState(prev => ({ ...prev, isPlaying: false }));
    }
  };

  const setCurrentTrack = (index: number) => {
    if (index >= 0 && index < tracks.length) {
      setState(prev => ({
        ...prev,
        currentTrackIndex: index,
        currentTime: 0,
        isPlaying: true,
        error: null,
        isLoading: true,
      }));
    }
  };

  const setVolume = (volume: number) => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
      setState(prev => ({ ...prev, volume }));
    }
  };

  const setCurrentTime = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setState(prev => ({ ...prev, currentTime: time }));
    }
  };

  const handleNextTrack = () => {
    if (state.currentTrackIndex === null || tracks.length === 0) return;
    
    const nextIndex = (state.currentTrackIndex + 1) % tracks.length;
    setState(prev => ({
      ...prev,
      currentTrackIndex: nextIndex,
      currentTime: 0,
      isPlaying: true,
      isLoading: true,
      error: null,
    }));
  };

  const handlePrevTrack = () => {
    if (state.currentTrackIndex === null || tracks.length === 0) return;
    
    const prevIndex = (state.currentTrackIndex - 1 + tracks.length) % tracks.length;
    setState(prev => ({
      ...prev,
      currentTrackIndex: prevIndex,
      currentTime: 0,
      isPlaying: true,
      isLoading: true,
      error: null,
    }));
  };

  // Update audio source when track changes
  useEffect(() => {
    if (state.currentTrackIndex !== null && audioRef.current) {
      const track = tracks[state.currentTrackIndex];
      if (track) {
        audioRef.current.src = track.publicUrl;
        // After setting the source, we need to load and then play
        audioRef.current.load();
        setTimeout(() => {
          if (state.isPlaying) {
            play();
          }
          setState(prev => ({ ...prev, isLoading: false }));
        }, 100);
      }
    }
  }, [state.currentTrackIndex]);

  // Update playback state when isPlaying changes
  useEffect(() => {
    if (audioRef.current) {
      if (state.isPlaying) {
        play();
      } else {
        pause();
      }
    }
  }, [state.isPlaying]);

  // Set volume on audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = state.volume;
    }
  }, [state.volume]);

  return (
    <AudioContext.Provider
      value={{
        ...state,
        play,
        pause,
        setCurrentTrack,
        setVolume,
        setCurrentTime,
        nextTrack: handleNextTrack,
        prevTrack: handlePrevTrack,
        tracks,
      }}
    >
      {children}
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        onLoadedData={() => setState(prev => ({ ...prev, isLoading: false }))}
      />
    </AudioContext.Provider>
  );
};