# Immersive Map Editor Design

**Date:** 2026-02-12
**Status:** Approved
**Type:** Full Redesign (Approach B)

## Overview

Transform the farm detail page into an immersive, full-screen map experience similar to Google Maps. The redesign creates a completely new `ImmersiveMapEditor` component that prioritizes the map while keeping all existing functionality accessible through elegant, minimal UI overlays.

### Design Goals

1. **Map-first experience**: Full viewport utilization (100vh) with no wasted space
2. **Immersive & intuitive**: UI adapts to user context, gets out of the way when needed
3. **All features preserved**: Every current function remains accessible, just reorganized
4. **Modern aesthetic**: Glassmorphism design with backdrop blur effects
5. **Theme-aware**: Seamless light/dark mode support
6. **Mobile optimized**: Touch-first design for phones and tablets
7. **Performance**: Smooth 60fps animations, optimized for all devices

### User Experience Philosophy

- **Auto-adaptive UI**: Interface collapses/expands based on user interactions
- **Context-aware**: Show only relevant controls for current mode (viewing vs. drawing)
- **Gesture-friendly**: Swipe, drag, and tap interactions feel natural
- **Discoverable**: New users can still find all features without hunting

---

## Architecture & Layout Structure

### Component Hierarchy

```
FarmDetailPage (Server Component - unchanged)
└── ImmersiveMapEditor (Client Component - NEW)
    ├── ImmersiveMapUIProvider (Context for UI state)
    ├── MapCanvas (full viewport, 100vh)
    │   └── FarmMap (reused, enhanced)
    ├── CollapsibleHeader (auto-hide bar)
    ├── MapControlPanel (top-right, glassmorphism)
    ├── DrawingToolbar (conditional, right side)
    ├── BottomDrawer (slide-up from bottom)
    └── ChatOverlay (backdrop blur)
```

### Layout Strategy

- **Root container**: `position: relative; width: 100vw; height: 100vh; overflow: hidden`
- **Map layer**: `position: absolute; inset: 0; z-index: 0` (base layer, full viewport)
- **UI overlays**: All UI elements as `position: absolute` with proper stacking:
  - Map: `z-index: 0` (base)
  - Control panel: `z-index: 30`
  - Drawing toolbar: `z-index: 30`
  - Bottom drawer: `z-index: 35`
  - Header: `z-index: 40`
  - Chat overlay: `z-index: 50` (highest, with backdrop)

### Key Architectural Decisions

1. **Clean separation**: New `ImmersiveMapEditor` completely separate from `FarmEditorClient`
2. **No layout nesting**: All overlays are siblings to avoid z-index conflicts
3. **Single source of truth**: React context (`ImmersiveMapUIContext`) manages all panel visibility
4. **Theme-aware from the ground up**: All glassmorphism uses CSS variables that adapt to light/dark mode
5. **Feature flag enabled**: Can deploy alongside old editor for gradual rollout

---

## Component Specifications

### 1. CollapsibleHeader

**Purpose:** Display farm metadata and primary actions while maximizing map visibility.

**Visual Design:**

- **Expanded state** (initial load):
  - Height: 120px
  - Layout: Two-tier design (farm identity + actions)
  - Shows: Farm name (large serif), description, AI chat button, save controls, goals button, settings
  - Background: `bg-background/80 backdrop-blur-lg border-b border-border/50`

- **Collapsed state** (auto-triggered):
  - Height: 48px
  - Layout: Single row
  - Shows: Farm name (small), save status indicator, settings icon
  - Background: `bg-background/60 backdrop-blur-md border-b border-border/30`

- **Transition**: 300ms ease-out-expo

**Auto-collapse Logic:**

```typescript
// Triggers
- User pans map (first interaction)
- User zooms map
- User starts drawing
- User enters planting mode

// Expand triggers
- Mouse hover on top 60px of viewport
- Click anywhere on collapsed header
- Manual toggle button
- Page load (starts expanded)

// Implementation
const [headerCollapsed, setHeaderCollapsed] = useState(false);
const { registerMapInteraction } = useImmersiveMapUI();

// On first map interaction
map.on('movestart', () => {
  if (!headerCollapsed) {
    registerMapInteraction();
    setHeaderCollapsed(true);
  }
});
```

