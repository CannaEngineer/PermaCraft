# Product Feedback Implementation Design

**Date:** 2026-02-13
**Status:** Approved
**Type:** Multi-Phase Enhancement

## Overview

This design document addresses comprehensive product feedback from UI/UX, Frontend, Content Strategy, and Product Management perspectives. The implementation is structured in phases to deliver incremental value while maintaining system stability.

### Design Goals

1. **Improve Map Workspace UX**: Eliminate toolbar occlusion, expand FAB functionality
2. **Enhance Mobile Experience**: Integrate music player, improve theme access, expand quick actions
3. **Optimize Content Density**: Compact plant catalog, implement feed truncation
4. **Future-Proof Blog**: Document research-driven blog engine for Phase 4+

### Implementation Approach

**Phased Incremental Rollout**: Deliver each phase independently with separate deployments, allowing for feedback and iteration between phases.

**Total Timeline**: 11 days (Phases 1-3)

---

## Phase 1: Map & Drawing UX Improvements (Days 1-3)

### 1.1 Drawing Toolbar Relocation

#### Problem Statement

The `DrawingToolbar` positioned on the right side causes occlusion with the map info bar, creating usability issues during drawing operations.

#### Solution

Relocate toolbar to the left side as a persistent vertical rail, following design tool conventions (Figma, Adobe) and freeing right-side space for map controls.

#### Implementation Details

**Component**: `components/immersive-map/drawing-toolbar.tsx`

**Position Changes:**
```tsx
// Before
className="fixed right-4 top-1/2 -translate-y-1/2 z-30..."

// After
className="fixed left-4 top-1/2 -translate-y-1/2 z-30..."
```

**Animation Updates:**
```tsx
// Slide in from left instead of right
<motion.div
  initial={{ x: -100, opacity: 0 }}
  animate={{ x: 0, opacity: 1 }}
  exit={{ x: -100, opacity: 0 }}
  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
>
```

**Tooltip Direction:**
- Tooltips now appear on RIGHT side of toolbar (opposite of button)
- Prevents edge cutoff on left viewport boundary

**Visual Design:**
- Maintains glassmorphism styling: `glass-panel rounded-2xl`
- Width: 64px (unchanged)
- Z-index: 30 (unchanged, no conflicts)
- Distance from edge: 16px (`left-4`)

**Mobile Behavior:**
- No changes to mobile implementation
- Remains horizontal toolbar at bottom
- 64px height, full width, scrollable

**Benefits:**
- Eliminates occlusion with right-side controls
- More intuitive for left-to-right workflows
- Follows industry-standard tool placement
- Frees right side for future controls

---

### 1.2 Map FAB Speed Dial Expansion

#### Problem Statement

Map page lacks quick access to common actions. Users must navigate through multiple steps to create posts, add plantings, or upload photos from the map view.

#### Solution

Implement enhanced FAB with speed dial menu containing 4 context-aware actions: Draw Shape, Drop Pin, Create Post, Upload Photo.

#### Component Architecture

**New Component**: `components/immersive-map/map-fab.tsx`

**Extends**: Existing `components/ui/fab.tsx` (speed dial support already built)

**Integration**: Place in `ImmersiveMapEditor` component alongside other UI overlays

#### FAB Actions Specification

**1. Draw Shape**
- **Icon**: `Square` (lucide-react)
- **Color**: `bg-blue-600`
- **Action**: Triggers `enterDrawingMode()` from `ImmersiveMapUIContext`
- **Flow**:
  1. FAB closes
  2. DrawingToolbar appears on left
  3. User selects zone type and draws
  4. Quick label form appears in BottomDrawer

**2. Drop Pin**
- **Icon**: `MapPin` (lucide-react)
- **Color**: `bg-green-600`
- **Action**: Opens species picker in BottomDrawer
- **Flow**:
  1. FAB closes
  2. BottomDrawer slides up with species catalog
  3. User selects species
  4. Map cursor changes to crosshair
  5. User clicks location
  6. Planting created, marker appears

**3. Create Post**
- **Icon**: `MessageSquare` (lucide-react)
- **Color**: `bg-purple-600`
- **Action**: Opens `CreatePostDialog` with farm context pre-filled
- **Flow**:
  1. FAB closes
  2. Dialog opens (center-screen)
  3. Farm context auto-populated
  4. User writes content, adds media
  5. Post saved to `farm_posts` table
  6. Success toast appears

**4. Upload Photo**
- **Icon**: `Upload` (lucide-react)
- **Color**: `bg-orange-600`
- **Action**: Opens native file picker for image upload
- **Flow**:
  1. FAB closes
  2. File picker opens
  3. User selects image(s)
  4. Upload to R2 storage
  5. Creates `farm_posts` entry with `media_urls`
  6. Optional caption dialog

#### Implementation Code

```tsx
// components/immersive-map/map-fab.tsx
'use client';

import { FAB, FABAction } from '@/components/ui/fab';
import { Square, MapPin, MessageSquare, Upload } from 'lucide-react';
import { useImmersiveMapUI } from '@/contexts/immersive-map-ui-context';

interface MapFABProps {
  onCreatePost: () => void;
  onUploadPhoto: () => void;
  onDropPin: () => void;
}

export function MapFAB({ onCreatePost, onUploadPhoto, onDropPin }: MapFABProps) {
  const { enterDrawingMode } = useImmersiveMapUI();

  const actions: FABAction[] = [
    {
      icon: <Square className="h-5 w-5" />,
      label: 'Draw Shape',
      onClick: enterDrawingMode,
      color: 'bg-blue-600 text-white'
    },
    {
      icon: <MapPin className="h-5 w-5" />,
      label: 'Drop Pin',
      onClick: onDropPin,
      color: 'bg-green-600 text-white'
    },
    {
      icon: <MessageSquare className="h-5 w-5" />,
      label: 'Create Post',
      onClick: onCreatePost,
      color: 'bg-purple-600 text-white'
    },
    {
      icon: <Upload className="h-5 w-5" />,
      label: 'Upload Photo',
      onClick: onUploadPhoto,
      color: 'bg-orange-600 text-white'
    }
  ];

  return (
    <FAB
      actions={actions}
      ariaLabel="Map actions"
      className="md:bottom-24 md:right-8"
    />
  );
}
```

#### Position & Styling

- **Desktop**: `bottom-24 right-8` (above any bottom UI)
- **Mobile**: `bottom-[88px] right-6` (above bottom nav bar)
- **Z-index**: 45 (above map controls, below modals)
- **Size**: 56x56px main button, 48x48px action buttons

#### State Management

**Add to `ImmersiveMapUIContext`:**
```tsx
interface ImmersiveMapUIState {
  // ... existing state
  mapFabExpanded: boolean;
  setMapFabExpanded: (expanded: boolean) => void;
}
```

**Interaction Rules:**
- FAB collapses when entering drawing mode
- FAB hidden when chat overlay open
- FAB visible when BottomDrawer open (non-conflicting)

#### Mobile Considerations

- Touch targets: 56px minimum (WCAG AAA)
- Action labels slide in from right with stagger animation (50ms delay each)
- Backdrop darkens map when expanded (`bg-black/20`)
- Tap backdrop to close
- Swipe down on FAB to dismiss

---

## Phase 2: Mobile Experience Enhancements (Days 4-8)

### 2.1 Avatar Menu Redesign with Music Player Integration

#### Problem Statement

- Music player uses separate full-screen mobile drawer, cluttering UI
- Theme toggle is clunky on mobile
- No central location for user preferences and quick actions

#### Solution

Integrate compact music player into existing avatar menu (accessed via user initials button), consolidate appearance settings, and remove redundant mobile drawer.

#### Avatar Menu Structure

**Current Sections:**
- Plants
- Admin
- Appearance

**New Structure:**
```
┌─────────────────────────────────┐
│ User Profile                    │
│ Daniel Smith • daniel@email.com │
├─────────────────────────────────┤
│ 🎵 Music Player                 │
│ ┌─────────────────────────────┐ │
│ │ Now Playing:                │ │
│ │ Track Name - Artist Name    │ │
│ │                             │ │
│ │ [⏮] [▶️/⏸] [⏭]              │ │
│ │ ──────●─────── 2:34 / 4:12 │ │
│ │                             │ │
│ │ [🎵 View Playlist ▼]        │ │
│ └─────────────────────────────┘ │
├─────────────────────────────────┤
│ 🌱 Plants                       │
│ 🔧 Admin                        │
│ 🎨 Appearance                   │
│   • Theme: [Modern ▼]           │
│     ○ Modern (Default)          │
│     ○ Windows XP Retro          │
│     ○ Neon                      │
│     ○ True Dark (OLED)          │
│   • Dark Mode: [Toggle]         │
│   • Reduce Motion: [Toggle]     │
├─────────────────────────────────┤
│ 🚪 Sign Out                     │
└─────────────────────────────────┘
```

#### Music Player Section Design

**Component**: `components/shared/avatar-menu-with-music.tsx`

