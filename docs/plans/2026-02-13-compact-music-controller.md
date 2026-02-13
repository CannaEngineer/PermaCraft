# Compact Music Controller Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace intrusive sidebar audio player with compact controller + slide-from-right drawer to reclaim ~200px of sidebar vertical space.

**Architecture:** Split audio player into two components: CompactMusicController (always-visible 56px bar with controls + scrolling text) and MusicPlayerSheet (shadcn Sheet drawer containing full Winamp player). Desktop-only feature, mobile unchanged.

**Tech Stack:** React, Next.js, shadcn/ui Sheet, Tailwind CSS, existing AudioProvider context

---

## Pre-Implementation Checklist

- [ ] Read design doc: `docs/plans/2026-02-13-compact-music-controller-design.md`
- [ ] Verify current audio player works in sidebar
- [ ] Check if shadcn Sheet is already installed
- [ ] Understand AudioProvider context: `components/audio/AudioProvider.tsx`

---

## Task 1: Install shadcn Sheet Component

**Files:**
- Check: `components/ui/sheet.tsx` (may not exist)
- Create: `components/ui/sheet.tsx` (via CLI)

**Step 1: Check if Sheet already exists**

```bash
ls components/ui/sheet.tsx
```

Expected: File not found (if it doesn't exist, continue; if exists, skip to Task 2)

**Step 2: Install Sheet component**

```bash
npx shadcn@latest add sheet
```

Expected output: "Installing sheet component..." and file created

**Step 3: Verify installation**

```bash
ls components/ui/sheet.tsx
```

Expected: File exists

**Step 4: Commit**

```bash
git add components/ui/sheet.tsx
git commit -m "chore: add shadcn Sheet component for music drawer"
```

---

## Task 2: Create CompactMusicController Component (Foundation)

**Files:**
- Create: `components/audio/CompactMusicController.tsx`

**Step 1: Create component file with basic structure**

Create `components/audio/CompactMusicController.tsx`:

```typescript
'use client';

import React from 'react';
import { useAudio } from '@/components/audio/AudioProvider';
import { Button } from '@/components/ui/button';
import { SkipBack, SkipForward, Play, Pause } from 'lucide-react';

interface CompactMusicControllerProps {
  onOpenPlayer: () => void;
}

export function CompactMusicController({ onOpenPlayer }: CompactMusicControllerProps) {
  const { isPlaying, togglePlayPause, nextTrack, previousTrack, currentTrackIndex, tracks } = useAudio();

  const currentTrack = currentTrackIndex !== null ? tracks[currentTrackIndex] : null;

  return (
    <div
      onClick={onOpenPlayer}
      className="hidden md:flex items-center gap-3 px-3 py-2 border-t border-border bg-muted/50 hover:bg-muted cursor-pointer transition-colors h-14"
    >
      {/* Controls */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            previousTrack();
          }}
          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
        >
          <SkipBack className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            togglePlayPause();
          }}
          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            nextTrack();
          }}
          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
        >
          <SkipForward className="h-4 w-4" />
        </Button>
      </div>

      {/* Track info - basic version for now */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-mono text-green-600 dark:text-green-400 truncate">
          {currentTrack ? `${currentTrack.artist} - ${currentTrack.title}` : '*** READY ***'}
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Verify component compiles**

```bash
npm run build
```

Expected: No TypeScript errors related to CompactMusicController

**Step 3: Commit**

```bash
git add components/audio/CompactMusicController.tsx
git commit -m "feat: create CompactMusicController foundation

- Basic layout with controls and track info
- Playback controls (prev/play/pause/next)
- Click handler for opening drawer
- Desktop-only with md: breakpoint
- Truncated text (marquee coming next)"
```

---

## Task 3: Add Marquee Scrolling Text to CompactMusicController

**Files:**
- Modify: `components/audio/CompactMusicController.tsx`

**Step 1: Add marquee CSS to globals.css**

Add to `app/globals.css` (at the end):

```css
@keyframes marquee {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(-50%);
  }
}