**Props:**

```typescript
interface CollapsibleHeaderProps {
  farm: Farm;
  hasUnsavedChanges: boolean;
  saving: boolean;
  goalsCount: number;
  isPublic: boolean;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onSave: () => void;
  onOpenChat: () => void;
  onOpenGoals: () => void;
  onOpenSettings: () => void;
}
```

**Mobile Behavior:**

- Expanded: Single row, 56px height (farm name + AI button only)
- Collapsed: Slides completely off-screen
- Touch gesture: Swipe down from top edge to expand

---

### 2. MapControlPanel

**Purpose:** Consolidate map settings (layers, grid, options) into a single, minimal panel.

**Position:** Top-right corner, 16px from top and right edges

**Visual Design:**

- Glassmorphism card: `bg-background/70 backdrop-blur-xl border border-border/30 shadow-glass`
- Rounded: `rounded-xl`
- Padding: `p-3`
- Width: 240px (expanded), 56px (minimized to icons)

**Sections (accordion-style):**

1. **Map Layers**
   - Satellite, Terrain, Topo, USGS, Street toggles
   - Active layer highlighted

2. **Grid Settings**
   - Imperial/Metric toggle
   - Density: Auto, Sparse, Normal, Dense
   - Show/hide toggle

3. **Map Options**
   - Compass rose toggle
   - 3D terrain toggle
   - Bearing/pitch controls

4. **Help**
   - Keyboard shortcuts
   - Quick tips
   - Link to documentation

**Behavior:**

- Default: "Map Layers" section expanded, others collapsed
- Click section header to expand/collapse
- Click panel header to minimize entire panel to icons
- Each tool shows tooltip on hover

**State:**

```typescript
const [controlPanelMinimized, setControlPanelMinimized] = useState(false);
const [activeSection, setActiveSection] = useState<string | null>('layers');
```

**Mobile Behavior:**

- Minimized to single FAB (56x56px) in top-right
- Tap to open as bottom sheet (slides up from bottom)
- Bottom sheet height: 50vh
- Drag handle at top for dismissal

---

### 3. DrawingToolbar

**Purpose:** Provide zone drawing tools when in drawing/editing mode.

**When shown:** Only when `drawingMode === true`

**Position:** Right side of screen, vertically centered, 16px from edge (desktop)

**Visual Design:**

- Vertical toolbar: `bg-background/70 backdrop-blur-xl border border-border/30 rounded-2xl`
- Width: 64px
- Padding: `p-2`
- Gap between buttons: `gap-2`

**Tools (icon buttons):**

1. **Zone Type Selector** - Opens modal/dropdown with zone type picker
2. **Draw Polygon** - MapboxDraw polygon tool
3. **Draw Circle** - Custom circle drawing tool
4. **Draw Point** - Point marker tool
5. **Edit Mode** - Move vertices, reshape zones
6. **Delete Mode** - Click zones to delete
7. **Done/Exit** - Exit drawing mode (highlighted green)

**Visual States:**

- Active tool: `bg-primary text-primary-foreground shadow-lg`
- Inactive: `hover:bg-accent/50`
- Disabled: `opacity-50 cursor-not-allowed`

**Behavior:**

- Appears with slide-in-right animation (200ms) when entering draw mode
- Exits with slide-out-right animation when user clicks "Done"
- Tooltips appear on left side of toolbar (not right, to avoid edge cutoff)

**Mobile Behavior:**

- Position: Bottom of screen (horizontal toolbar)
- Height: 64px, full width
- Scrollable horizontally if needed
- Larger touch targets (48x48px minimum)
- Exit button sticky on right side

---

### 4. BottomDrawer

**Purpose:** Display and edit zone/planting details without covering the entire map.

**Triggers:**

- User clicks/taps a zone on the map
- User clicks/taps a planting marker
- User clicks "Add Planting" (species picker content)
- User clicks "View Zone Details"

