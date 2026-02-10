✦ Permaculture Music Player Implementation Plan

  Overview
  This document outlines the implementation plan for adding a music player
  to the Permaculture.Studio permaculture design application. The goal is to
  integrate permaculture-specific songs to enhance the user experience
  while designing sustainable landscapes.

  Goals
   - Integrate a music player that plays permaculture-specific songs
   - Provide a seamless user experience that doesn't disrupt the core design
     workflow
   - Utilize existing infrastructure and UI components
   - Maintain performance standards of the application

  Implementation Strategy

  Phase 1: Setup and Infrastructure
   1. Audio Hosting Decision
      - Evaluate using existing R2 storage vs. public folder approach
      - Prepare audio files in web-friendly formats (MP3, OGG)
      - Organize permaculture-specific songs appropriately

   2. Data Structure
      - Create song metadata file (JSON format)
      - Include details: title, artist, duration, filename, permaculture
        theme
      - Structure for potential future expansion (playlists, user favorites)

  Phase 2: Core Components
   1. Audio Context Provider
      - Create a React context to manage global audio state
      - Track: current track, playback status, volume, progress
      - Handle state across different app sections

   2. Custom Audio Player Component
      - Build using HTML5 audio API
      - Style with existing shadcn/ui components and Tailwind CSS
      - Ensure responsive design across device sizes

   3. Player Controls
      - Play/pause functionality
      - Previous/next track navigation
      - Volume control
      - Progress bar with seek capability

   4. Playlist Component
      - Display available permaculture tracks
      - Allow users to select and queue tracks
      - Show currently playing indicator

  Phase 3: Integration
   1. Layout Integration
      - Add persistent audio player to main layout
      - Position as bottom bar for consistent accessibility
      - Ensure doesn't interfere with map design tools

   2. State Management
      - Integrate with existing application state patterns
      - Sync with user session if needed
      - Handle player persistence across page navigations

   3. Styling
      - Match existing application design aesthetic
      - Use consistent color schemes and typography
      - Ensure accessibility compliance

  Phase 4: Advanced Features (Optional)
   1. Audio Visualization
      - Add simple waveform or frequency visualization
      - Keep visualizations subtle to not distract from core tasks

   2. Enhanced Playlist Features
      - Allow users to create custom playlists
      - Permaculture-themed playlists (e.g., "Forest Garden", "Food Forest",
        "Seasonal")

   3. Offline Support
      - Implement service workers to cache audio files
      - Allow offline listening capability

   4. Background Play
      - Ensure audio continues during navigation
      - Handle player state across different app sections

  Technical Implementation Details

  New Files to Create
   - components/audio/AudioPlayer.tsx - Main player component
   - components/audio/AudioControls.tsx - Play/pause/volume controls
   - components/audio/ProgressBar.tsx - Progress indicator
   - context/AudioContext.tsx - Global audio state management
   - types/audio.ts - TypeScript interfaces for audio data
   - data/songs.json - Metadata for permaculture tracks
   - hooks/useAudio.ts - Custom audio hooks if needed

  Audio Hosting Options
   1. Public folder approach (simplest implementation):
      - Store MP3 files in /public/audio/
      - Direct access to files without additional setup
      - Suitable for small number of audio files

   2. R2/S3 hosting (utilize existing infrastructure):
      - Use existing R2 configuration if already set up
      - Better scalability for larger audio libraries
      - Requires CDN for optimal global delivery

  Performance Considerations
   - Lazy load the audio player component to avoid impacting initial page
     load
   - Preload metadata but not full audio files until requested
   - Use efficient audio formats to balance quality with file size
   - Implement proper cleanup of audio resources to prevent memory leaks
   - Consider progressive loading for longer tracks

  User Experience Considerations
   - Ensure the player doesn't distract from the primary design workflow
   - Provide easy mute/pause functionality
   - Make the player collapsible/adjustable in size
   - Consider permaculture-themed visual elements that align with the
     application's green/sustainable theme
   - Ensure controls are intuitive and accessible

  Hosting Considerations

  YouTube Integration (Alternative Approach)
   - If pursuing this route, embed YouTube player via iframe
   - Link to your YouTube channel for maximum visibility
   - Note that this approach provides less control over UX within the
     application
   - May be more limiting in terms of playlist management and integration
     with permaculture themes

  Recommendation
  For optimal user experience within the application, self-hosting with a
  custom player implementation is recommended. This provides better
  integration with the application's UI, maintains user focus within the
  app, and allows for permaculture-themed features.

  Timeline Estimates
   - Phase 1: 1-2 days
   - Phase 2: 3-4 days
   - Phase 3: 1-2 days
   - Phase 4: 2-3 days (optional features)

  Total estimated time: 5-8 days for core features with additional time
  for optional enhancements.