**Visual Styling:**
```tsx
<div className="bg-muted/50 border border-border rounded-lg p-3 mb-3">
  {/* Track Display */}
  <div className="mb-2">
    <div className="text-xs text-muted-foreground mb-1">Now Playing:</div>
    <div className="text-sm font-medium truncate">{track.title}</div>
    <div className="text-xs text-muted-foreground truncate">{track.artist}</div>
  </div>

  {/* Controls */}
  <div className="flex items-center justify-center gap-2 mb-2">
    <Button size="sm" variant="ghost" onClick={prevTrack}>
      <SkipBack className="h-4 w-4" />
    </Button>
    <Button size="sm" variant="default" onClick={togglePlay}>
      {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
    </Button>
    <Button size="sm" variant="ghost" onClick={nextTrack}>
      <SkipForward className="h-4 w-4" />
    </Button>
  </div>

  {/* Progress Bar */}
  <div className="mb-2">
    <ProgressBar className="h-1" />
    <div className="flex justify-between text-xs text-muted-foreground mt-1">
      <span>{currentTime}</span>
      <span>{duration}</span>
    </div>
  </div>

  {/* Playlist Toggle */}
  <Button
    variant="outline"
    size="sm"
    className="w-full"
    onClick={() => setPlaylistExpanded(!playlistExpanded)}
  >
    <Music className="h-3 w-3 mr-2" />
    View Playlist
    <ChevronDown className={`h-3 w-3 ml-auto transition-transform ${
      playlistExpanded ? 'rotate-180' : ''
    }`} />
  </Button>

  {/* Expandable Playlist */}
  {playlistExpanded && (
    <div className="mt-2 max-h-48 overflow-y-auto border-t pt-2">
      <Playlist onSelectTrack={setCurrentTrack} />
    </div>
  )}
</div>
```

**No Track Playing State:**
```tsx
<div className="bg-muted/50 border border-border rounded-lg p-4 text-center">
  <Music className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
  <p className="text-sm text-muted-foreground mb-2">No music playing</p>
  <Button size="sm" variant="outline" onClick={openPlaylist}>
    <ListMusic className="h-3 w-3 mr-2" />
    Browse Playlist
  </Button>
</div>
```

#### Implementation Details

**Integration with AudioProvider:**
```tsx
'use client';

import { useAudio } from '@/components/audio/AudioProvider';

export function AvatarMenuWithMusic() {
  const { isPlaying, play, pause, nextTrack, prevTrack, currentTrackIndex, tracks } = useAudio();
  const [playlistExpanded, setPlaylistExpanded] = useState(false);

  const currentTrack = currentTrackIndex !== null ? tracks[currentTrackIndex] : null;

  // ... render logic
}
```

**Mobile Drawer Removal:**
- Delete full-screen mobile drawer code from `AudioPlayer.tsx`
- Remove mobile-specific audio controls from bottom nav
- Keep desktop sidebar player unchanged

**Menu Trigger:**
- Existing avatar button (user initials)
- Position: Top-right (mobile), sidebar (desktop)
- Opens as slide-in panel (mobile) or dropdown (desktop)

#### Desktop vs Mobile Behavior

**Desktop:**
- Dropdown menu from top-right avatar
- Width: 360px
- Max-height: 80vh (scrollable)
- Positioned below avatar with arrow indicator

**Mobile:**
- Slide-in drawer from right
- Full-height panel
- Backdrop darkens screen
- Swipe-right-to-close gesture
- Fixed width: 90vw (max 400px)

---

### 2.2 Theme System Expansion

#### Problem Statement

- Only 2 themes available (Modern, Windows XP)
- Theme toggle is prominent button, clutters mobile UI
- No high-contrast or accessibility-focused themes

#### Solution

Add Neon (high-saturation) and True Dark (OLED black) themes, move theme selection into Appearance section of avatar menu.

#### New Themes Specification

**Neon Theme (High-Saturation, Cyberpunk)**

CSS Variables:
```css
[data-theme='neon'] {
  /* Primary Colors */
  --primary: 280 100% 70%;              /* Electric purple */
  --primary-foreground: 0 0% 100%;

  --secondary: 180 100% 70%;            /* Cyan */
  --accent: 330 100% 70%;               /* Hot pink */

  /* Backgrounds */
  --background: 240 10% 8%;             /* Dark purple-tinted */
  --foreground: 280 100% 95%;           /* Light with purple tint */
  --card: 240 10% 12%;
  --popover: 240 10% 10%;

  /* Borders */
  --border: 280 70% 40%;                /* Neon purple borders */
  --input: 280 70% 40%;

  /* Muted */
  --muted: 240 10% 15%;
  --muted-foreground: 280 50% 70%;

  /* Destructive */
  --destructive: 0 100% 60%;
  --destructive-foreground: 0 0% 100%;

  /* Effects */
  --neon-glow: 0 0 10px hsl(280 100% 70%);
  --neon-glow-strong: 0 0 20px hsl(280 100% 70%);
}

/* Glow effects on interactive elements */
[data-theme='neon'] button:hover {
  box-shadow: var(--neon-glow);
}

[data-theme='neon'] .neon-accent {
  box-shadow: var(--neon-glow-strong);
  animation: neon-pulse 2s ease-in-out infinite;
}

@keyframes neon-pulse {
  0%, 100% { box-shadow: var(--neon-glow); }
  50% { box-shadow: var(--neon-glow-strong); }
}
```

**Visual Characteristics:**
- High-contrast saturated colors
- Subtle glow effects on buttons and interactive elements
- Cyberpunk/synthwave aesthetic
- Dark background with neon accents
- Smooth pulsing animations on focus states

**True Dark Theme (OLED Black, High Contrast)**

CSS Variables:
```css
[data-theme='true-dark'] {
  /* Pure black for OLED power savings */
  --background: 0 0% 0%;                /* #000000 */
  --card: 0 0% 3%;                      /* Near black */
  --popover: 0 0% 5%;

  /* High contrast foreground */
  --foreground: 0 0% 95%;               /* Near white */
  --muted-foreground: 0 0% 60%;

  /* Monochrome primary */
  --primary: 0 0% 100%;                 /* Pure white */
  --primary-foreground: 0 0% 0%;        /* Black text on white */

  /* Subtle grays */
  --secondary: 0 0% 15%;
  --secondary-foreground: 0 0% 95%;

  --accent: 0 0% 20%;
  --accent-foreground: 0 0% 95%;

  /* Borders */
  --border: 0 0% 15%;                   /* Subtle gray borders */
  --input: 0 0% 20%;

  /* Muted */
  --muted: 0 0% 8%;

  /* Destructive (red for warnings) */
  --destructive: 0 80% 50%;
  --destructive-foreground: 0 0% 100%;
}

/* Remove all gradients, use solid colors */
[data-theme='true-dark'] * {
  background-image: none !important;
}
```