**Visual Design:**

- Background: `bg-background/90 backdrop-blur-2xl border-t border-border/40`
- Rounded top corners: `rounded-t-3xl`
- Drag handle: `bg-muted-foreground/30 rounded-full w-12 h-1.5` (centered at top)
- Shadow: `shadow-2xl`

**Height States:**

1. **Peek** (80px): Title + primary action button visible
2. **Medium** (40vh): Full details form, comfortable for editing
3. **Maximized** (80vh): All content with scroll, leaves map partially visible

**Content Types:**

- **Zone details**: Name, type, area, edit form, delete button
- **Planting details**: Species info, notes, planted year, edit form, delete button
- **Species picker**: Browse/search species, filter by layer/function
- **Zone quick label**: Fast labeling form for newly drawn zones

**Gestures:**

- Drag handle up/down to resize
- Swipe down quickly to dismiss
- Tap backdrop (map) to close
- Velocity-based snap points

**Animation:**

```tsx
// Spring physics for natural feel
transition={{
  type: "spring",
  stiffness: 300,
  damping: 30,
  mass: 0.8
}}
```

**Mobile Optimizations:**

- Peek: 100px (larger for better readability)
- Medium: 50vh
- Max: 85vh (leave status bar visible)
- Larger drag handle: 48px wide, 6px tall
- More aggressive snap points

---

### 5. ChatOverlay

**Purpose:** Provide AI assistance without completely obscuring the map.

**Trigger:** Click "AI Assistant" button in header

**Visual Design:**

- **Panel**: `bg-background/95 backdrop-blur-2xl border-l border-border/40`
- **Backdrop**: `bg-black/20 dark:bg-black/40 backdrop-blur-sm` (covers map)
- Width: 400px (desktop), 100vw (mobile)
- Height: 100vh
- Shadow: `shadow-2xl`

**Layout:**

```
┌─────────────────────┐
│ Header (sticky)     │
│ [X Close]           │
├─────────────────────┤
│                     │
│ Chat Messages       │
│ (scrollable)        │
│                     │
├─────────────────────┤
│ Input (sticky)      │
│ [Message] [Send]    │
└─────────────────────┘
```

**Behavior:**

- Click backdrop to close
- ESC key to close
- Entrance: slide-in-right 300ms ease-out-expo
- Exit: slide-out-right 250ms ease-out-expo
- Backdrop fades in/out with panel (200ms)

**Mobile Behavior:**

- Full screen takeover (100vw × 100vh)
- No backdrop blur (performance)
- Slide-in-right animation
- iOS-style swipe-right-to-close gesture
- Back button in header (not X icon)
- Keyboard pushes content up (viewport adjusts)

---

## State Management

### ImmersiveMapUIContext

Centralized context for all UI panel visibility and state:

```typescript
interface ImmersiveMapUIState {
  // Header
  headerCollapsed: boolean;
  setHeaderCollapsed: (collapsed: boolean) => void;

  // Control Panel
  controlPanelMinimized: boolean;
  controlPanelSection: 'layers' | 'grid' | 'options' | 'help' | null;
  setControlPanelSection: (section: string | null) => void;
  toggleControlPanel: () => void;

  // Drawing Mode
  drawingMode: boolean;
  activeDrawTool: 'polygon' | 'circle' | 'point' | 'edit' | 'delete' | null;
  enterDrawingMode: () => void;
  exitDrawingMode: () => void;
  setActiveDrawTool: (tool: string | null) => void;

  // Bottom Drawer
  drawerContent: 'zone' | 'planting' | 'species-picker' | null;
  drawerHeight: 'peek' | 'medium' | 'max';
  openDrawer: (content: string, height?: string) => void;
  closeDrawer: () => void;
  setDrawerHeight: (height: string) => void;

  // Chat
  chatOpen: boolean;
  setChatOpen: (open: boolean) => void;

  // Map Interactions
  mapInteracted: boolean;
  registerMapInteraction: () => void;
}
```

**Provider Implementation:**

