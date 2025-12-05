# Time Machine & Legend Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Integrate Time Machine controls into the Map Legend as a unified bottom panel with futuristic horizontal progress bar and three-state collapse system.

**Architecture:** Replace the sidebar Time Machine overlay component with an integrated horizontal strip in the MapLegend component. The bottom panel will have three collapse states: fully expanded (legend + time machine), time machine only, and peek tab. State management moves to FarmMap component level.

**Tech Stack:** React (Next.js), TypeScript, Tailwind CSS, Lucide React icons

---

## Task 1: Update MapLegend Component Interface

**Files:**
- Modify: `components/map/map-legend.tsx:1-14`

**Step 1: Add Time Machine props to MapLegendProps interface**

Add these new optional props to the existing interface:

```typescript
interface MapLegendProps {
  mapLayer: "satellite" | "mapbox-satellite" | "terrain-3d" | "terrain" | "topo" | "usgs" | "street";
  gridUnit: "imperial" | "metric";
  zones: any[]; // Array of zones on the map
  plantings?: any[]; // Array of plantings on the map
  isCollapsed?: boolean;
  onToggle?: () => void;

  // Time Machine props (new)
  isTimeMachineOpen?: boolean;
  onCloseTimeMachine?: () => void;
  currentYear?: number;
  onYearChange?: (year: number) => void;
  minYear?: number;
  maxYear?: number;
}
```

**Step 2: Commit interface changes**

```bash
git add components/map/map-legend.tsx
git commit -m "feat: add Time Machine props to MapLegend interface"
```

---

## Task 2: Add Time Machine State to MapLegend Component

**Files:**
- Modify: `components/map/map-legend.tsx:39-75`

**Step 1: Import required dependencies at top of file**

Add these imports after existing imports:

```typescript
import { useState, useCallback, useEffect } from 'react';
import { Play, Pause, RotateCcw, X, Clock } from 'lucide-react';
```

**Step 2: Destructure Time Machine props in component**

Update the component function signature:

```typescript
export function MapLegend({
  mapLayer,
  gridUnit,
  zones,
  plantings = [],
  isCollapsed = false,
  onToggle,
  isTimeMachineOpen = false,
  onCloseTimeMachine,
  currentYear,
  onYearChange,
  minYear = new Date().getFullYear(),
  maxYear = new Date().getFullYear() + 20,
}: MapLegendProps) {
```

**Step 3: Add Time Machine state variables**

Add these state variables after the component function starts:

```typescript
const [isPlaying, setIsPlaying] = useState(false);
const [playbackSpeed, setPlaybackSpeed] = useState(1); // Years per second
```

**Step 4: Commit state setup**

```bash
git add components/map/map-legend.tsx
git commit -m "feat: add Time Machine state to MapLegend"
```

---

## Task 3: Implement Time Machine Auto-Advance Logic

**Files:**
- Modify: `components/map/map-legend.tsx` (after state variables)

**Step 1: Add auto-advance useEffect**

Add this effect after state variables:

```typescript
// Auto-advance animation
useEffect(() => {
  if (!isPlaying || !isTimeMachineOpen || !onYearChange) return;

  const interval = setInterval(() => {
    const next = currentYear! + 1;
    if (next > maxYear) {
      setIsPlaying(false);
      onYearChange(maxYear);
    } else {
      onYearChange(next);
    }
  }, 1000 / playbackSpeed);

  return () => clearInterval(interval);
}, [isPlaying, isTimeMachineOpen, playbackSpeed, maxYear, currentYear, onYearChange]);
```

**Step 2: Commit auto-advance logic**

```bash
git add components/map/map-legend.tsx
git commit -m "feat: add Time Machine auto-advance playback logic"
```

---

## Task 4: Implement Keyboard Shortcuts

**Files:**
- Modify: `components/map/map-legend.tsx` (after auto-advance effect)

**Step 1: Add keyboard controls useEffect**

