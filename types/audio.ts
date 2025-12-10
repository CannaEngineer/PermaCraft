export interface Track {
  id: number;
  title: string;
  artist: string;
  key: string; // R2 object key
  duration: string; // formatted as MM:SS
  seconds: number; // duration in seconds
  theme?: string;
  publicUrl: string; // Public URL for the audio file
}

export interface AudioState {
  isPlaying: boolean;
  currentTrackIndex: number | null;
  currentTime: number;
  duration: number;
  volume: number;
  isLoading: boolean;
  error: string | null;
}

export interface AudioContextType extends AudioState {
  play: () => void;
  pause: () => void;
  setCurrentTrack: (index: number) => void;
  setVolume: (volume: number) => void;
  setCurrentTime: (time: number) => void;
  nextTrack: () => void;
  prevTrack: () => void;
  tracks: Track[];
}