```tsx
export function ImmersiveMapUIProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ImmersiveMapUIState>({
    headerCollapsed: false,
    controlPanelMinimized: false,
    controlPanelSection: 'layers',
    drawingMode: false,
    activeDrawTool: null,
    drawerContent: null,
    drawerHeight: 'medium',
    chatOpen: false,
    mapInteracted: false,
  });

  // Methods to update state...

  return (
    <ImmersiveMapUIContext.Provider value={state}>
      {children}
    </ImmersiveMapUIContext.Provider>
  );
}

export const useImmersiveMapUI = () => useContext(ImmersiveMapUIContext);
```

### Interaction Flow Examples

**Example 1: User draws a new zone**

```
1. Click "Add Zone" button
   → enterDrawingMode()
   → DrawingToolbar appears (slide-in-right, 200ms)
   → Header auto-collapses
   → Control panel minimizes to icons

2. Select zone type from toolbar
   → Zone type modal/dropdown opens
   → User picks "Pond"
   → Modal closes

3. Select polygon tool
   → activeDrawTool = 'polygon'
   → Polygon tool highlighted
   → Map cursor changes to crosshair

4. Draw zone on map
   → MapboxDraw handles geometry
   → User double-clicks to finish

5. Quick label form appears
   → openDrawer('zone-quick-label', 'peek')
   → BottomDrawer slides up (80px height)
   → Shows: "Name this zone: [____]"

6. User names zone, clicks Save
   → Zone saved to database
   → closeDrawer()
   → exitDrawingMode()
   → DrawingToolbar slides out
```

**Example 2: User opens AI chat**

```
1. Click "AI Assistant" button
   → setChatOpen(true)
   → Backdrop fades in (200ms)
   → Chat panel slides in from right (300ms)
   → Header remains visible

2. User types question, sends
   → AI analysis starts
   → Map screenshot captured (with UI hidden temporarily)
   → Response streams back

3. User reviews response
   → Can scroll chat messages
   → Can see map through backdrop blur

4. User closes chat
   → Click backdrop or ESC key
   → setChatOpen(false)
   → Chat panel slides out (250ms)
   → Backdrop fades out (200ms)
```

**Example 3: User edits existing zone**

```
1. Click zone on map
   → selectedZone = zone.id
   → openDrawer('zone', 'medium')
   → BottomDrawer slides up to 40vh

2. User edits zone name
   → Form updates local state
   → Save button enabled

3. User drags drawer to max height
   → drawerHeight = 'max'
   → Drawer animates to 80vh (spring physics)
   → Can now see full form with all options

4. User saves changes
   → API call to update zone
   → Success toast
   → Drawer remains open with updated data

5. User taps map (backdrop)
   → closeDrawer()
   → Drawer slides down and exits
```

### Conflict Resolution

**Simultaneous panel rules:**

- **Chat + Drawer**: Both can be open; drawer overlays chat's backdrop
- **Drawing mode + Drawer**: Drawer closes when entering draw mode
- **Drawing mode + Chat**: Both can coexist; chat remains accessible
- **Multiple drawers**: Only one bottom drawer at a time (new content replaces old)
- **Mobile**: Bottom drawer and chat never both visible (chat is full-screen)

---

## Theming & Visual Design

### Theme System Integration

**Built on existing infrastructure:**

- Tailwind dark mode: `class` strategy (already configured)
- shadcn/ui CSS variables: `--background`, `--foreground`, `--border`, etc.
- All glassmorphism adapts to current theme automatically

### Glassmorphism CSS Variables

Add to `app/globals.css`:

```css
@layer base {
  :root {
    /* Existing shadcn variables remain unchanged */

    /* Glassmorphism overlays - Light mode */
    --glass-background: hsl(var(--background) / 0.7);
    --glass-background-strong: hsl(var(--background) / 0.9);
    --glass-border: hsl(var(--border) / 0.3);
    --glass-shadow: hsl(var(--foreground) / 0.1);

    /* Backdrop blur */
    --backdrop-light: hsl(0 0% 0% / 0.2);
    --backdrop-strong: hsl(0 0% 0% / 0.4);
  }

  .dark {
    /* Glassmorphism overlays - Dark mode */
    --glass-background: hsl(var(--background) / 0.6);
    --glass-background-strong: hsl(var(--background) / 0.85);
    --glass-border: hsl(var(--border) / 0.4);
    --glass-shadow: hsl(0 0% 0% / 0.3);

    --backdrop-light: hsl(0 0% 0% / 0.3);
    --backdrop-strong: hsl(0 0% 0% / 0.5);
  }
}
```