**Visual Characteristics:**
- Pure black (#000) backgrounds for OLED screens
- High contrast (WCAG AAA compliant)
- No gradients, solid colors only
- Minimal color palette (monochrome + red for destructive)
- Maximum readability and power efficiency

#### Theme Selection UI

**Appearance Section in Avatar Menu:**

```tsx
<Collapsible>
  <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-muted/50 rounded-lg">
    <div className="flex items-center gap-2">
      <Palette className="h-4 w-4" />
      <span className="font-medium">Appearance</span>
    </div>
    <ChevronDown className="h-4 w-4 transition-transform" />
  </CollapsibleTrigger>

  <CollapsibleContent className="px-3 py-2 space-y-3">
    {/* Theme Selection */}
    <div>
      <Label className="text-xs text-muted-foreground mb-2">Theme</Label>
      <RadioGroup value={theme} onValueChange={setTheme}>
        <div className="space-y-1">
          <RadioGroupItem value="modern" label="Modern (Default)" />
          <RadioGroupItem value="windows-xp" label="Windows XP Retro" />
          <RadioGroupItem value="neon" label="Neon" badge="NEW" />
          <RadioGroupItem value="true-dark" label="True Dark (OLED)" badge="NEW" />
        </div>
      </RadioGroup>
    </div>

    {/* Dark Mode Toggle */}
    <div className="flex items-center justify-between">
      <Label htmlFor="dark-mode" className="text-sm">Dark Mode</Label>
      <Switch id="dark-mode" checked={isDark} onCheckedChange={setIsDark} />
    </div>

    {/* Reduce Motion Toggle */}
    <div className="flex items-center justify-between">
      <Label htmlFor="reduce-motion" className="text-sm">Reduce Motion</Label>
      <Switch id="reduce-motion" checked={reduceMotion} onCheckedChange={setReduceMotion} />
    </div>
  </CollapsibleContent>
</Collapsible>
```

#### Theme Preview Swatches

**Optional Enhancement:**
```tsx
<div className="grid grid-cols-4 gap-2 mb-2">
  {themes.map(theme => (
    <button
      key={theme.id}
      onClick={() => setTheme(theme.id)}
      className="h-12 rounded-lg border-2 overflow-hidden"
      style={{
        background: theme.preview.background,
        borderColor: currentTheme === theme.id ? theme.preview.primary : 'transparent'
      }}
    >
      <div className="flex h-full">
        <div className="flex-1" style={{ background: theme.preview.primary }} />
        <div className="flex-1" style={{ background: theme.preview.secondary }} />
      </div>
    </button>
  ))}
</div>
```

#### ThemeProvider Updates

**File**: `components/theme/ThemeProvider.tsx`

```tsx
type Theme = 'modern' | 'windows-xp' | 'neon' | 'true-dark';
type Mode = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  mode: Mode;
  setTheme: (theme: Theme) => void;
  setMode: (mode: Mode) => void;
  toggleMode: () => void;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('modern');
  const [mode, setModeState] = useState<Mode>('light');

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const setMode = (newMode: Mode) => {
    setModeState(newMode);
    document.documentElement.classList.toggle('dark', newMode === 'dark');
    localStorage.setItem('mode', newMode);
  };

  const toggleMode = () => {
    setMode(mode === 'light' ? 'dark' : 'light');
  };

  // Initialize from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme || 'modern';
    const savedMode = localStorage.getItem('mode') as Mode || 'light';
    setTheme(savedTheme);
    setMode(savedMode);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, mode, setTheme, setMode, toggleMode }}>
      {children}
    </ThemeContext.Provider>
  );
}
```

#### Accessibility Considerations

**Reduced Transparency Mode:**
```css
@media (prefers-reduced-transparency: reduce) {
  [data-theme='neon'] .glass-panel,
  [data-theme='neon'] .glass-backdrop {
    backdrop-filter: none !important;
    background: hsl(var(--background)) !important;
  }
}
```

**High Contrast Mode:**
```css
@media (prefers-contrast: high) {
  /* Force True Dark theme characteristics */
  :root {
    --border: 0 0% 50% !important;
    --primary: 0 0% 100% !important;
  }
}
```

**Color Blindness Testing:**
- Test all themes with Coblis Color Blindness Simulator
- Ensure primary/secondary/accent colors distinguishable
- Use patterns/shapes in addition to color where critical

---

### 2.3 Dashboard FAB Expansion

#### Problem Statement

Dashboard only has "New Farm" button (top-right), missing quick access to common actions like posting, uploading media, and journaling.

#### Solution

Replace top-right button with bottom-right FAB speed dial containing 4 actions: Create Farm, Quick Post, Upload Image, Log Observation (journal entry).

#### FAB Actions Specification

**1. Create Farm**
- **Icon**: `MapIcon` (lucide-react)
- **Label**: "Create Farm"
- **Color**: `bg-green-600`
- **Action**: `router.push('/farm/new')`
- **Flow**: Navigate to existing farm creation page

**2. Quick Post**
- **Icon**: `MessageSquare` (lucide-react)
- **Label**: "Quick Post"
- **Color**: `bg-blue-600`
- **Action**: Opens `CreatePostDialog`
- **Flow**: Same as map FAB, but no farm pre-selected (user chooses)

**3. Upload Image**
- **Icon**: `Upload` (lucide-react)
- **Label**: "Upload Image"
- **Color**: `bg-purple-600`
- **Action**: Opens native file picker
- **Flow**: Upload to R2, create post with media

**4. Log Observation (NEW FEATURE)**
- **Icon**: `BookOpen` (lucide-react)
- **Label**: "Log Observation"
- **Color**: `bg-orange-600`
- **Action**: Opens `JournalEntryForm` dialog
- **Flow**: Create farm journal entry (see 2.3.1)

#### Dashboard FAB Implementation

**Component**: `components/dashboard/dashboard-fab.tsx`

```tsx
'use client';

import { FAB, FABAction } from '@/components/ui/fab';
import { MapIcon, MessageSquare, Upload, BookOpen } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { CreatePostDialog } from '@/components/feed/create-post-dialog';
import { JournalEntryForm } from '@/components/farm/journal-entry-form';

export function DashboardFAB() {
  const router = useRouter();
  const [postDialogOpen, setPostDialogOpen] = useState(false);
  const [journalDialogOpen, setJournalDialogOpen] = useState(false);

  const actions: FABAction[] = [
    {
      icon: <MapIcon className="h-5 w-5" />,
      label: 'Create Farm',
      onClick: () => router.push('/farm/new'),
      color: 'bg-green-600 text-white'
    },
    {
      icon: <MessageSquare className="h-5 w-5" />,
      label: 'Quick Post',
      onClick: () => setPostDialogOpen(true),
      color: 'bg-blue-600 text-white'
    },
    {
      icon: <Upload className="h-5 w-5" />,
      label: 'Upload Image',
      onClick: handleUpload,
      color: 'bg-purple-600 text-white'
    },
    {
      icon: <BookOpen className="h-5 w-5" />,
      label: 'Log Observation',
      onClick: () => setJournalDialogOpen(true),
      color: 'bg-orange-600 text-white'
    }
  ];

  return (
    <>
      <FAB
        actions={actions}
        ariaLabel="Quick actions"
        className="md:bottom-24 md:right-8"
      />

      <CreatePostDialog
        open={postDialogOpen}
        onOpenChange={setPostDialogOpen}
      />

      <JournalEntryForm
        open={journalDialogOpen}
        onOpenChange={setJournalDialogOpen}
      />
    </>
  );
}
```

---

#### 2.3.1 Farm Journal Entry Feature (NEW)

#### Overview

Farm journal is a new feature allowing users to log observations, activities, and notes about their farms over time. Unlike community posts (public), journal entries are private by default with optional sharing.

#### Database Schema

**New Table**: `farm_journal_entries`

```sql
CREATE TABLE farm_journal_entries (
  id TEXT PRIMARY KEY,
  farm_id TEXT NOT NULL,
  author_id TEXT NOT NULL,
  entry_date INTEGER NOT NULL,          -- User-specified date (can backdate)
  title TEXT,                           -- Optional short title
  content TEXT NOT NULL,                -- Rich text content
  media_urls TEXT,                      -- JSON array of photo URLs
  weather TEXT,                         -- Optional weather notes
  tags TEXT,                            -- JSON array: ['planting', 'harvest', 'pest', etc.]
  is_shared_to_community INTEGER DEFAULT 0,  -- Optional public sharing
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES users(id)
);

CREATE INDEX idx_journal_farm_date ON farm_journal_entries(farm_id, entry_date DESC);
CREATE INDEX idx_journal_author ON farm_journal_entries(author_id, entry_date DESC);
```

#### Journal Entry Form Component

**File**: `components/farm/journal-entry-form.tsx`

**Form Fields:**

1. **Farm Selection** (if opened from dashboard)
   - Dropdown: User's farms
   - Pre-filled if opened from farm detail page

2. **Entry Date**
   - Date picker (defaults to today)
   - Can backdate for historical entries
   - Calendar UI (react-day-picker or native)

3. **Title** (optional)
   - Single-line text input
   - Placeholder: "e.g., First tomato harvest"
   - Max 100 characters

4. **Content** (required)
   - Textarea (expanding)
   - Rich text support (markdown or simple formatting)
   - Placeholder: "What happened today? What did you observe?"
   - Min 10 characters

5. **Photos** (optional)
   - Multi-image upload
   - Drag-and-drop or click to browse
   - Image preview thumbnails
   - Max 5 images per entry

6. **Weather** (optional)
   - Text input
   - Placeholder: "e.g., Sunny, 72°F, light breeze"
   - Optional auto-fill from weather API (future enhancement)

7. **Tags** (optional)
   - Multi-select chips
   - Predefined options:
     - Planting
     - Harvest
     - Observation
     - Pest/Disease
     - Maintenance
     - Weather Event
     - Wildlife
     - Other
   - Custom tags allowed

8. **Share to Community** (checkbox)
   - Default: unchecked (private)
   - If checked: Creates both journal entry + public post
   - Public post links back to journal entry

**Form Implementation:**

```tsx
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { MultiSelect } from '@/components/ui/multi-select';
import { ImageUpload } from '@/components/shared/image-upload';

interface JournalEntryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  farmId?: string;  // Pre-filled if from farm page
}

export function JournalEntryForm({ open, onOpenChange, farmId }: JournalEntryFormProps) {
  const [date, setDate] = useState<Date>(new Date());
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [weather, setWeather] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [shareToComm, setShareToComm] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    setSaving(true);

    const entry = {
      id: crypto.randomUUID(),
      farm_id: farmId,
      author_id: user.id,
      entry_date: Math.floor(date.getTime() / 1000),
      title: title || null,
      content,
      media_urls: JSON.stringify(mediaUrls),
      weather: weather || null,
      tags: JSON.stringify(tags),
      is_shared_to_community: shareToComm ? 1 : 0
    };

    await fetch('/api/journal/entries', {
      method: 'POST',
      body: JSON.stringify(entry)
    });

    if (shareToComm) {
      // Also create public post
      await fetch('/api/posts', {
        method: 'POST',
        body: JSON.stringify({
          farm_id: farmId,
          type: 'journal_entry',
          content,
          media_urls: mediaUrls,
          journal_entry_id: entry.id
        })
      });
    }

    setSaving(false);
    onOpenChange(false);
    toast.success('Journal entry saved');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Log Farm Observation</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Date */}
          <div>
            <Label>Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  {format(date, 'PPP')}
                </Button>
              </PopoverTrigger>
              <PopoverContent>
                <Calendar mode="single" selected={date} onSelect={setDate} />
              </PopoverContent>
            </Popover>
          </div>

          {/* Title */}
          <div>
            <Label>Title (optional)</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., First tomato harvest"
              maxLength={100}
            />
          </div>

          {/* Content */}
          <div>
            <Label>What happened? *</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Describe what you observed, did, or learned today..."
              rows={6}
              required
            />
          </div>

          {/* Photos */}
          <div>
            <Label>Photos</Label>
            <ImageUpload
              maxImages={5}
              value={mediaUrls}
              onChange={setMediaUrls}
            />
          </div>

          {/* Weather */}
          <div>
            <Label>Weather (optional)</Label>
            <Input
              value={weather}
              onChange={(e) => setWeather(e.target.value)}
              placeholder="e.g., Sunny, 72°F, light breeze"
            />
          </div>

          {/* Tags */}
          <div>
            <Label>Tags</Label>
            <MultiSelect
              options={[
                { value: 'planting', label: 'Planting' },
                { value: 'harvest', label: 'Harvest' },
                { value: 'observation', label: 'Observation' },
                { value: 'pest', label: 'Pest/Disease' },
                { value: 'maintenance', label: 'Maintenance' },
                { value: 'weather', label: 'Weather Event' },
                { value: 'wildlife', label: 'Wildlife' },
                { value: 'other', label: 'Other' }
              ]}
              value={tags}
              onChange={setTags}
            />
          </div>

          {/* Share to Community */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="share"
              checked={shareToComm}
              onCheckedChange={setShareToComm}
            />
            <Label htmlFor="share" className="cursor-pointer">
              Share this entry with the community
            </Label>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!content || saving}>
            {saving ? 'Saving...' : 'Save Entry'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

#### Journal View Component

**File**: `components/farm/journal-view.tsx`

**Features:**
- Timeline layout (chronological, newest first)
- Filter by tags (dropdown or chips)
- Search by content (full-text search)
- Grouped by month ("January 2026", "December 2025", etc.)
- Edit/delete actions for each entry
- Export options (future: PDF, CSV)

**Integration:**
- New tab in farm detail page: "Journal" (alongside Zones, Plantings, Chat)
- Badge showing entry count: "Journal (24)"
- Quick access from dashboard (link to most recent entries)

**Timeline Entry Card:**
```tsx
<Card className="mb-4">
  <CardHeader>
    <div className="flex items-start justify-between">
      <div>
        <CardTitle className="text-lg">{entry.title || 'Untitled Entry'}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {format(entry.entry_date * 1000, 'MMMM d, yyyy')}
        </p>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => editEntry(entry.id)}>
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => deleteEntry(entry.id)} className="text-destructive">
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  </CardHeader>
  <CardContent>
    {/* Media Gallery */}
    {entry.media_urls && (
      <ImageGallery images={JSON.parse(entry.media_urls)} className="mb-3" />
    )}

    {/* Content */}
    <p className="text-sm whitespace-pre-wrap mb-3">{entry.content}</p>

    {/* Metadata */}
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      {entry.weather && (
        <span className="flex items-center gap-1">
          <Cloud className="h-3 w-3" />
          {entry.weather}
        </span>
      )}
      {JSON.parse(entry.tags).map(tag => (
        <Badge key={tag} variant="secondary" className="text-xs">
          {tag}
        </Badge>
      ))}
    </div>
  </CardContent>
