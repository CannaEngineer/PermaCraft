# Time Machine & Legend Integration Design

**Date**: 2025-12-04
**Status**: Approved for Implementation

## Overview

Integrate the Time Machine component into the map legend as a unified bottom UI panel, replacing the current sidebar Time Machine overlay with a sleek, video player-style horizontal control strip.

## Problem Statement

Current issues:
1. Time Machine sidebar uses hover-to-expand controls (not always accessible)
2. Separate positioning creates visual clutter on the map
3. Legend slides completely off screen when collapsed (no easy reaccess)
4. Standard vertical range slider doesn't match the futuristic aesthetic

## Solution

Create a unified bottom panel that combines legend and Time Machine with:
- Futuristic horizontal progress bar with year counter
- Always-visible video player-style controls
- Peek tab for easy reaccess when collapsed
- Three-state system: fully expanded, Time Machine only, or peek tab

## Component Architecture

### Unified Bottom UI System

```
MapLegend Component (or rename to MapBottomPanel)
├─ Peek Tab (always visible when collapsed)
├─ Time Machine Strip (when isTimeMachineOpen)
│  ├─ Progress Bar (horizontal, full-width)
│  └─ Control Buttons (Play/Pause, Reset, Speed, Close)
└─ Legend Content (Farm Boundary, Zones, Plantings)
```

### Z-index Hierarchy
- FAB: `z-[45]`
- Chat: `z-[35]`
- Bottom Panel: `z-20`
- Map: `z-0`

### Props Interface

```typescript
interface MapLegendProps {
  // Existing props
  mapLayer: "satellite" | "mapbox-satellite" | "terrain-3d" | "terrain" | "topo" | "usgs" | "street";
  gridUnit: "imperial" | "metric";
  zones: any[];
  plantings?: any[];

  // Legend collapse state
  isLegendCollapsed?: boolean;
  onToggleLegend?: () => void;

  // Time Machine props (optional)
  isTimeMachineOpen?: boolean;
  onCloseTimeMachine?: () => void;
  currentYear?: number;
  onYearChange?: (year: number) => void;
  minYear?: number;
  maxYear?: number;
}
```

## Design Details

### 1. Futuristic Progress Bar

**Visual Design:**
- **Track**: Full-width gradient background (`bg-muted/50`)
- **Fill**: Animated gradient bar with glow effect (`bg-primary` with gradient)
- **Year Indicator**: Large bold year number positioned on the fill
- **Year Markers**: Small tick marks every 5 years
- **Glow Effect**: `box-shadow: 0 0 20px hsl(var(--primary) / 0.5)`

**Interaction:**
- Click anywhere to jump to that year
- Draggable year indicator for scrubbing
- Hover tooltip showing year at cursor

**Implementation:**
```tsx
<div className="relative h-10 bg-muted/50 rounded-full">
  {/* Fill bar */}
  <div
    className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary to-primary/80"
    style={{ width: `${progressPercent}%` }}
  />

  {/* Year indicator */}
  <div
    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 font-bold text-2xl"
    style={{ left: `${progressPercent}%` }}
  >
    {currentYear}
  </div>
</div>
```

**Height**: 40px (compact but touch-friendly)

### 2. Control Strip Layout

**Button Row (left to right):**

1. **Play/Pause** - Primary button, ~36px square
   - Toggles between Play ▶ and Pause ⏸
   - Primary background when active

2. **Reset** - Ghost/outline button, ~36px square
   - RotateCcw icon ↺
   - Returns to current year (minYear)

3. **Speed Selector** - Compact dropdown, ~60px wide
   - Options: 0.5x, 1x, 2x, 5x, 10x
   - Matches button height

4. **Close** - Ghost button, ~36px square (far right)
   - X icon
   - Closes Time Machine strip

**Layout:**
```tsx
<div className="flex items-center justify-between px-4 py-2 border-t">
  <div className="flex items-center gap-2">
    <Button size="icon">{isPlaying ? <Pause /> : <Play />}</Button>
    <Button size="icon" variant="outline"><RotateCcw /></Button>
    <select className="h-9 px-2 rounded-md">{/* speeds */}</select>
  </div>
  <Button size="icon" variant="ghost"><X /></Button>
</div>
```

### 3. Three-State Collapse System

**State 1: Fully Expanded**
- Time Machine strip visible (if `isTimeMachineOpen`)
- Legend content visible
- Total height: ~200-250px

**State 2: Time Machine Only**
- Time Machine strip visible
- Legend content hidden
- Height: ~100px

**State 3: Peek Tab**
- Everything collapsed
- Small tab at bottom edge
- Height: ~32px
- Content: "Legend ▲" + status text