### Reusable Utility Classes

```css
@layer components {
  .glass-panel {
    @apply bg-background/70 backdrop-blur-xl border border-border/30 shadow-glass;
  }

  .glass-panel-strong {
    @apply bg-background/90 backdrop-blur-2xl border border-border/40 shadow-glass;
  }

  .glass-backdrop {
    @apply bg-black/20 dark:bg-black/40 backdrop-blur-sm;
  }
}
```

Add to `tailwind.config.ts`:

```typescript
theme: {
  extend: {
    backgroundImage: {
      'glass': 'linear-gradient(135deg, var(--glass-background) 0%, var(--glass-background-strong) 100%)',
    },
    boxShadow: {
      'glass': '0 8px 32px 0 var(--glass-shadow)',
    },
  }
}
```

### Component-Specific Styling

| Component | Expanded State | Collapsed/Minimal State |
|-----------|---------------|------------------------|
| CollapsibleHeader | `bg-background/80 backdrop-blur-lg border-b border-border/50` | `bg-background/60 backdrop-blur-md border-b border-border/30` |
| MapControlPanel | `glass-panel rounded-xl` | `glass-panel rounded-full w-14 h-14` |
| DrawingToolbar | `glass-panel rounded-2xl` | N/A (hidden when not in use) |
| BottomDrawer | `glass-panel-strong rounded-t-3xl border-t` | N/A (slides completely off-screen) |
| ChatOverlay | `bg-background/95 backdrop-blur-2xl border-l` | N/A |

### Accessibility Considerations

**Reduced transparency mode:**

```css
@media (prefers-reduced-transparency: reduce) {
  .glass-panel,
  .glass-panel-strong {
    @apply bg-background backdrop-blur-none;
  }

  .glass-backdrop {
    @apply bg-black/40 dark:bg-black/60 backdrop-blur-none;
  }
}
```

**WCAG AA contrast compliance:**

- All text maintains 4.5:1 contrast ratio even over blurred backgrounds
- Test with color blindness simulators
- Ensure glass effects don't reduce readability below standards

**Focus indicators:**

```css
.glass-panel button:focus-visible {
  @apply ring-2 ring-primary ring-offset-2 ring-offset-background;
}
```

---

## Animation & Transitions

### Animation Philosophy

- **Purposeful, not decorative**: Every animation communicates state change
- **Fast but not jarring**: 200-400ms sweet spot
- **Spring physics for organic feel**: Natural bounce on drawers
- **Respect user preferences**: Honor `prefers-reduced-motion`

### Timing & Easing

```css
:root {
  /* Timing */
  --duration-fast: 150ms;
  --duration-normal: 250ms;
  --duration-slow: 400ms;

  /* Easing curves */
  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in-out-back: cubic-bezier(0.68, -0.55, 0.265, 1.55);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

### Component Animations

**CollapsibleHeader (Auto-collapse)**

```css
.header-transition {
  transition: all var(--duration-normal) var(--ease-out-expo);
}

/* Animated properties: */
height: 120px → 48px
padding-y: 16px → 8px
opacity (description): 1 → 0
```

**DrawingToolbar (Enter/Exit)**

```tsx
<motion.div
  initial={{ x: 100, opacity: 0 }}
  animate={{ x: 0, opacity: 1 }}
  exit={{ x: 100, opacity: 0 }}
  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
>
  {/* Toolbar */}
