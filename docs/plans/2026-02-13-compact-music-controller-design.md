# Compact Music Controller with Drawer Design

**Date:** 2026-02-13
**Status:** Approved
**Type:** UI Redesign

## Problem Statement

The Winamp-style audio player was recently moved from the bottom of the screen to the sidebar (commit e97cdb5) to prevent it from conflicting with the immersive map editor's bottom drawer. However, the full player in the sidebar is intrusive, taking up ~200-300px of vertical space and pushing down important navigation elements.

## Solution Overview

Transform the audio player into a two-state system:
1. **Compact controller** (~56px) in the sidebar with playback controls and scrolling track text
2. **Full Winamp player** in a slide-from-right drawer that opens on click

This preserves all existing functionality while dramatically reducing the sidebar footprint.

---

## Design Goals

1. **Minimal sidebar footprint**: Reduce from ~200-300px to ~56px
2. **Preserve full functionality**: All Winamp features accessible in drawer
3. **Maintain aesthetic**: Keep retro Winamp styling for the full player
4. **Smooth interactions**: Professional slide animations and transitions
5. **Accessibility first**: Full keyboard navigation and screen reader support
6. **Mobile unchanged**: Keep existing mobile drawer (slide-up from bottom)

---

## Component Architecture

### Component Structure

```
Sidebar
├── [existing navigation]
├── ThemeToggle
├── CompactMusicController (NEW)  ← Compact bar with controls + scrolling text
│   └── MusicPlayerSheet (NEW)    ← Sheet with full Winamp player inside
└── User Section
```

### New Components

**1. `CompactMusicController.tsx`**
- Location: `components/audio/CompactMusicController.tsx`
- Purpose: Minimal always-visible music control bar
- Size: 56px height
- Features:
  - Previous/Play-Pause/Next buttons
  - Horizontally scrolling track title
  - Click anywhere to open full player drawer
  - Desktop-only (hidden on mobile)

**2. `MusicPlayerSheet.tsx`**
- Location: `components/audio/MusicPlayerSheet.tsx`
- Purpose: Wrapper for full Winamp player in a slide-from-right drawer
- Implementation: Uses shadcn `Sheet` component
- Features:
  - Slides from right side (400px wide)
  - Contains existing AudioPlayer component
  - Backdrop dims app when open
  - Closes on backdrop click, Escape key, or X button

### Modified Components

**`AudioPlayer.tsx`**
- No major changes to existing code
- Continue rendering sidebar mode (lines 34-116)
- Now rendered inside Sheet instead of directly in sidebar
- All functionality preserved

**`Sidebar.tsx`**
- Remove direct `<AudioPlayer />` integration
- Add `<CompactMusicController />` instead
- Position: Between ThemeToggle and User Section

---

## Detailed Design Specifications

### Compact Controller Design

**Visual Layout:**
```
┌─────────────────────────────────────────────┐
│ [◀] [▶] [⏸]  🎵 Track Name Scrolling... 🎵 │
└─────────────────────────────────────────────┘
   ↑             ↑
 Controls    Scrolling Text Area
```

**Styling:**
- **Container:**
  - Height: 56px
  - Background: `bg-muted/50 border-t border-border`
  - Padding: `px-3 py-2`
  - Hover: `hover:bg-muted` (indicates clickability)
  - Cursor: `cursor-pointer`
  - Display: `hidden md:flex` (desktop-only)

- **Control Buttons:**
  - Buttons: Previous, Play/Pause, Next
  - Size: 32x32px each
  - Icons: `SkipBack`, `Play`/`Pause`, `SkipForward` (lucide-react)
  - Variant: Ghost buttons
  - Colors: `text-muted-foreground hover:text-foreground`
  - Spacing: `space-x-1`

- **Scrolling Text:**
  - Content: `"Artist Name - Track Title"` or `"*** READY ***"`
  - Font: `font-mono text-sm`
  - Color: `text-green-600 dark:text-green-400` (matches Winamp aesthetic)
  - Animation: CSS marquee for overflow (3-5s loop)
  - No track state: Center-aligned, no scroll
  - Flex: `flex-1 ml-3 overflow-hidden`

### Sheet/Drawer Design

**Sheet Configuration:**
- **Component:** shadcn Sheet (install with `npx shadcn@latest add sheet`)
- **Side:** `side="right"`
- **Width:** 400px
- **Height:** Full viewport
- **Animation:** 300ms ease-out slide

**Visual Treatment:**
- **Backdrop:** `bg-black/50` overlay
- **Sheet background:** Inherits from AudioPlayer
  - `linear-gradient(180deg, #2d3748 0%, #1a202c 100%)`
- **Border:** `border-l border-border`
- **Shadow:** `shadow-2xl`

**Content:**
- Render existing `<AudioPlayer mode="sidebar" />`
- Full Winamp UI with all features:
  - Title bar with "MUSIC" header
  - VU meter display
  - Progress bar
  - Playback controls
  - Expandable playlist
  - Track info panel

**Close Triggers:**
- Click backdrop
- Press Escape key (built-in)
- Click X button in top-right of sheet

### State Management

**Simple boolean state in Sidebar component:**

```typescript
const [isMusicSheetOpen, setIsMusicSheetOpen] = useState(false);
```

**Interactions:**
1. Click CompactMusicController → `setIsMusicSheetOpen(true)`
2. Close triggers → `setIsMusicSheetOpen(false)`
3. Audio playback uninterrupted during open/close
4. Track info synchronized via existing AudioProvider context