.marquee {
  display: inline-block;
  white-space: nowrap;
  animation: marquee 10s linear infinite;
}

.marquee-container {
  overflow: hidden;
  position: relative;
}
```

**Step 2: Update CompactMusicController to use marquee**

Replace the track info section in `components/audio/CompactMusicController.tsx`:

```typescript
      {/* Track info with marquee */}
      <div className="flex-1 min-w-0 marquee-container">
        {currentTrack ? (
          <div className="marquee text-sm font-mono text-green-600 dark:text-green-400">
            {currentTrack.artist} - {currentTrack.title} &nbsp;&nbsp;&nbsp; {currentTrack.artist} - {currentTrack.title}
          </div>
        ) : (
          <div className="text-sm font-mono text-green-600 dark:text-green-400 text-center">
            *** READY ***
          </div>
        )}
      </div>
```

**Step 3: Test in browser**

Manual verification:
1. Start dev server: `npm run dev`
2. Component not visible yet (not integrated), but should compile
3. Check for console errors

**Step 4: Commit**

```bash
git add app/globals.css components/audio/CompactMusicController.tsx
git commit -m "feat: add marquee scrolling text to compact controller

- CSS keyframe animation for horizontal scroll
- Duplicate text for seamless loop
- Centered READY state when no track"
```

---

## Task 4: Create MusicPlayerSheet Component

**Files:**
- Create: `components/audio/MusicPlayerSheet.tsx`

**Step 1: Create MusicPlayerSheet wrapper**

Create `components/audio/MusicPlayerSheet.tsx`:

```typescript
'use client';