</motion.div>
```

**BottomDrawer (Spring physics)**

```tsx
<motion.div
  initial={{ y: "100%" }}
  animate={{ y: drawerHeight === 'peek' ? "calc(100% - 80px)" :
              drawerHeight === 'medium' ? "60vh" : "20vh" }}
  exit={{ y: "100%" }}
  transition={{ type: "spring", stiffness: 300, damping: 30, mass: 0.8 }}
  drag="y"
  dragConstraints={{ top: 0, bottom: 0 }}
>
  {/* Drawer content */}
</motion.div>
```

**ChatOverlay (Slide + Backdrop)**

```tsx
// Backdrop
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
  transition={{ duration: 0.2 }}
  className="glass-backdrop"
/>

// Panel
<motion.div
  initial={{ x: "100%" }}
  animate={{ x: 0 }}
  exit={{ x: "100%" }}
  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
>
  {/* Chat */}
</motion.div>
```

### Micro-interactions

**Button hover/press:**

```css
.glass-button {
  transition: all var(--duration-fast) ease;
}

.glass-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px var(--glass-shadow);
}

.glass-button:active {
  transform: translateY(0);
}
```

**Tool selection:**

```tsx
<motion.button
  whileTap={{ scale: 0.95 }}
  whileHover={{ scale: 1.05 }}
  transition={{ duration: 0.15 }}
/>
```

### Reduced Motion Support

```tsx
const prefersReducedMotion = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
).matches;

<MotionConfig reducedMotion={prefersReducedMotion ? "always" : "never"}>
  {/* All animations */}
</MotionConfig>
```

---

## Mobile Responsive Behavior

### Breakpoint Strategy

```typescript
// Tailwind breakpoints
sm: 640px   // Large phones (landscape)
md: 768px   // Tablets (PRIMARY BREAKPOINT)
lg: 1024px  // Desktop
xl: 1280px  // Large desktop

// Component behavior changes at md (768px)
const isMobile = useMediaQuery('(max-width: 767px)');
```

### Mobile-Specific Adaptations

**CollapsibleHeader (Mobile)**

- Expanded: 56px height, single row (farm name + AI button)
- Collapsed: Slides completely off-screen (not just smaller)
- Touch gesture: Swipe down from top edge to expand
- Save/settings moved to overflow menu (3-dot icon)

**MapControlPanel (Mobile)**

- Default: Single FAB in top-right (56x56px, layers icon)
- Tap FAB → opens as bottom sheet (slides up from bottom, 50vh height)
- Sections remain accordion-style
- Drag handle at top for dismissal

**DrawingToolbar (Mobile)**

- Position: Bottom of screen (horizontal, not vertical)
- Height: 64px, full width
- Scrollable horizontal if many tools
- Larger touch targets: 48x48px minimum
- Exit button sticky on right

**BottomDrawer (Mobile)**

- Peek: 100px (larger for readability)
- Medium: 50vh
- Max: 85vh (leave status bar visible)
- Larger drag handle: 48px wide × 6px tall
- Velocity-based snap points (fast swipe = dismiss)

**ChatOverlay (Mobile)**

- Full screen takeover (100vw × 100vh)
- No backdrop blur (performance)
- Back button in header (iOS pattern)
- Swipe-right-to-close gesture
- Keyboard support (viewport adjusts)

### Touch Gestures

| Gesture | Action | Notes |
|---------|--------|-------|
| Swipe down from top | Expand header | Only when no drawer open |
| Swipe up on header | Collapse header | - |
| Tap top-right FAB | Open map controls (bottom sheet) | - |
| Swipe down on drawer | Resize or dismiss drawer | - |
| Swipe right on chat | Close chat | Chat intercepts, map doesn't pan |
| Pinch on map | Zoom | Always works |
| Two-finger rotate | Rotate map | Always works |

### Performance Optimizations (Mobile)

**Reduced blur intensity:**

```css
@media (max-width: 767px) {
  .glass-panel {
    backdrop-filter: blur(8px); /* Reduced from 16px */
  }

  .glass-panel-strong {
    backdrop-filter: blur(12px); /* Reduced from 24px */
  }
}
```

**Simplified shadows:**

```css
@media (max-width: 767px) {
  .shadow-glass {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  }
}
```

**Lazy loading:**

- Don't render DrawingToolbar until drawing mode activated
- Defer ChatOverlay until user opens it
- Lazy load drawer content based on type

### Safe Area Insets (iOS)

```css
.immersive-map-editor {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}