</Card>
```

---

### 2.4 Desktop Playlist Persistence

#### Problem Statement

Desktop sidebar music player hides playlist behind toggle button, requiring extra click to view queue. Users want persistent visibility of playlist.

#### Solution

Default playlist section to expanded state in desktop sidebar, remember user preference if manually minimized.

#### Implementation Changes

**File**: `components/audio/AudioPlayer.tsx`

**Before:**
```tsx
const [isDesktopExpanded, setIsDesktopExpanded] = useState(false); // Collapsed by default
```

**After:**
```tsx
// Check localStorage for user preference, default to expanded
const [isDesktopExpanded, setIsDesktopExpanded] = useState(() => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('music-playlist-expanded');
    return saved === null ? true : saved === 'true'; // Default true
  }
  return true;
});

// Save preference when user manually toggles
const togglePlaylist = () => {
  const newState = !isDesktopExpanded;
  setIsDesktopExpanded(newState);
  localStorage.setItem('music-playlist-expanded', String(newState));
};
```

**Visual Changes:**

- Sidebar height increases to accommodate playlist (~400px total)
- Playlist section always rendered by default
- Current track highlighted with subtle background
- Auto-scroll to current track when changed
- Minimize button remains available (now labeled "Collapse Playlist")

**Playlist Section Styling:**

```tsx
{isDesktopExpanded && (
  <div className="flex-1 flex flex-col min-w-0 bg-gray-900/30 border-t border-gray-700 max-h-64 overflow-y-auto">
    {/* Header */}
    <div className="p-2 border-b border-gray-700 bg-gray-800/30 sticky top-0">
      <div className="flex items-center justify-between">
        <h4 className="text-[10px] font-bold text-green-400 tracking-wider">
          PLAYLIST • {tracks.length}
        </h4>
        <Button
          variant="ghost"
          size="sm"
          onClick={togglePlaylist}
          className="h-5 w-5 p-0"
        >
          <ChevronDown className="h-3 w-3" />
        </Button>
      </div>
    </div>

    {/* Track List */}
    <div className="flex-1 overflow-y-auto p-2">
      <Playlist
        onSelectTrack={setCurrentTrack}
        currentTrackIndex={currentTrackIndex}
      />
    </div>
  </div>
)}
```

**Mobile Behavior:**

- No changes (mobile uses avatar menu player, no separate playlist view)

**Benefits:**

- Reduces clicks to see queue
- Improves discoverability of other tracks
- Matches user expectations (Spotify, Apple Music show queue by default)
- Respects user preference if they want it minimized

---

## Phase 3: Content & Community Improvements (Days 9-11)

### 3.1 Compact Species Card Redesign

#### Problem Statement

Current `SpeciesCard` component has:
- Large decorative emoji icons (🌳, 🌿)
- Generous padding and whitespace
- Card height ~380px, limiting viewport density
- "Tap to learn more →" takes up space

Users want higher information density while maintaining usability and aesthetic quality.

#### Solution

Remove decorative emojis, tighten spacing, reduce padding, while preserving functional layer color system and all critical information.

#### Design Changes

**Component**: `components/species/species-card.tsx`

**Header Section:**

```tsx
// BEFORE: Height 24px, gradient, large emoji
<div className="h-24 relative bg-gradient-to-br from-white/50 to-transparent">
  <div className="absolute bottom-3 left-3 text-4xl">🌳</div>
  <Badge className="bg-green-600">🌿 Native</Badge>
</div>

// AFTER: Height 16px, solid color, no emoji
<div className={`h-16 relative ${layerColorClass} border-b`}>
  <div className="absolute top-2 right-2">
    <Badge className="bg-green-600 text-xs px-2 py-0.5">
      Native  {/* No emoji */}
    </Badge>
  </div>
</div>
```

**Card Header:**

```tsx
// Reduce padding
<CardHeader className="pb-2 pt-2">  {/* Was pb-3 pt-4 */}
  <div className="space-y-0.5">      {/* Was space-y-1 */}
    <h3 className="font-bold text-sm leading-tight line-clamp-2">  {/* Was text-base */}
      {species.common_name}
    </h3>
    <p className="text-xs text-muted-foreground italic line-clamp-1">
      {species.scientific_name}
    </p>
  </div>
</CardHeader>
```

**Card Content:**

```tsx
<CardContent className="space-y-2 py-3">  {/* Was space-y-3 */}
  {/* Layer Badge - Keep but smaller */}
  <div className="flex items-center gap-2">
    <Badge variant="outline" className={`text-xs capitalize h-5 ${layerColorClass}`}>
      <Layers className="w-3 h-3 mr-1" />
      {species.layer}
    </Badge>
  </div>

  {/* Key Info Grid - Keep, reduce gaps */}
  <div className="grid grid-cols-2 gap-1.5 text-xs">  {/* Was gap-2 */}
    {/* Hardiness Zones */}
    {species.min_hardiness_zone && species.max_hardiness_zone && (
      <div className="flex items-center gap-1 text-muted-foreground">
        <MapPin className="w-3 h-3 flex-shrink-0" />
        <span className="truncate">
          Zones {species.min_hardiness_zone}-{species.max_hardiness_zone}
        </span>
      </div>
    )}

    {/* Sun Requirements */}
    {species.sun_requirements && (
      <div className="flex items-center gap-1 text-muted-foreground">
        <Sun className="w-3 h-3 flex-shrink-0" />
        <span className="truncate capitalize">
          {species.sun_requirements}
        </span>
      </div>
    )}

    {/* Water Requirements */}
    {species.water_requirements && (
      <div className="flex items-center gap-1 text-muted-foreground col-span-2">
        <Droplets className="w-3 h-3 flex-shrink-0" />
        <span className="truncate capitalize">
          {species.water_requirements}
        </span>
      </div>
    )}
  </div>

  {/* Regions - Keep */}
  {regions.length > 0 && (
    <div className="flex flex-wrap gap-1">
      {regions.map((region: string) => (
        <Badge key={region} variant="outline" className="text-xs px-1.5 py-0 bg-muted/50">
          {region}
        </Badge>
      ))}
    </div>
  )}

  {/* Functions - Keep */}
  {functions.length > 0 && (
    <div className="pt-1.5 border-t">  {/* Was pt-2 */}
      <div className="flex flex-wrap gap-1">
        {functions.map((fn: string) => (
          <Badge
            key={fn}
            variant="secondary"
            className="text-xs px-1.5 py-0 bg-primary/5 text-primary border-primary/20"
          >
            {fn.replace(/_/g, ' ')}
          </Badge>
        ))}
      </div>
    </div>
  )}

  {/* REMOVE: "Tap to learn more" hint */}