```typescript
// Keyboard controls (only when Time Machine is open)
useEffect(() => {
  if (!isTimeMachineOpen || !onYearChange) return;

  const handleKeyDown = (e: KeyboardEvent) => {
    // Don't capture keys if user is typing in an input
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        onYearChange(Math.max(minYear, currentYear! - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        onYearChange(Math.min(maxYear, currentYear! + 1));
        break;
      case ' ':
        e.preventDefault();
        setIsPlaying((prev) => !prev);
        break;
      case 'Home':
        e.preventDefault();
        onYearChange(minYear);
        break;
      case 'End':
        e.preventDefault();
        onYearChange(maxYear);
        break;
      case 'Escape':
        e.preventDefault();
        if (onCloseTimeMachine) onCloseTimeMachine();
        break;
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [isTimeMachineOpen, currentYear, minYear, maxYear, onYearChange, onCloseTimeMachine]);
```

**Step 2: Commit keyboard shortcuts**

```bash
git add components/map/map-legend.tsx
git commit -m "feat: add keyboard shortcuts for Time Machine"
```

---

## Task 5: Add Control Handler Functions

**Files:**
- Modify: `components/map/map-legend.tsx` (after useEffects)

**Step 1: Add handler functions**

```typescript
const handleProgressClick = useCallback(
  (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onYearChange) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = clickX / rect.width;
    const year = Math.round(minYear + percent * (maxYear - minYear));
    onYearChange(Math.max(minYear, Math.min(maxYear, year)));
  },
  [minYear, maxYear, onYearChange]
);

const handleReset = useCallback(() => {
  if (onYearChange) {
    setIsPlaying(false);
    onYearChange(minYear);
  }
}, [minYear, onYearChange]);

const togglePlayback = useCallback(() => {
  setIsPlaying((prev) => !prev);
}, []);
```

**Step 2: Calculate progress percent**

Add this calculation before the return statement:

```typescript
const yearRange = maxYear - minYear;
const progressPercent = currentYear ? ((currentYear - minYear) / yearRange) * 100 : 0;
```

**Step 3: Commit handler functions**

```bash
git add components/map/map-legend.tsx
git commit -m "feat: add Time Machine control handlers"
```

---

## Task 6: Build Time Machine Progress Bar JSX

**Files:**
- Modify: `components/map/map-legend.tsx:76-196` (replace return statement)

**Step 1: Replace the entire return statement**

Replace the current return block with this updated structure:

```tsx
return (
  <div
    className={`absolute bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border text-xs z-20 transition-all duration-300 ${
      isCollapsed && !isTimeMachineOpen ? 'translate-y-full' : 'translate-y-0'
    }`}
    data-legend-container
    data-collapsed={isCollapsed}
  >
    {/* Peek Tab - Always Visible When Fully Collapsed */}
    {isCollapsed && !isTimeMachineOpen && (
      <div
        className="absolute bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border cursor-pointer hover:bg-accent/50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between px-4 py-2">
          <span className="text-sm font-semibold">Legend ▲</span>
          <span className="text-xs text-muted-foreground">
            {currentYear ? `${currentYear} • ` : ''}{layerNames[mapLayer]} • {gridSpacing}
          </span>
        </div>
      </div>
    )}

    {/* Time Machine Strip - Shows when isTimeMachineOpen */}
    {isTimeMachineOpen && currentYear !== undefined && onYearChange && (
      <div className="border-b border-border">
        {/* Futuristic Progress Bar */}
        <div className="px-4 pt-4 pb-2">
          <div
            className="relative h-10 bg-muted/50 rounded-full cursor-pointer overflow-hidden"
            onClick={handleProgressClick}
          >
            {/* Fill bar with glow effect */}
            <div
              className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-200 ${
                isPlaying ? 'shadow-[0_0_20px_hsl(var(--primary)/0.6)]' : 'shadow-[0_0_20px_hsl(var(--primary)/0.4)]'
              }`}
              style={{ width: `${progressPercent}%` }}
            />

            {/* Year indicator */}
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 font-bold text-2xl tabular-nums pointer-events-none transition-all duration-200"
              style={{
                left: `${progressPercent}%`,
                textShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
              }}
            >
              {currentYear}
            </div>

            {/* Year markers (every 5 years) */}
            {Array.from({ length: Math.floor(yearRange / 5) + 1 }, (_, i) => {
              const year = minYear + i * 5;
              if (year > maxYear) return null;
              const position = ((year - minYear) / yearRange) * 100;

              return (
                <div
                  key={year}
                  className="absolute top-0 bottom-0 w-px bg-muted-foreground/30"
                  style={{ left: `${position}%` }}
                />
              );
            })}
          </div>
        </div>

        {/* Control Buttons Strip */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-border/50">
          <div className="flex items-center gap-2">
            {/* Play/Pause Button */}
            <Button
              size="icon"
              onClick={togglePlayback}
              aria-label={isPlaying ? 'Pause animation' : 'Play animation'}
              className="h-9 w-9"
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>

            {/* Reset Button */}
            <Button
              size="icon"
              variant="outline"
              onClick={handleReset}
              aria-label="Reset to current year"
              className="h-9 w-9"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>

            {/* Speed Selector */}
            <select
              value={playbackSpeed}
              onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
              className="h-9 px-2 rounded-md border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring w-[60px]"
              aria-label="Playback speed"
            >
              <option value={0.5}>0.5x</option>
              <option value={1}>1x</option>
              <option value={2}>2x</option>
              <option value={5}>5x</option>
              <option value={10}>10x</option>
            </select>
          </div>

          {/* Close Button */}
          <Button
            size="icon"
            variant="ghost"
            onClick={onCloseTimeMachine}
            aria-label="Close time machine"
            className="h-9 w-9"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )}

    {/* Legend Toggle Bar - Always Visible (unless fully collapsed) */}
    {!(isCollapsed && !isTimeMachineOpen) && (
      <div
        className="flex items-center justify-between px-4 py-2 cursor-pointer hover:bg-accent/50 transition-colors border-b border-border"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2">
          <div className="font-semibold text-sm">Legend</div>
          <div className="text-xs text-muted-foreground">
            {layerNames[mapLayer]} • {gridSpacing}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          title={isCollapsed ? "Show legend" : "Hide legend"}
        >
          {isCollapsed ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </div>
    )}

    {/* Legend Content - Existing implementation */}
    <div
      className={`px-4 py-3 ${isCollapsed ? 'hidden' : 'block'}`}
      data-legend-content
    >
      {/* Horizontal Layout for Desktop */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Farm Boundary */}
        <div>
          <div className="text-muted-foreground font-medium mb-2 text-xs">
            Farm Boundary
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-0.5 bg-background border-2 border-purple-600 rounded"></div>
            <span className="text-[10px] text-muted-foreground">
              Purple
            </span>
          </div>
        </div>

        {/* Zone Colors */}
        <div>
          <div className="text-muted-foreground font-medium mb-2 text-xs">
            Zone Types
          </div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
            {displayZoneTypes.map((type) => {
              const config = ZONE_TYPES[type];
              if (!config) return null;

              return (
                <div key={type} className="flex items-center gap-1.5">
                  <div
                    className="w-3 h-3 rounded-sm border flex-shrink-0"
                    style={{
                      backgroundColor: config.fillColor,
                      opacity: config.fillOpacity + 0.5,
                      borderColor: config.strokeColor,
                    }}
                  />
                  <span className="text-[10px] truncate">
                    {config.label.replace(/\s*\(.*?\)\s*/g, '')}
                  </span>
                </div>
              );
            })}
          </div>
          {displayZoneTypes.length === 0 && (
            <div className="text-[10px] text-muted-foreground italic">
              No zones yet
            </div>
          )}
        </div>

        {/* Plantings */}
        <div className="md:col-span-2">
          <div className="text-muted-foreground font-medium mb-2 text-xs">
            Plantings ({plantings.length})
          </div>
          {displayPlantingLayers.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-3 gap-y-1.5">
              {displayPlantingLayers.map((layer) => {
                const count = plantings.filter(p => p.layer === layer).length;
                return (
                  <div key={layer} className="flex items-center gap-1.5">
                    <div
                      className="w-3 h-3 rounded-full border-2 border-background flex-shrink-0 shadow-sm"
                      style={{
                        backgroundColor: LAYER_COLORS[layer],
                      }}
                    />
                    <span className="text-[10px] truncate">
                      {LAYER_LABELS[layer]} ({count})
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-[10px] text-muted-foreground italic">
              No plantings yet
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
);
```

**Step 2: Verify file compiles**

Run: `npm run build` or check TypeScript in editor
Expected: No TypeScript errors

**Step 3: Commit progress bar UI**

```bash
git add components/map/map-legend.tsx
git commit -m "feat: add futuristic progress bar and Time Machine UI to MapLegend"
```

---

## Task 7: Update FarmMap Component

**Files:**
- Modify: `components/map/farm-map.tsx:149` (state management)
- Modify: `components/map/farm-map.tsx:2675-2680` (remove TimeMachineOverlay)
- Modify: `components/map/farm-map.tsx:2650-2660` (update MapLegend props)

**Step 1: Remove TimeMachineOverlay import**

Find and remove this import at the top of the file:

```typescript
import { TimeMachineOverlay } from './time-machine-overlay';
```

**Step 2: Rename state variable**

Find line 149 and rename the state variable for clarity:

```typescript
// Change from:
const [showTimeMachine, setShowTimeMachine] = useState(false);

// To:
const [isTimeMachineOpen, setIsTimeMachineOpen] = useState(false);
```

**Step 3: Remove TimeMachineOverlay JSX**

Find and remove lines 2674-2680 (the TimeMachineOverlay component render):

```tsx
{/* Time Machine Overlay */}
<TimeMachineOverlay
  isOpen={showTimeMachine}
  onClose={() => setShowTimeMachine(false)}
  currentYear={projectionYear}
  onYearChange={setProjectionYear}
/>
```

**Step 4: Find MapLegend component render**

Search for `<MapLegend` in the file to locate where it's rendered (around line 2650-2660).

**Step 5: Update MapLegend props**

Add Time Machine props to the existing MapLegend component:

```tsx
<MapLegend
  mapLayer={mapLayer}
  gridUnit={gridUnit}
  zones={zones}
  plantings={plantings}
  isCollapsed={isLegendCollapsed}
  onToggle={() => setIsLegendCollapsed(!isLegendCollapsed)}
  isTimeMachineOpen={isTimeMachineOpen}
  onCloseTimeMachine={() => setIsTimeMachineOpen(false)}
  currentYear={projectionYear}
  onYearChange={setProjectionYear}
  minYear={new Date().getFullYear()}
  maxYear={new Date().getFullYear() + 20}
/>
```

**Step 6: Update FAB Time Machine handler**

Find line 2716 where `onOpenTimeMachine` is passed and update the callback:

```tsx
// Change from:
onOpenTimeMachine={() => setShowTimeMachine(true)}

// To:
onOpenTimeMachine={() => setIsTimeMachineOpen(true)}
```

**Step 7: Verify file compiles**

Run: `npm run build` or check TypeScript in editor
Expected: No TypeScript errors

**Step 8: Commit FarmMap updates**

```bash
git add components/map/farm-map.tsx
git commit -m "feat: integrate Time Machine into MapLegend in FarmMap"
```

---

## Task 8: Delete Old Time Machine Overlay Component

**Files:**
- Delete: `components/map/time-machine-overlay.tsx`

**Step 1: Delete the file**

```bash
rm components/map/time-machine-overlay.tsx
```

**Step 2: Verify no remaining imports**

Run: `npm run build`
Expected: Build succeeds with no errors about missing time-machine-overlay module

**Step 3: Commit deletion**

```bash
git add components/map/time-machine-overlay.tsx
git commit -m "refactor: remove old TimeMachineOverlay component"
```

---

## Task 9: Manual Testing

**Files:**
- Test: Running application at `http://localhost:3000`

**Step 1: Start dev server**

Run: `npm run dev`
Expected: Server starts on port 3000

**Step 2: Test Time Machine opening from FAB**

1. Navigate to a farm with plantings
2. Click FAB button (bottom-right)
3. Click "Time Machine" action
Expected: Time Machine strip appears at bottom with progress bar

**Step 3: Test progress bar interaction**

1. Click on different positions of the progress bar
2. Verify year jumps to clicked position
3. Drag the year indicator
Expected: Year updates smoothly, indicator follows cursor

**Step 4: Test playback controls**

1. Click Play button
2. Verify year auto-advances
3. Click Pause button
4. Change speed to 5x
5. Click Play again
Expected: Playback works, speed changes affect animation rate

**Step 5: Test keyboard shortcuts**

1. Press Up Arrow
2. Press Down Arrow
3. Press Space
4. Press Home
5. Press End
6. Press Escape
Expected: All shortcuts work as documented in design

**Step 6: Test collapse states**

1. Click legend toggle to collapse
2. Verify Time Machine remains visible
3. Click X to close Time Machine
4. Verify peek tab appears at bottom
5. Click peek tab
6. Verify legend expands
Expected: Three states work smoothly with animations

**Step 7: Test mobile responsiveness**

1. Resize browser to mobile width (< 768px)
2. Open Time Machine
3. Verify controls are touch-friendly
4. Verify progress bar is still usable
Expected: UI adapts to mobile, all controls accessible

**Step 8: Document any issues found**

Create GitHub issues for any bugs discovered during testing.

---

## Task 10: Final Verification and Cleanup

**Files:**
- All modified files

**Step 1: Run full build**

Run: `npm run build`
Expected: Build succeeds with no errors or warnings

**Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: No TypeScript errors

**Step 3: Check for console errors**

1. Open browser dev tools
2. Navigate through farm editor
3. Open/close Time Machine multiple times
Expected: No console errors or warnings

**Step 4: Final commit if cleanup needed**

If any minor fixes were needed:

```bash
git add .
git commit -m "chore: final cleanup for Time Machine integration"
```

**Step 5: Push to remote**

```bash
git push origin main
```

Expected: All commits pushed successfully

---

## Completion Checklist

- [ ] MapLegend interface updated with Time Machine props
- [ ] Time Machine state added to MapLegend
- [ ] Auto-advance playback logic implemented
- [ ] Keyboard shortcuts working
- [ ] Progress bar with glow effect rendered
- [ ] Control buttons functional
- [ ] FarmMap component updated
- [ ] Old TimeMachineOverlay deleted
- [ ] Three collapse states working
- [ ] Peek tab appears when fully collapsed
- [ ] Mobile responsive design verified
- [ ] No TypeScript errors
- [ ] All keyboard shortcuts tested
- [ ] Build succeeds
- [ ] Changes committed and pushed

---

## Notes for Engineer

**Key Implementation Details:**

1. **Progress Bar Click Handler**: Uses `getBoundingClientRect()` to calculate which year was clicked based on mouse position. The percentage is converted to a year value.

2. **Glow Effect**: Applied via Tailwind's `shadow-[]` utility with HSL color variables. Intensity increases when playing via conditional className.

3. **Year Indicator Positioning**: Uses inline `style={{ left: ${progressPercent}% }}` for smooth positioning. CSS transitions handle animation.

4. **Collapse Logic**: The component now has complex conditional rendering:
   - Peek tab shows when `isCollapsed && !isTimeMachineOpen`
   - Time Machine shows when `isTimeMachineOpen`
   - Legend toggle bar shows when not fully collapsed
   - Legend content shows when `!isCollapsed`

5. **Keyboard Shortcuts**: Only active when Time Machine is open. Prevents capturing keys when user is typing in inputs.

6. **State Management**: Time Machine state lives in FarmMap component and flows down to MapLegend. This keeps the component controlled and predictable.

**Common Pitfalls:**

- Don't forget to update the FAB handler from `setShowTimeMachine` to `setIsTimeMachineOpen`
- Ensure all Time Machine props are optional in the interface (they should have `?`)
- The progress bar needs `cursor-pointer` class for click interaction
- Year markers should not interfere with clicking the progress bar (use `pointer-events-none` if needed)

**Testing Focus:**

- Rapid clicking/scrubbing of progress bar
- Switching speeds while playing
- Keyboard shortcuts while typing in other inputs (should not trigger)
- Collapse/expand transitions don't cause layout shift
- Mobile touch targets are large enough (36px minimum)