import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import AudioPlayer from '@/components/audio/AudioPlayer';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MusicPlayerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MusicPlayerSheet({ open, onOpenChange }: MusicPlayerSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[400px] p-0 bg-gradient-to-b from-gray-700 to-gray-900 border-l border-border"
      >
        {/* Close button */}
        <div className="absolute top-3 right-3 z-50">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-gray-700"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Full Winamp-style player */}
        <div className="h-full">
          <AudioPlayer mode="sidebar" />
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

**Step 2: Verify component compiles**

```bash
npm run build
```

Expected: No TypeScript errors

**Step 3: Commit**

```bash
git add components/audio/MusicPlayerSheet.tsx
git commit -m "feat: create MusicPlayerSheet drawer component

- Wraps existing AudioPlayer in shadcn Sheet
- Slides from right (400px width)
- Full Winamp player inside
- Close button in top-right corner"
```

---

## Task 5: Integrate Components into Sidebar

**Files:**
- Modify: `components/shared/sidebar.tsx`

**Step 1: Read current Sidebar implementation**

Check lines 87-90 where AudioPlayer is currently integrated:

```bash
cat components/shared/sidebar.tsx | grep -A 3 "Audio Player"
```

**Step 2: Update Sidebar imports and state**

At top of `components/shared/sidebar.tsx`, update imports:

```typescript
import { CompactMusicController } from "@/components/audio/CompactMusicController";
import { MusicPlayerSheet } from "@/components/audio/MusicPlayerSheet";
```

Remove this import (if present):
```typescript
import AudioPlayer from "@/components/audio/AudioPlayer";
```

**Step 3: Add state management**

Add state inside the Sidebar component (after the pathname declaration):

```typescript
  const [isMusicSheetOpen, setIsMusicSheetOpen] = React.useState(false);
```

Add React import at top if not present:
```typescript
"use client";

import React from "react";
```

**Step 4: Replace AudioPlayer section**

Find and replace lines 87-90:

**OLD:**
```typescript
      {/* Audio Player - Winamp style */}
      <div className="border-t border-border">
        <AudioPlayer mode="sidebar" />
      </div>
```

**NEW:**
```typescript
      {/* Compact Music Controller */}
      <div className="border-t border-border">
        <CompactMusicController onOpenPlayer={() => setIsMusicSheetOpen(true)} />
      </div>

      {/* Music Player Sheet (drawer) */}
      <MusicPlayerSheet
        open={isMusicSheetOpen}
        onOpenChange={setIsMusicSheetOpen}
      />
```

**Step 5: Test in browser**

Manual verification:
1. Run: `npm run dev`
2. Open app in browser (desktop view)
3. Check sidebar shows compact controller
4. Click compact controller → sheet opens from right
5. Verify full Winamp player appears
6. Test controls in compact bar
7. Test controls in sheet
8. Click backdrop to close
9. Press Escape to close
10. Verify music continues playing during open/close

**Step 6: Commit**

```bash
git add components/shared/sidebar.tsx
git commit -m "feat: integrate compact music controller into sidebar

- Replace full AudioPlayer with CompactMusicController
- Add MusicPlayerSheet drawer integration
- State management for sheet open/closed
- Desktop-only, sidebar space reduced from ~250px to 56px"
```

---

## Task 6: Verify Mobile Behavior Unchanged

**Files:**
- Verify: `app/(app)/app-layout-client.tsx`
- Verify: `components/audio/AudioPlayer.tsx`

**Step 1: Check mobile drawer still exists**

```bash
grep -n "isMobileOpen" app/(app)/app-layout-client.tsx
```

Expected: Lines showing mobile state management still present

**Step 2: Test mobile view**

Manual verification:
1. Open browser dev tools
2. Toggle device toolbar (mobile view)
3. Verify compact controller is hidden (should not appear)
4. Verify bottom nav shows music button
5. Click music button → mobile drawer opens from bottom
6. Verify full Winamp player works in mobile drawer
7. Close drawer

**Step 3: Document verification**

Create verification note (no commit needed):

```bash
echo "✅ Mobile behavior verified unchanged" >> verification.txt
echo "- Compact controller hidden on mobile" >> verification.txt
echo "- Bottom nav music button works" >> verification.txt
echo "- Mobile drawer slides from bottom" >> verification.txt
echo "- Full player functional in mobile mode" >> verification.txt
```

**Step 4: Clean up verification file**

```bash
rm verification.txt
```

---

## Task 7: Visual Polish and Theme Testing

**Files:**
- Modify: `components/audio/CompactMusicController.tsx` (if needed)
- Modify: `components/audio/MusicPlayerSheet.tsx` (if needed)

**Step 1: Test light mode**

Manual verification:
1. Switch to light theme
2. Check compact controller visibility and contrast
3. Check sheet drawer background and text
4. Verify all buttons visible and usable
5. Check border visibility

**Step 2: Test dark mode**

Manual verification:
1. Switch to dark theme
2. Same checks as light mode
3. Verify green text has good contrast
4. Check hover states on buttons

**Step 3: Test scrolling text with various track lengths**

Manual verification:
1. Play short track name (should not scroll, just display)
2. Play very long track name (should scroll smoothly)
3. Verify "READY" state when no track

**Step 4: Adjust marquee speed if needed**

If scrolling too fast/slow, edit `app/globals.css`:

```css
@keyframes marquee {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(-50%);
  }
}

.marquee {
  display: inline-block;
  white-space: nowrap;
  animation: marquee 15s linear infinite; /* Adjust duration here */
}
```

**Step 5: Commit any adjustments**

```bash
git add -A
git commit -m "polish: adjust visual styling and marquee timing

- Fine-tune marquee animation speed
- Verify light/dark mode contrast
- Test with various track name lengths"
```

---

## Task 8: Accessibility Testing

**Files:**
- Test: All created components

**Step 1: Keyboard navigation test**

Manual verification:
1. Tab to compact controller
2. Tab through controls (prev/play/next)
3. Enter or Space on any control → should work
4. Enter on container area → should open sheet
5. Tab through sheet controls when open
6. Escape key → sheet closes
7. Focus returns to trigger element

**Step 2: Screen reader test (optional but recommended)**

If available:
1. Enable VoiceOver (Mac) or NVDA (Windows)
2. Navigate to compact controller
3. Verify controls announced correctly
4. Open sheet, verify content announced
5. Close sheet, verify state announced

**Step 3: Add ARIA labels if missing**

If controls aren't announced properly, add aria-label to buttons in `CompactMusicController.tsx`:

```typescript
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            previousTrack();
          }}
          aria-label="Previous track"
          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
        >
          <SkipBack className="h-4 w-4" />
        </Button>
```

Repeat for Play/Pause and Next buttons.

**Step 4: Commit accessibility improvements**

```bash
git add components/audio/CompactMusicController.tsx
git commit -m "a11y: add ARIA labels to music controls

- Previous track button labeled
- Play/pause button labeled
- Next track button labeled
- Improves screen reader experience"
```

---

## Task 9: Final Testing Checklist

**Files:**
- None (testing only)

**Step 1: Complete manual testing checklist**

Run through each item:

**Desktop (≥768px):**
- [ ] Compact controller visible in sidebar (56px height)
- [ ] Previous button works
- [ ] Play/Pause button works and updates icon
- [ ] Next button works
- [ ] Track title scrolls when long
- [ ] "READY" shows when no track
- [ ] Click controller → sheet opens from right
- [ ] Sheet shows full Winamp player
- [ ] All player features work (expand playlist, etc.)
- [ ] Click backdrop → closes
- [ ] Escape key → closes
- [ ] Close X button → closes
- [ ] Music continues during sheet open/close
- [ ] Light theme looks good
- [ ] Dark theme looks good

**Mobile (<768px):**
- [ ] Compact controller hidden
- [ ] Sheet hidden
- [ ] Bottom nav music button visible
- [ ] Click music button → mobile drawer opens from bottom
- [ ] Mobile drawer works as before
- [ ] All mobile features functional

**Responsive:**
- [ ] Resize window across breakpoint
- [ ] Components show/hide appropriately
- [ ] No layout breaks

**Step 2: Document test results**

```bash
echo "All tests passed: $(date)" > test-results.txt
git add test-results.txt
git commit -m "test: verify compact music controller implementation

- Desktop functionality complete
- Mobile behavior unchanged
- Theme support verified
- Accessibility confirmed"
```

---

## Task 10: Clean Up and Final Commit

**Files:**
- Clean: Remove test-results.txt
- Document: Update CLAUDE.md if needed

**Step 1: Remove temporary test files**

```bash
rm -f test-results.txt verification.txt
```

**Step 2: Final build verification**

```bash
npm run build
```

Expected: Clean build with no errors

**Step 3: Verify git status clean**

```bash
git status
```

Expected: "nothing to commit, working tree clean"

**Step 4: Review all commits**

```bash
git log --oneline -10
```

Expected: Series of logical, incremental commits

**Step 5: Done!**

The compact music controller is now complete and deployed. The sidebar has been reduced from ~250px to 56px for the audio player, with all functionality preserved in the slide-from-right drawer.

---

## Rollback Plan (If Needed)

If something goes wrong and you need to revert:

```bash
# Find the commit before we started
git log --oneline | grep "before compact music"

# Revert to that commit
git reset --hard <commit-hash>

# Or revert individual commits
git revert <commit-hash>
```

---

## Post-Implementation Notes

**What Changed:**
- Sidebar audio player reduced from ~250px to 56px
- Full Winamp player moved to slide-from-right Sheet drawer
- Desktop-only feature (mobile unchanged)
- All playback features preserved

**What Didn't Change:**
- Mobile drawer behavior (still slides from bottom)
- AudioPlayer component internals
- AudioProvider context
- Existing music playback functionality

**Performance Impact:**
- Minimal: Sheet only renders when open
- No impact on initial page load
- Drawer animation is hardware-accelerated

**Browser Support:**
- Modern browsers (Chrome, Firefox, Safari, Edge)
- CSS animations supported by Sheet component
- Fallback: truncated text if marquee fails

---

*Plan complete and ready for execution.*