</CardContent>
```

**Spacing Reduction Summary:**

| Element | Before | After | Change |
|---------|--------|-------|--------|
| Header height | 96px | 64px | -33% |
| Card padding | 16px | 12px | -25% |
| Content spacing | 12px | 8px | -33% |
| Badge padding | 8px h | 6px h | -25% |
| Badge gaps | 8px | 4px | -50% |
| Typography | 16px | 14px | -12% |

**Total Card Height:** ~280px (was ~380px) = **26% reduction**

**Preserved Elements:**

- ✅ Layer color system (canopy, understory, shrub, etc.)
- ✅ Native status badge
- ✅ Hardiness zones with MapPin icon
- ✅ Sun/water requirements with lucide icons
- ✅ Regional badges
- ✅ Permaculture function badges
- ✅ Hover effects (scale, border, shadow)
- ✅ Click-to-detail interaction

**Removed Elements:**

- ❌ Large emoji icons (🌳, 🌲, 🌿, etc.)
- ❌ Gradient overlay on header
- ❌ "Tap to learn more →" hint text
- ❌ Emoji in native badge (🌿)
- ❌ Excessive padding/whitespace

**Color System (Unchanged):**

```tsx
const getLayerColor = (layer: string) => {
  const colors: Record<string, string> = {
    canopy: 'bg-green-700/10 text-green-700 border-green-200',
    understory: 'bg-green-600/10 text-green-600 border-green-200',
    shrub: 'bg-green-500/10 text-green-500 border-green-200',
    herbaceous: 'bg-green-400/10 text-green-400 border-green-200',
    groundcover: 'bg-lime-500/10 text-lime-600 border-lime-200',
    vine: 'bg-amber-500/10 text-amber-600 border-amber-200',
    root: 'bg-orange-500/10 text-orange-600 border-orange-200',
    aquatic: 'bg-blue-500/10 text-blue-600 border-blue-200',
  };
  return colors[layer] || 'bg-gray-500/10 text-gray-600 border-gray-200';
};
```

**Information Density Improvement:**

- **Before**: 3-4 cards visible per desktop viewport
- **After**: 4-5 cards visible per desktop viewport
- **Mobile**: 2-3 cards visible (was 1-2)

**Benefits:**

- Faster scanning and browsing
- More species visible at once
- Professional, data-dense aesthetic
- All critical information retained
- Reduced scrolling for users

---

### 3.2 ExpandableText Component

#### Purpose

Reusable component for truncating long text content with inline expansion. Used across community feed, journal entries, AI responses, and any long-form content.

#### Component Specification

**File**: `components/shared/expandable-text.tsx`

**Props Interface:**

```tsx
interface ExpandableTextProps {
  text: string;
  maxLength?: number;              // Default: 500 characters
  className?: string;              // Additional styling
  expandLabel?: string;            // Default: "Dive Deeper"
  collapseLabel?: string;          // Default: "Show Less"
  showCollapseButton?: boolean;    // Default: true
  preserveFormatting?: boolean;    // Default: true (whitespace-pre-wrap)
}
```

**Implementation:**

```tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ExpandableText({
  text,
  maxLength = 500,
  className = '',
  expandLabel = 'Dive Deeper',
  collapseLabel = 'Show Less',
  showCollapseButton = true,
  preserveFormatting = true
}: ExpandableTextProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Don't truncate if text is shorter than maxLength
  const shouldTruncate = text.length > maxLength;

  // Truncate at word boundary, not mid-word
  const truncateAtWord = (str: string, max: number) => {
    if (str.length <= max) return str;
    const truncated = str.slice(0, max);
    const lastSpace = truncated.lastIndexOf(' ');
    return lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated;
  };

  const displayText = isExpanded ? text : truncateAtWord(text, maxLength);

  if (!shouldTruncate) {
    return (
      <div className={cn(preserveFormatting && 'whitespace-pre-wrap', className)}>
        {text}
      </div>
    );
  }

  return (
    <div className={className}>
      <div className={cn(preserveFormatting && 'whitespace-pre-wrap')}>
        {displayText}
        {!isExpanded && '...'}
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsExpanded(!isExpanded)}
        className="mt-2 h-8 text-primary hover:text-primary/80 hover:bg-primary/10"
        aria-label={isExpanded ? 'Collapse text' : 'Expand text'}
        aria-expanded={isExpanded}
      >
        {isExpanded ? (
          <>
            {showCollapseButton && (
              <>
                <ChevronUp className="w-4 h-4 mr-1" />
                {collapseLabel}
              </>
            )}
          </>
        ) : (
          <>
            <ChevronDown className="w-4 h-4 mr-1" />
            {expandLabel}
          </>
        )}
      </Button>
    </div>
  );
}
```

**Key Features:**

1. **Smart Word Truncation**: Cuts at word boundaries, not mid-word
2. **Whitespace Preservation**: Respects line breaks and formatting
3. **Customizable Labels**: Different contexts can use different CTAs
4. **Optional Collapse**: Some contexts may want expand-only behavior
5. **Accessible**: Proper ARIA labels, keyboard navigation
6. **Smooth Transition**: Text reflows naturally, no jarring jumps

**Usage Examples:**

**Community Feed Post:**
```tsx
<ExpandableText
  text={post.content}
  maxLength={500}
  expandLabel="Dive Deeper"
  className="text-sm text-foreground leading-relaxed"
/>
```

**AI Analysis Response:**
```tsx
<ExpandableText
  text={analysis.response}
  maxLength={800}
  expandLabel="Read Full Analysis"
  collapseLabel="Collapse Analysis"
  className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg"
/>
```

**Farm Journal Entry:**
```tsx
<ExpandableText
  text={entry.content}
  maxLength={300}
  expandLabel="Read More"
  collapseLabel="Collapse"
  className="prose prose-sm max-w-none"
  preserveFormatting={true}
/>
```

**Product Description (Expand-Only):**
```tsx
<ExpandableText
  text={product.description}
  maxLength={200}
  expandLabel="See Full Description"
  showCollapseButton={false}
  className="text-sm"
/>
```

**Styling Variants:**

**With Fade Effect (Optional):**
```tsx
// Add gradient fade at truncation point
{!isExpanded && (
  <div className="relative -mt-6 h-6 bg-gradient-to-t from-background to-transparent" />
)}
```

**Inline Button Style:**
```tsx
<Button variant="link" className="p-0 h-auto font-normal text-primary">
  {expandLabel}
</Button>
```

---

### 3.3 Feed Post Truncation Implementation

#### Target Areas

1. **Community Gallery Feed** (`app/(app)/gallery/page.tsx`)
2. **Dashboard Recent Posts** (`components/dashboard/recent-community-posts.tsx`)
3. **Farm Activity Feed** (`components/dashboard/farm-activity-feed.tsx`)

#### Implementation Strategy

Replace all instances of direct post content rendering with `ExpandableText` component.

#### Gallery Feed Integration

**File**: Components rendering posts in gallery (typically `FeedPost` or similar)

**Before:**
```tsx
<div className="text-sm whitespace-pre-wrap">{post.content}</div>
```

**After:**
```tsx
import { ExpandableText } from '@/components/shared/expandable-text';

<ExpandableText
  text={post.content || ''}
  maxLength={500}
  expandLabel="Dive Deeper"
  className="text-sm text-foreground leading-relaxed"