.bottom-drawer {
  padding-bottom: max(16px, env(safe-area-inset-bottom));
}
```

---

## Data Flow & API Integration

### No Backend Changes Required

All existing API endpoints remain unchanged:

- `POST /api/farms/[id]/zones` - Save zones
- `GET/POST /api/farms/[id]/plantings` - Plantings CRUD
- `POST /api/ai/analyze` - AI analysis
- `GET /api/farms/[id]/native-species` - Species recommendations
- `GET /api/farms/[id]/goals` - Farmer goals

Database schema unchanged. New UI is purely a presentation layer.

### Component Data Flow

```
Server (page.tsx)
  ↓ Server props (farm, zones, initialData)
ImmersiveMapEditor
  ├─→ MapCanvas (farm, zones)
  │    └─→ FarmMap (zones, onZonesChange)
  ├─→ CollapsibleHeader (farm metadata, actions)
  ├─→ MapControlPanel (map settings)
  ├─→ DrawingToolbar (drawing state)
  ├─→ BottomDrawer (selected zone/planting)
  └─→ ChatOverlay (farm context, AI analyze)
```

### State Synchronization

**Zones (existing pattern maintained):**

```tsx
const [zones, setZones] = useState<Zone[]>(initialZones);
const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

const handleZonesChange = (newZones: Zone[]) => {
  setZones(newZones);
  setHasUnsavedChanges(true);
  // Auto-save timer triggers after 2s (existing logic)
};
```

**Plantings (existing pattern maintained):**

```tsx
const [plantings, setPlantings] = useState<Planting[]>([]);

useEffect(() => {
  loadPlantings();
}, [farm.id]);

