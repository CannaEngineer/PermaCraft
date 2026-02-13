# Immersive Map Editor Components

Full-screen, immersive map experience for farm detail pages.

## Components

### `ImmersiveMapEditor`
Main component that orchestrates all immersive UI.

**Props:**
- `farm: Farm` - Farm data
- `initialZones: Zone[]` - Initial zones
- `isOwner: boolean` - Ownership flag
- `initialIsPublic: boolean` - Public visibility

### `CollapsibleHeader`
Auto-collapsing header that shrinks on map interaction.

**Key Features:**
- Auto-collapse on first map interaction
- Expand on hover or click
- Smooth Framer Motion animations
- Mobile: slides completely off-screen when collapsed

### `MapControlPanel`
Consolidated map settings panel (layers, grid, options).

**Key Features:**
- Accordion-style sections
- Minimizes to FAB icon
- Glassmorphism styling
- Keyboard shortcuts in Help section

### `DrawingToolbar`
Vertical toolbar for zone drawing tools.

**Key Features:**
- Only visible when in drawing mode
- Tools: Polygon, Circle, Point, Edit, Delete
- Zone type selector
- Done button to exit

### `BottomDrawer`
Slide-up drawer for zone/planting details.

**Key Features:**
- Three height states: peek, medium, max
- Drag to resize
- Spring physics animations
- Velocity-based dismissal

### `ChatOverlay`
AI chat panel with backdrop blur.

**Key Features:**
- Slides in from right
- Backdrop blur effect
- ESC key to close
- Full-screen on mobile

## Context

### `ImmersiveMapUIContext`
Centralized state for all UI panels.

**Usage:**
```tsx
const { chatOpen, setChatOpen, openDrawer, closeDrawer } = useImmersiveMapUI();
```

## Keyboard Shortcuts

- `C` - Toggle chat panel
- `H` - Toggle header expand/collapse
- `Esc` - Close active panel/drawer
- `D` - Enter drawing mode (when implemented)

## Feature Flag

Control rollout via `.env.local`:

```
NEXT_PUBLIC_USE_IMMERSIVE_EDITOR=true
```

Set to `false` to use classic editor.