/>
```

#### Post Type Handling

**Text Posts:**
```tsx
{post.type === 'text' && post.content && (
  <ExpandableText
    text={post.content}
    maxLength={500}
    className="text-sm"
  />
)}
```

**Photo Posts (Caption Truncation):**
```tsx
{post.type === 'photo' && (
  <>
    {/* Image Gallery */}
    <div className="grid grid-cols-2 gap-2 mb-3">
      {JSON.parse(post.media_urls).map((url, i) => (
        <img key={i} src={url} alt="" className="rounded-lg" />
      ))}
    </div>

    {/* Caption */}
    {post.content && (
      <ExpandableText
        text={post.content}
        maxLength={500}
        expandLabel="Read Full Caption"
        className="text-sm mt-3"
      />
    )}
  </>
)}
```

**AI Insight Posts (Longer Threshold):**
```tsx
{post.type === 'ai_insight' && (
  <>
    {/* Screenshot Preview */}
    {post.ai_screenshot && (
      <div className="mb-3 rounded-lg overflow-hidden border">
        <img src={post.ai_screenshot} alt="AI Analysis" />
      </div>
    )}

    {/* AI Response (Longer threshold, different styling) */}
    <ExpandableText
      text={post.ai_response_excerpt || post.content || ''}
      maxLength={800}  {/* Longer for AI insights */}
      expandLabel="Read Full Analysis"
      collapseLabel="Collapse Analysis"
      className="text-sm bg-muted/30 p-3 rounded-lg border-l-2 border-primary"
    />
  </>
)}
```

#### Visual Enhancements

**Optional Fade Effect:**
```tsx
// Add CSS class for fade effect
<style jsx>{`
  .fade-truncate {
    position: relative;
  }

  .fade-truncate::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 40px;
    background: linear-gradient(to top, var(--background), transparent);
    pointer-events: none;
  }
`}</style>
```

**Expand Button Styling:**
```tsx
// Match community feed aesthetic
<Button
  variant="ghost"
  size="sm"
  className="mt-2 text-primary hover:text-primary/80 hover:bg-primary/10 rounded-full px-4"
>
  <ChevronDown className="w-4 h-4 mr-1" />
  Dive Deeper
</Button>
```

#### Dashboard Integration

**Recent Community Posts:**
```tsx
// components/dashboard/recent-community-posts.tsx

{posts.map(post => (
  <Card key={post.id}>
    <CardHeader>
      <CardTitle>{post.farm_name}</CardTitle>
    </CardHeader>
    <CardContent>
      <ExpandableText
        text={post.content}
        maxLength={300}  {/* Shorter for dashboard widgets */}
        expandLabel="Read More"
        className="text-sm"
      />
    </CardContent>
  </Card>
))}
```

**Farm Activity Feed:**
```tsx
// components/dashboard/farm-activity-feed.tsx

{activities.map(activity => (
  <div key={activity.id} className="border-b pb-3 mb-3 last:border-0">
    <p className="text-xs text-muted-foreground mb-1">
      {activity.timestamp}
    </p>
    <ExpandableText
      text={activity.content}
      maxLength={200}  {/* Very short for activity feed */}
      expandLabel="More"
      showCollapseButton={false}  {/* Expand-only for feed */}
      className="text-sm"
    />
  </div>
))}
```

#### Mobile Optimization

**Touch Targets:**
- Expand button minimum 44x44px (WCAG AAA)
- Large enough for thumb tapping
- Adequate spacing from surrounding content

**Performance:**
- Lazy rendering: Don't render full text until expanded
- Smooth animation: CSS transition on height (avoid layout shift)

```tsx
<motion.div
  initial={{ height: 'auto' }}
  animate={{ height: isExpanded ? 'auto' : 'auto' }}
  transition={{ duration: 0.2, ease: 'easeOut' }}
>
  {displayText}
</motion.div>
```

#### Accessibility

**ARIA Attributes:**
```tsx
<Button
  aria-label={isExpanded ? 'Collapse post content' : 'Expand post content'}
  aria-expanded={isExpanded}
  aria-controls={`post-content-${post.id}`}
>
  {expandLabel}
</Button>

<div id={`post-content-${post.id}`} aria-live="polite">
  {displayText}
</div>
```

**Keyboard Navigation:**
- Tab to button
- Enter/Space to toggle
- Focus remains on button after toggle (no focus loss)

**Screen Reader Support:**
- Announces expanded/collapsed state
- Reads full content when expanded
- Proper labeling for context

---

## Phase 4+: Research-Driven Blog Engine (Future)

**Status**: Documented for future implementation, not part of immediate roadmap.

### 4.1 Research Sourcing System

#### Approach

Hybrid automated + manual curation system for sourcing peer-reviewed research papers and credible agricultural publications.

#### Automated Sourcing

**APIs to Integrate:**

1. **PubMed API** (Free, Biomedical Research)
   - Endpoint: `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/`
   - Topics: Plant biology, breeding, agriculture, botany
   - Example query: `esearch.fcgi?db=pubmed&term=permaculture+plant+guilds`

2. **Google Scholar** (via SerpAPI or ScraperAPI)
   - Endpoint: SerpAPI `/search` (paid service)
   - Topics: Agricultural economics, permaculture research, soil science
   - Example: `q=permaculture+economics&hl=en&tbm=sch`

3. **arXiv API** (Free, Preprints)
   - Endpoint: `http://export.arxiv.org/api/query`
   - Topics: Agricultural technology, plant breeding, climate adaptation
   - Example: `search_query=all:permaculture&start=0&max_results=10`

4. **USDA PlantDB API** (Free, Economic Research)
   - Endpoint: `https://plantlab.ars.usda.gov/api/`
   - Topics: Crop economics, plant hardiness, native species
   - Example: `GET /species/{id}`

**Scheduled Indexing:**
```typescript
// Cron job runs weekly
async function indexNewResearch() {
  const keywords = ['permaculture', 'agroforestry', 'plant guilds', 'native species', 'regenerative agriculture'];

  for (const keyword of keywords) {
    // PubMed
    const pubmedResults = await searchPubMed(keyword);

    // Google Scholar
    const scholarResults = await searchGoogleScholar(keyword);

    // arXiv
    const arxivResults = await searchArXiv(keyword);

    // Store in database
    await storeResearchPapers([...pubmedResults, ...scholarResults, ...arxivResults]);
  }
}
```

#### Manual Curation

**Admin Interface** (`app/(admin)/research/curate/page.tsx`):

**Features:**
- Add paper manually (DOI, PDF link, or citation)
- Import from BibTeX/RIS file
- Tag papers with topics (plant-biology, breeding, economics, etc.)
- Mark papers as "featured" for blog post suggestions
- Bulk import from Zotero/Mendeley

**Form Fields:**
```tsx
<form>
  <Input label="Title" required />
  <Input label="Authors" placeholder="Smith, J., Doe, A." />
  <Input label="Journal/Publication" />
  <Input label="Publication Year" type="number" />
  <Input label="DOI" placeholder="10.1234/example" />
  <Input label="PDF URL" />
  <Textarea label="Abstract" rows={6} />
  <MultiSelect label="Tags" options={researchTags} />
  <Select label="Source" options={['Manual', 'PubMed', 'Scholar', 'arXiv']} />
</form>
```

#### Database Schema

```sql
CREATE TABLE research_papers (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  authors TEXT,                  -- JSON array: ["Smith, J.", "Doe, A."]
  journal TEXT,
  publication_year INTEGER,
  doi TEXT UNIQUE,              -- Digital Object Identifier
  pdf_url TEXT,
  pdf_stored INTEGER DEFAULT 0,  -- If we cache PDF locally
  abstract TEXT,
  full_text TEXT,               -- Extracted from PDF (optional)
  source TEXT,                  -- 'pubmed', 'google-scholar', 'arxiv', 'manual'
  tags TEXT,                    -- JSON array: ['plant-biology', 'economics']
  citation_count INTEGER,       -- From Google Scholar
  is_featured INTEGER DEFAULT 0,
  curator_id TEXT,              -- User who added manually
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX idx_research_doi ON research_papers(doi);
CREATE INDEX idx_research_tags ON research_papers(tags);
CREATE INDEX idx_research_year ON research_papers(publication_year DESC);
CREATE INDEX idx_research_featured ON research_papers(is_featured, created_at DESC);

-- Junction table for blog post citations
CREATE TABLE blog_post_citations (
  blog_post_id TEXT NOT NULL,
  research_paper_id TEXT NOT NULL,
  citation_context TEXT,        -- Why this paper is cited
  quote TEXT,                   -- Direct quote from paper (optional)
  PRIMARY KEY (blog_post_id, research_paper_id),
  FOREIGN KEY (blog_post_id) REFERENCES blog_posts(id) ON DELETE CASCADE,
  FOREIGN KEY (research_paper_id) REFERENCES research_papers(id) ON DELETE CASCADE
);
```

---

### 4.2 Blog Post Enhancement & Differentiation

#### Post Type Taxonomy

**Research-Backed Post**
- Cites 2+ peer-reviewed papers
- Visual badge: "Research-Backed"
- Includes citation section at bottom
- Higher trust signal for readers

**Educational Post**
- General permaculture knowledge
- May cite books, expert interviews
- No research badge required

**Community Story**
- User experiences and case studies
- Anecdotal evidence
- Badge: "Community Experience"

#### Visual Differentiation

**Research Badge:**
```tsx
{post.type === 'research-backed' && (
  <Badge className="bg-blue-600 text-white shadow-sm">
    <Microscope className="w-3 h-3 mr-1" />
    Research-Backed
  </Badge>
)}

{post.type === 'educational' && (
  <Badge variant="secondary">
    <GraduationCap className="w-3 h-3 mr-1" />
    Educational
  </Badge>
)}

{post.type === 'community-story' && (
  <Badge className="bg-purple-600 text-white">
    <Users className="w-3 h-3 mr-1" />
    Community Experience
  </Badge>
)}
```