const addPlanting = async (planting: Planting) => {
  await fetch(`/api/farms/${farm.id}/plantings`, {
    method: 'POST',
    body: JSON.stringify(planting)
  });
  await loadPlantings(); // Refresh list
};
```

### Screenshot Capture (Enhanced)

Reuse existing `captureMapScreenshot` function with UI awareness:

```tsx
const captureMapScreenshot = async (): Promise<string> => {
  // Step 1: Hide all UI overlays
  setUIVisibleForScreenshot(false);
  await new Promise(resolve => setTimeout(resolve, 100));

  // Step 2: Capture using existing logic
  const screenshot = await existingCaptureLogic();

  // Step 3: Restore UI
  setUIVisibleForScreenshot(true);

  return screenshot;
};
```

---

## Migration Strategy

### Phase 1: Parallel Development (Week 1-2)

- Build `ImmersiveMapEditor` alongside `FarmEditorClient`
- Add feature flag:
  ```env
  NEXT_PUBLIC_USE_IMMERSIVE_EDITOR=false
  ```
- Conditional routing:
  ```tsx
  const useImmersive = process.env.NEXT_PUBLIC_USE_IMMERSIVE_EDITOR === 'true';
  return useImmersive ? <ImmersiveMapEditor {...props} /> : <FarmEditorClient {...props} />;
  ```

### Phase 2: Internal Testing (Week 3)

- Enable for development team only
- Test all user flows
- Gather feedback on UX
- Fix bugs and iterate

### Phase 3: Beta Rollout (Week 4)

- Enable for 10% of users (A/B test)
- Monitor:
  - Error rates (Sentry)
  - Performance metrics (Web Vitals)
  - User engagement (time on page, interactions)
  - Feature usage (drawing, chat, etc.)
- Collect feedback via in-app prompt

### Phase 4: Full Rollout (Week 5)

- Gradually increase to 100% over 3 days
- Keep old editor accessible via URL parameter (`?legacy=true`) for 2 weeks
- Monitor error rates closely

### Phase 5: Cleanup (Week 6)

- Remove `FarmEditorClient` component and dependencies
- Remove feature flag from environment
- Remove legacy route parameter
- Update documentation
- Remove unused components

---

## Success Metrics

### Performance Targets

- First Contentful Paint (FCP): < 1.5s
- Largest Contentful Paint (LCP): < 2.5s
- Cumulative Layout Shift (CLS): < 0.1
- First Input Delay (FID): < 100ms
- Animation frame rate: 60fps (no dropped frames)

### User Experience Goals

- Header collapse triggers within 100ms of map interaction
- All panel animations complete within 400ms
- Chat panel opens in < 300ms
- Bottom drawer responds to drag gestures immediately
- No layout shift when toggling panels

### Engagement Metrics (Targets)

- Time on farm editor page: +30% vs. old editor
- AI chat usage: +20% (more discoverable)
- Drawing mode engagement: +15% (easier to access)
- Mobile usage satisfaction: 4.5/5 stars or higher

---

## Technical Dependencies

### New Packages Required

```json
{
  "framer-motion": "^11.0.0"  // For advanced animations
}
```

### Existing Packages (No Changes)

- `maplibre-gl` - Map rendering
- `@mapbox/mapbox-gl-draw` - Drawing tools
- `html-to-image` - Screenshot capture
- `tailwindcss` - Styling
- `next` - Framework

---

## Risks & Mitigations

### Risk 1: User Confusion During Transition

**Mitigation:**
- Show one-time tooltip on first visit: "New immersive map view! Your farm data is safe."
- Provide "How to use" button in header (opens help section)
- Keep legacy editor accessible via URL parameter during rollout

### Risk 2: Performance on Low-End Devices

**Mitigation:**
- Detect device capabilities (GPU, memory)
- Automatically reduce blur effects on low-end devices
- Provide settings toggle: "Reduce visual effects"
- Test on older Android/iOS devices

### Risk 3: Browser Compatibility Issues

**Mitigation:**
- Test on all major browsers (Chrome, Firefox, Safari, Edge)
- Provide fallback styles for browsers without backdrop-filter support
- Use feature detection (Modernizr or manual checks)
- Display warning banner for unsupported browsers (IE11, etc.)

### Risk 4: Breaking Existing Workflows

**Mitigation:**
- Maintain all existing keyboard shortcuts
- Keep all features in same logical locations
- Beta test with power users before full rollout
- Provide video tutorial showing new UI

---

## Future Enhancements

### Post-Launch Improvements (Not in Initial Scope)

1. **Draggable panels**: Allow users to reposition control panels
2. **Panel size customization**: Let users resize chat/drawer to their preference
3. **Layout presets**: "Focused drawing", "AI chat mode", "Overview mode"
4. **Multi-monitor support**: Detach chat/controls to separate window
5. **Keyboard-only navigation**: Complete keyboard accessibility
6. **Custom themes**: Beyond light/dark (sepia, high contrast, etc.)
7. **Gesture customization**: Let users configure swipe actions
8. **Voice input**: Voice-to-text for AI chat on mobile

---

## Conclusion

The immersive map editor redesign transforms Permaculture.Studio into a truly map-first experience while preserving all existing functionality. By leveraging modern glassmorphism aesthetics, smart auto-adaptive UI, and performance-optimized animations, we create an interface that feels professional, intuitive, and delightful to use.

The full redesign approach (Approach B) ensures we can deliver a pixel-perfect implementation without compromises, building a solid foundation for future enhancements. The phased rollout strategy minimizes risk while allowing for rapid iteration based on user feedback.

**Key Takeaways:**

✅ Full viewport map experience (100vh, no wasted space)
✅ Auto-adaptive UI that gets out of the way
✅ Glassmorphism with full theme support (light/dark)
✅ Mobile-optimized with touch-first design
✅ All existing features preserved and enhanced
✅ No backend changes required
✅ Feature-flagged for safe rollout
✅ Performance-optimized (60fps animations)

---

**Next Steps:**

1. Review and approve this design document
2. Invoke `writing-plans` skill to create detailed implementation plan
3. Begin Phase 1: Parallel development with feature flag
4. Iterate based on internal testing feedback