### Mobile Behavior

**No changes to mobile implementation:**
- CompactMusicController: `hidden md:flex` (desktop-only)
- MusicPlayerSheet: Desktop-only
- Existing mobile drawer: Unchanged (slide-up from bottom)
- Bottom nav music button: Still opens mobile drawer

**Rationale:**
- Mobile drawer already works well
- Bottom slide-up more natural on phones
- Different UX paradigms for different form factors

---

## Technical Implementation Notes

### Dependencies

**Install shadcn Sheet if not present:**
```bash
npx shadcn@latest add sheet
```

### Component Integration Flow

1. **Create CompactMusicController:**
   - Build compact bar UI
   - Implement marquee scroll for long titles
   - Wire up AudioProvider hooks for controls
   - Add onClick to open sheet

2. **Create MusicPlayerSheet:**
   - Wrap Sheet component
   - Pass open state and setter
   - Render AudioPlayer inside SheetContent
   - Add close button in sheet header

3. **Update Sidebar:**
   - Import CompactMusicController
   - Remove direct AudioPlayer rendering
   - Add state management for sheet open/close
   - Position controller above user section

4. **AudioPlayer remains unchanged:**
   - No modifications needed
   - Desktop mode continues to work as-is
   - Just rendered in different location (Sheet vs Sidebar)

### Accessibility

- **Keyboard Navigation:**
  - Tab through controls in compact bar
  - Enter/Space to activate buttons or open sheet
  - Escape to close sheet (handled by Sheet component)

- **Screen Readers:**
  - Aria labels on all buttons
  - Announce sheet open/close states
  - Sheet component provides focus trap

- **Focus Management:**
  - Sheet traps focus when open (built-in)
  - Returns focus to trigger on close (built-in)

---

## Testing Considerations

### Manual Testing Checklist

**Compact Controller:**
- [ ] Controls work (prev/play/pause/next)
- [ ] Track title scrolls when long
- [ ] "READY" shows when no track
- [ ] Click anywhere opens sheet
- [ ] Hover states work

**Sheet Drawer:**
- [ ] Opens smoothly from right
- [ ] Full Winamp player renders correctly
- [ ] All player features work (expand playlist, controls, etc.)
- [ ] Closes on backdrop click
- [ ] Closes on Escape key
- [ ] Closes on X button
- [ ] Music continues playing when opening/closing

**Responsive:**
- [ ] Controller hidden on mobile (<768px)
- [ ] Sheet hidden on mobile
- [ ] Mobile drawer still works
- [ ] Desktop shows compact controller (≥768px)

**Theme:**
- [ ] Light mode looks good
- [ ] Dark mode looks good
- [ ] Theme toggle still works
- [ ] Winamp aesthetic preserved

---

## Visual Mockups

### Before (Current State)
```
┌─ Sidebar ─────────────────┐
│ Logo                      │
│ Search                    │
│ Navigation Links          │
│                           │
│ ┌─ Audio Player ────────┐│
│ │ MUSIC       [expand]  ││
│ │                       ││
│ │ *** Track Info ***    ││
│ │                       ││
│ │ ━━━━━━━━━━━━━━━━━━   ││ ← Takes up
│ │                       ││   ~200-300px
│ │ [◀] [▶] [⏸]         ││
│ │                       ││
│ │ Theme: peaceful       ││
│ │ Duration: 4:32        ││
│ └───────────────────────┘│
│                           │
│ Theme Toggle              │
│ User Section              │
└───────────────────────────┘
```

### After (New Design)
```
┌─ Sidebar ─────────────────┐
│ Logo                      │
│ Search                    │
│ Navigation Links          │
│                           │
│ (More space for content)  │
│                           │
│                           │
│                           │
│ Theme Toggle              │
│ ┌─ Music ──────────────┐ │
│ │[◀][▶][⏸] Track...   │ │ ← Only 56px!
│ └──────────────────────┘ │
│ User Section              │
└───────────────────────────┘

(Click compact controller →)

┌─ Sheet (400px) ────────────┐
│ ┌─ Audio Player ──────┐ [X]│
│ │ MUSIC     [expand]  │    │
│ │                     │    │
│ │ *** Track Info ***  │    │
│ │                     │    │
│ │ ━━━━━━━━━━━━━━━━   │    │
│ │                     │    │
│ │ [◀] [▶] [⏸]       │    │
│ │                     │    │
│ │ [Playlist when      │    │
│ │  expanded...]       │    │
│ │                     │    │
│ │ Theme: peaceful     │    │
│ │ Duration: 4:32      │    │
│ └─────────────────────┘    │
└────────────────────────────┘
```

---

## Implementation Checklist

- [ ] Install shadcn Sheet component
- [ ] Create CompactMusicController component
- [ ] Implement marquee text scroll
- [ ] Create MusicPlayerSheet component
- [ ] Update Sidebar to use new components
- [ ] Test all playback controls
- [ ] Test sheet open/close behavior
- [ ] Test mobile unchanged behavior
- [ ] Verify accessibility (keyboard, screen readers)
- [ ] Test light/dark themes
- [ ] Commit changes

---

## Future Enhancements (Out of Scope)

- Volume slider in compact controller
- Mini visualizer in compact bar
- Keyboard shortcuts (Space to play/pause globally)
- Remember sheet open/closed preference
- Drag to resize sheet width

---

*Design approved and ready for implementation planning.*