#### Research Citation Section

**Component**: `components/blog/research-citations.tsx`

```tsx
interface Citation {
  id: string;
  title: string;
  authors: string[];
  journal: string;
  year: number;
  doi: string;
  quote?: string;
  context?: string;
}

export function ResearchCitations({ citations }: { citations: Citation[] }) {
  return (
    <div className="bg-muted/30 border-l-4 border-primary p-6 mt-8 rounded-r-lg">
      <div className="flex items-center gap-2 mb-4">
        <Microscope className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Research References</h3>
      </div>

      <div className="space-y-4">
        {citations.map((citation, i) => (
          <div key={citation.id} className="border-b pb-3 last:border-0">
            <div className="flex items-start gap-2">
              <span className="text-xs font-bold text-muted-foreground mt-1">
                [{i + 1}]
              </span>
              <div className="flex-1">
                <a
                  href={`https://doi.org/${citation.doi}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-primary hover:underline"
                >
                  {citation.title}
                </a>
                <p className="text-xs text-muted-foreground mt-1">
                  {citation.authors.join(', ')} • {citation.journal} ({citation.year})
                </p>

                {/* Optional Quote */}
                {citation.quote && (
                  <blockquote className="mt-2 pl-3 border-l-2 border-muted text-xs italic text-muted-foreground">
                    "{citation.quote}"
                  </blockquote>
                )}

                {/* Context (Why cited) */}
                {citation.context && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    <strong>Why this matters:</strong> {citation.context}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Export Citations */}
      <div className="mt-4 pt-4 border-t flex gap-2">
        <Button variant="outline" size="sm">
          <Download className="w-3 h-3 mr-2" />
          Export BibTeX
        </Button>
        <Button variant="outline" size="sm">
          <FileText className="w-3 h-3 mr-2" />
          Export RIS
        </Button>
      </div>
    </div>
  );
}
```

#### Inline Citations

**In-Text Citation Markers:**
```tsx
// In blog post content
<p>
  Recent studies show that plant guilds increase overall yield by 30-40%
  <sup>
    <a href="#citation-1" className="text-primary text-xs">[1]</a>
  </sup>
  while reducing pest pressure
  <sup>
    <a href="#citation-2" className="text-primary text-xs">[2]</a>
  </sup>.
</p>
```

---

### 4.3 AI Summarization & Tagging

#### AI-Powered Research Summarization

**Process Flow:**

1. **Paper Ingestion**
   - Curator selects research paper(s) from database
   - AI reads abstract + introduction (first 2-3 pages of PDF)
   - Extract key findings, methodology, conclusions

2. **Permaculture Context Generation**
   - AI (via OpenRouter, Llama 90B Vision or GPT-4) analyzes findings
   - Translates academic language to practical permaculture applications
   - Suggests how research applies to small farmers, homesteaders

3. **Summary Output**
   - 200-300 word summary
   - 3-5 key takeaways (bullet points)
   - Practical application suggestions
   - Related topics for further reading

**Example Prompt:**
```typescript
const prompt = `
You are a permaculture expert and science communicator. Summarize this research paper for a permaculture audience (small farmers, homesteaders, students).

Paper Title: ${paper.title}
Authors: ${paper.authors.join(', ')}
Abstract: ${paper.abstract}

Create a summary that:
1. Explains the key findings in simple language
2. Highlights practical applications for permaculture practitioners
3. Connects to permaculture ethics and principles
4. Is 200-300 words

Also suggest 3-5 tags from these categories:
- plant-biology, breeding, genetics, soil-science, water-management
- economics, market-analysis, yield-optimization
- climate-adaptation, resilience, biodiversity
- native-species, invasive-species, ecosystem-services
`;

const response = await openrouter.chat.completions.create({
  model: 'meta-llama/llama-3.2-90b-vision-instruct:free',
  messages: [{ role: 'user', content: prompt }]
});
```

#### AI Tag Suggestions

**Tag Generation:**
```typescript
async function generateAITags(paper: ResearchPaper): Promise<string[]> {
  const prompt = `
Based on this research paper, suggest 3-5 relevant tags:

Title: ${paper.title}
Abstract: ${paper.abstract}

Choose from these categories:
- plant-biology, breeding, genetics, propagation
- soil-science, composting, mulching, carbon-sequestration
- water-management, irrigation, drought-tolerance, watershed
- economics, market-analysis, yield-optimization, profitability
- climate-adaptation, resilience, biodiversity, ecosystem-services
- native-species, invasive-species, companion-planting, guilds
- permaculture-design, zone-planning, edge-effects, succession

Return only the tags as a JSON array.
`;

  const response = await openrouter.chat.completions.create({
    model: 'meta-llama/llama-3.2-90b-vision-instruct:free',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' }
  });

  const tags = JSON.parse(response.choices[0].message.content).tags;
  return tags;
}
```

#### AI Tag Transparency

**Visual Indicators:**

**In Admin Interface:**
```tsx
<div className="flex flex-wrap gap-1 mb-3">
  {paper.tags.map(tag => (
    <Badge
      key={tag.name}
      variant={tag.source === 'ai' ? 'outline' : 'default'}
      className="relative"
    >
      {tag.source === 'ai' && (
        <Sparkles className="w-3 h-3 mr-1 text-yellow-500" />
      )}
      {tag.name}
      {tag.source === 'ai' && (
        <Tooltip content="AI-suggested tag">
          <Info className="w-3 h-3 ml-1 text-muted-foreground" />
        </Tooltip>
      )}
    </Badge>
  ))}
</div>
```

**In Public Blog:**
```tsx
<div className="flex flex-wrap gap-1">
  {post.tags.map(tag => (
    <Badge key={tag.name} variant="secondary">
      {tag.name}
      {tag.source === 'ai' && (
        <span className="ml-1 text-xs text-muted-foreground" title="AI-suggested">
          (AI)
        </span>
      )}
    </Badge>
  ))}
</div>
```

**Tooltip Explanation:**
```
"AI-Suggested Tag"

This tag was suggested by AI based on content analysis.
It has been reviewed by our editorial team.

Tags help you find related content across the site.
```

#### Editorial Review Process

**Tag Workflow:**

1. **AI Suggests** → Tags marked with `source: 'ai'`
2. **Curator Reviews** → Can accept, reject, or modify
3. **Curator Approves** → Tags marked with `reviewed: true`
4. **Public Display** → Shows "(AI)" label for transparency

**Database Schema for Tags:**
```sql
ALTER TABLE research_papers ADD COLUMN tags_metadata TEXT;  -- JSON