**Peek Tab Design:**
```tsx
<div className="absolute bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t">
  <div
    className="flex items-center justify-between px-4 py-2 cursor-pointer hover:bg-accent/50"
    onClick={onToggleLegend}
  >
    <span className="text-sm font-semibold">Legend ▲</span>
    <span className="text-xs text-muted-foreground">
      {currentYear ? `${currentYear} • ` : ''}{layerName} • {gridSpacing}
    </span>
  </div>
</div>
```

**Collapse Logic:**
- Separate states: `isLegendCollapsed` and `isTimeMachineOpen`
- Peek tab always visible (doesn't slide)
- Time Machine Close button sets `isTimeMachineOpen` to false
- Legend toggle in peek tab controls `isLegendCollapsed`

**Animation:**
- `transition-all duration-300` for smooth slides
- Content slides up/down with `translate-y`
- Peek tab remains fixed at bottom

### 4. Keyboard Shortcuts

Preserved from current Time Machine:
- **Arrow Up/Down**: Change year ±1
- **Space**: Toggle play/pause
- **Home**: Jump to minYear
- **End**: Jump to maxYear
- **Escape**: Close Time Machine

Only active when `isTimeMachineOpen` is true.

## Implementation Plan

### File Changes

1. **Delete**: `components/map/time-machine-overlay.tsx`
   - No longer needed; functionality merged into legend

2. **Update**: `components/map/map-legend.tsx`
   - Add Time Machine props to interface
   - Render Time Machine strip when `isTimeMachineOpen`
   - Add peek tab that's always visible
   - Implement three-state collapse logic

3. **Update**: `app/(app)/farm/[id]/farm-editor-client.tsx`
   - Remove `TimeMachineOverlay` import
   - Add Time Machine state management
   - Pass Time Machine props to `MapLegend`
   - Remove separate Time Machine rendering

4. **Update**: `components/map/map-controls-sheet.tsx`
   - FAB Time Machine action calls `setIsTimeMachineOpen(true)`
   - Remove any old Time Machine overlay references

### State Management (in farm-editor-client.tsx)

```tsx
const [isTimeMachineOpen, setIsTimeMachineOpen] = useState(false);
const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
const [isLegendCollapsed, setIsLegendCollapsed] = useState(false);

// Pass to MapLegend
<MapLegend
  mapLayer={mapLayer}
  gridUnit={gridUnit}
  zones={zones}
  plantings={plantings}
  isLegendCollapsed={isLegendCollapsed}
  onToggleLegend={() => setIsLegendCollapsed(!isLegendCollapsed)}
  isTimeMachineOpen={isTimeMachineOpen}
  onCloseTimeMachine={() => setIsTimeMachineOpen(false)}
  currentYear={currentYear}
  onYearChange={setCurrentYear}
  minYear={new Date().getFullYear()}
  maxYear={new Date().getFullYear() + 20}
/>
```

## Visual Polish

### Progress Bar Glow Effect
```css
.progress-fill {
  background: linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary) / 0.8));
  box-shadow: 0 0 20px hsl(var(--primary) / 0.5);
  transition: width 0.2s ease-out;
}

.progress-fill.playing {
  animation: pulse-glow 2s ease-in-out infinite;
}

@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 20px hsl(var(--primary) / 0.5); }
  50% { box-shadow: 0 0 30px hsl(var(--primary) / 0.7); }
}
```

### Year Indicator Transitions
```css
.year-indicator {
  transition: left 0.2s ease-out;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}
```

## Responsive Behavior

**Mobile:**
- Single column legend layout
- Full-width progress bar
- Button controls stack if needed (but should fit on one row)

**Desktop:**
- 4-column legend grid
- Same progress bar and control layout
- More generous spacing

## Success Criteria

- [ ] Time Machine controls always visible (no hover required)
- [ ] Progress bar has futuristic glow effect
- [ ] Year number moves along progress bar
- [ ] Legend accessible via peek tab when collapsed
- [ ] All keyboard shortcuts work
- [ ] Smooth animations between states
- [ ] No blocking of map view
- [ ] Touch-friendly button sizes (36px minimum)
- [ ] Integrates seamlessly with existing legend

## Trade-offs

**Benefits:**
- Single cohesive UI panel instead of scattered elements
- Always-accessible controls
- Better use of screen space
- Familiar video player metaphor
- Peek tab provides persistent access point

**Considerations:**
- Slightly taller bottom panel when both expanded
- More complex state management (two collapse states)
- Need to coordinate Time Machine and legend animations

## Future Enhancements

- Auto-hide Time Machine when not interacted with for 30s
- Add year range brush for selecting specific time periods
- Animated transitions showing plant growth between years
- Shareable timeline links with specific year anchors