-- Example tags_metadata:
{
  "tags": [
    {"name": "plant-biology", "source": "ai", "reviewed": true, "confidence": 0.92},
    {"name": "native-species", "source": "manual", "reviewed": true},
    {"name": "breeding", "source": "ai", "reviewed": false, "confidence": 0.78}
  ]
}
```

#### User Actions on AI Tags

**Click Tag:**
- Shows explanation: "This tag was suggested by AI and reviewed by our team"
- Links to all content with this tag
- Option to suggest additional tags (community contribution)

**Suggest Edit (Logged-in Users):**
- "Suggest a better tag" button
- Submits to moderation queue
- Curator reviews suggestions monthly

---

## Technical Dependencies & Implementation Notes

### Dependencies Required

**Phase 1-3 (No new dependencies!):**
```json
{
  "dependencies": {
    "framer-motion": "^11.0.0",     // Already installed
    "lucide-react": "^0.294.0",     // Already installed
    "tailwindcss": "^3.3.0",        // Already installed
    "next": "^14.0.0"               // Already installed
  }
}
```

**Phase 4+ (Future):**
```json
{
  "dependencies": {
    "@pubmed/api": "^1.0.0",        // PubMed research API
    "serpapi": "^2.0.0",            // Google Scholar scraping
    "arxiv-api": "^1.0.0",          // arXiv preprints
    "pdf-parse": "^1.1.1",          // PDF text extraction
    "citation-js": "^0.6.0"         // BibTeX/RIS export
  }
}
```

### Database Migrations

**Phase 2:**
```bash
turso db shell permaculture-studio < migrations/002_farm_journal.sql
```

**Phase 4:**
```bash
turso db shell permaculture-studio < migrations/003_research_papers.sql
turso db shell permaculture-studio < migrations/004_blog_citations.sql
```

### Component Files to Create

**Phase 1:**
- `components/immersive-map/map-fab.tsx`

**Phase 2:**
- `components/shared/avatar-menu-with-music.tsx`
- `components/farm/journal-entry-form.tsx`
- `components/farm/journal-view.tsx`
- `components/dashboard/dashboard-fab.tsx`
- `app/globals.css` (add Neon and True Dark themes)

**Phase 3:**
- `components/shared/expandable-text.tsx`

**Phase 4:**
- `app/(admin)/research/curate/page.tsx`
- `components/blog/research-citations.tsx`
- `lib/ai/research-summarizer.ts`

---

## Rollout & Deployment Strategy

### Phase 1 Rollout (Days 1-3)

**Day 1: Drawing Toolbar**
- Update `drawing-toolbar.tsx` positioning
- Test on staging
- Deploy to production (low risk)

**Day 2: Map FAB**
- Create `map-fab.tsx` component
- Wire up actions
- Test all flows (draw, pin, post, upload)
- Deploy to staging

**Day 3: Integration & Production**
- Feature flag: `NEXT_PUBLIC_ENABLE_MAP_FAB=true`
- Enable for 10% users (A/B test)
- Monitor engagement metrics
- Roll out to 100% if metrics positive

### Phase 2 Rollout (Days 4-8)

**Day 4-5: Avatar Menu & Music**
- Build new avatar menu component
- Remove mobile drawer code
- Deploy to staging
- Test audio playback

**Day 6: Themes**
- Add CSS variables for Neon and True Dark
- Update ThemeProvider
- Test all 4 themes × 2 modes
- Deploy to production (immediate, low risk)

**Day 7: Dashboard FAB & Journal**
- Database migration (journal table)
- Create journal form and view
- Build dashboard FAB
- Test CRUD operations
- Deploy to staging

**Day 8: Production**
- Deploy avatar menu changes (gradual: 20% → 50% → 100%)
- Deploy journal feature (beta users first)
- Monitor error rates and feedback

### Phase 3 Rollout (Days 9-11)

**Day 9: ExpandableText**
- Build component with tests
- Deploy to staging

**Day 10: Species Card Redesign**
- Update `species-card.tsx`
- A/B test on staging (track click-through rates)
- Deploy to production if metrics positive

**Day 11: Feed Truncation**
- Integrate ExpandableText into all feed areas
- Test all post types
- Deploy to production
- Monitor engagement (scroll depth, time on page)

---

## Success Metrics & KPIs

### Phase 1: Map & Drawing UX

**Engagement:**
- Drawing mode activation rate: Target +25%
- FAB interaction rate per session: Track baseline
- Posts created from map: Target +15%
- Pins/plantings created: Target +20%

**UX Metrics:**
- Time to complete drawing workflow: Target -30%
- Toolbar occlusion complaints: Target 0
- Task completion rate (draw zone end-to-end): Target 90%+

### Phase 2: Mobile Experience

**Music Player:**
- Mobile music engagement: Target +40%
- Playlist view rate: Track before/after
- Average session duration with music: Track increase

**Themes:**
- Theme adoption rate (Neon/True Dark): Track within 2 weeks
- User preference distribution: Monitor
- Dark mode usage (mobile vs desktop): Analyze patterns

**Journal:**
- Journal entries created per user per week: Target 2-3
- Return rate to journal view: Target 60%+
- "Share to community" conversion: Track %

### Phase 3: Content & Community

**Species Catalog:**
- Cards visible per viewport: Measure +25% increase
- Click-through rate: Compare compact vs old (A/B test)
- Bounce rate: Ensure no increase (monitor)
- Time to find species: Target -20%

**Feed Truncation:**
- "Dive Deeper" click rate: Track engagement
- Read completion rate: Measure scroll depth
- Time on feed: Compare before/after
- User satisfaction: In-app survey (post-launch)

---

## Risk Mitigation

### Risk 1: Drawing Toolbar Confusion

**Risk**: Users accustomed to right-side tools may be confused.

**Likelihood**: Medium
**Impact**: Low

**Mitigation:**
- One-time tooltip on first drawing mode: "Tools moved to left side!"
- Animate toolbar entrance with attention effect
- Monitor support requests for 2 weeks
- Rollback plan: Preference toggle in settings (left vs right)

### Risk 2: Avatar Menu Overcrowding

**Risk**: Adding music player makes menu too crowded/slow.

**Likelihood**: Low
**Impact**: Medium

**Mitigation:**
- Lazy-load music player (only render when menu opens)
- Collapsible sections (Music, Appearance)
- Performance budget: Menu must open <100ms
- Alternative: Tabs within menu if needed
- Monitor menu interaction analytics

### Risk 3: Theme System Breaking Styles

**Risk**: New themes may have poor contrast or break existing components.

**Likelihood**: Medium
**Impact**: High

**Mitigation:**
- Visual regression testing (Percy or Chromatic)
- Test all 4 themes × 2 modes = 8 combinations
- WCAG AA contrast checker (automated tools)
- Neon theme: Label as "Beta" initially
- True Dark: Test on OLED devices (iPhone 13+)
- Rollback: Disable theme via feature flag if issues found

### Risk 4: Journal Feature Scope Creep

**Risk**: Journal may expand beyond MVP, delaying launch.

**Likelihood**: High
**Impact**: Medium

**Mitigation:**
- Strict MVP scope: Date, title, content, tags, photos ONLY
- Defer features: PDF export, sharing, calendar view, reminders
- 2-day time box for development
- Launch as "Beta" with feedback form
- V2 features based on user requests

### Risk 5: ExpandableText Accessibility Issues

**Risk**: Screen readers may struggle with truncated content.

**Likelihood**: Low
**Impact**: High

**Mitigation:**
- Proper ARIA labels: `aria-expanded`, `aria-controls`, `aria-live`
- Button clearly labeled: "Expand full content"
- Test with VoiceOver (iOS) and TalkBack (Android)
- Keyboard navigation works (Tab, Enter/Space)
- Alternative: "Skip to full content" link for screen readers
- User testing with accessibility advocates

---

## Browser & Device Compatibility

### Supported Browsers

| Browser | Version | Priority | Notes |
|---------|---------|----------|-------|
| Chrome | 90+ | High | Main development target |
| Edge | 90+ | High | Chromium-based, same as Chrome |
| Firefox | 88+ | Medium | Test glassmorphism support |
| Safari | 14+ | Medium | Test backdrop-filter support |
| Mobile Safari | iOS 14+ | High | Primary mobile browser |
| Chrome Mobile | Android 10+ | High | Primary Android browser |

### Feature Fallbacks

**No backdrop-filter support (older browsers):**
```css
@supports not (backdrop-filter: blur(10px)) {
  .glass-panel {
    background: hsl(var(--background));
    backdrop-filter: none;
  }
}
```

**No CSS variables support:**
```css
/* Fallback to default theme */
:root:not([style*="--primary"]) {
  /* Use default theme colors */
}
```

**No framer-motion (JavaScript disabled):**
```css
/* CSS-only transitions */
.drawer-enter {
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
```

### Testing Matrix

**Desktop:**
- Chrome (Windows, macOS)
- Firefox (Windows, macOS)
- Safari (macOS)
- Edge (Windows)

**Mobile:**
- iPhone 13/14 (Safari)
- Pixel 6/7 (Chrome)
- iPad Pro (Safari)
- Samsung Galaxy (Chrome)

**Accessibility:**
- VoiceOver (iOS)
- TalkBack (Android)
- NVDA (Windows)
- Keyboard-only navigation

---

## Post-Launch Monitoring

### Week 1: Critical Monitoring

**Error Tracking:**
- Sentry/LogRocket for JavaScript errors
- Monitor error rates by feature (map FAB, journal, themes)
- Hot-fix critical bugs within 24 hours

**Feature Adoption:**
- Track new feature usage (FAB clicks, journal entries, theme changes)
- Compare engagement metrics to baseline
- Collect user feedback (in-app survey)

**Performance:**
- Monitor Core Web Vitals (FCP, LCP, CLS, FID)
- Track API response times (journal endpoints)
- Watch for memory leaks (long sessions)

### Week 2-4: Analysis & Iteration

**A/B Test Results:**
- Evaluate species card redesign (click-through rate)
- Compare feed truncation impact (scroll depth, time on page)
- Assess FAB usage (map vs dashboard)

**User Feedback:**
- Survey users about new features
- Monitor support requests
- Check social media mentions

**Iterate:**
- Hot-fix bugs
- Tweak UX based on feedback
- Plan V2 improvements

### Ongoing: Quarterly Reviews

**Usage Reports:**
- Monthly theme usage report (which themes most popular)
- Quarterly journal analytics (entries per user, tags used)
- Feature adoption trends

**UX Reviews:**
- User interviews (power users)
- Usability testing sessions
- Accessibility audits

---

## Conclusion

This phased implementation strategy delivers significant UX improvements across map/drawing experience, mobile usability, and content discovery while maintaining system stability through incremental rollouts.

**Key Deliverables:**

✅ **Phase 1** (3 days): Enhanced map workspace with relocated toolbar and speed dial FAB
✅ **Phase 2** (5 days): Comprehensive mobile experience with integrated music, 4 themes, journal feature
✅ **Phase 3** (3 days): Optimized content density and feed readability
📋 **Phase 4+**: Documented research blog engine for future development

**Total Timeline**: 11 days of development for Phases 1-3

**Risk Level**: Low (incremental rollouts, feature flags, rollback plans)

**Expected Impact**: Significant improvements in user engagement, content discoverability, and mobile experience based on comprehensive product feedback from UI/UX, Frontend, Content, and Product stakeholders.

---

**Next Steps:**
1. Review and approve this design document
2. Invoke `writing-plans` skill to create detailed implementation plan with step-by-step tasks
3. Begin Phase 1 development (drawing toolbar relocation)
