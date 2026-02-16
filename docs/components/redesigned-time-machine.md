# Redesigned Time Machine

## Overview
Interactive timeline visualization for simulating plant growth over 20+ years. Features milestone markers, seasonal context, and growth preview cards.

## Components

### TimelineViz
Interactive d3-based timeline with draggable year indicator.

**Location:** `components/time-machine/timeline-viz.tsx`

**Features:**
- d3-scale for precise year-to-percentage mapping
- Draggable timeline with touch support
- Milestone markers (planted, established, flowering, fruiting, mature)
- Smooth animations via Framer Motion
- Click-to-jump to specific years

**Props:**
```typescript
interface TimelineVizProps {
  minYear: number;
  maxYear: number;
  currentYear: number;
  milestones: GrowthMilestone[];
  onYearChange: (year: number) => void;
  className?: string;
}
```

### GrowthPreviewCard
Shows individual plant growth progress and next milestone.

**Location:** `components/time-machine/growth-preview-card.tsx`

**Features:**
- Progress bar with sigmoid-based growth calculation
- Next milestone preview
- Species name (common + scientific)
- Layer badge
- Smooth animations

**Props:**
```typescript
interface GrowthPreviewCardProps {
  planting: PlantingPreview;
  className?: string;
}

interface PlantingPreview {
  id: string;
  commonName: string;
  scientificName: string;
  layer: string;
  currentSize: number; // Percentage of mature size
  nextMilestone?: GrowthMilestone;
}
```

### RedesignedTimeMachine
Main container with playback controls.

**Location:** `components/time-machine/redesigned-time-machine.tsx`

**Features:**
- Play/pause with variable speed (1x, 2x, 4x)
- Reset to starting year
- Seasonal context with activities
- Top 5 plants preview
- Mobile responsive design

**Props:**
```typescript
interface RedesignedTimeMachineProps {
  plantings: Planting[];
  currentYear: number;
  onYearChange: (year: number) => void;
  minYear?: number;
  maxYear?: number;
  onClose?: () => void;
}
```

## Growth Calculation
Uses sigmoid curve for realistic plant growth:

```typescript
y = 1 / (1 + e^(-8(x - 0.5)))
```

Where:
- `x = age / years_to_maturity`
- `y = size fraction (0-1)`

This creates an S-curve with:
- Slow initial growth (establishment)
- Rapid middle growth (active growing years)
- Slow final growth (approaching maturity)

## Milestones

Growth milestones are automatically calculated based on species maturity timeline:

| Milestone | Timing | Size Fraction | Icon |
|-----------|--------|---------------|------|
| Planted | Year 0 | 5% | 🌱 |
| Established | 20% of maturity | 30% | 🌿 |
| Flowering | 30% of maturity (trees/shrubs only) | 50% | 🌸 |
| Fruiting | 50% of maturity (trees/shrubs only) | 75% | 🍎 |
| Mature | 100% of maturity | 100% | 🌳 |

**Implementation:** `lib/time-machine/growth-milestones.ts`

## Seasonal Context

Shows current season activities based on Northern Hemisphere calendar:

| Season | Months | Activities |
|--------|--------|-----------|
| Spring | Mar-May | Planting, pruning, mulching |
| Summer | Jun-Aug | Harvesting, irrigation, pest management |
| Fall | Sep-Nov | Planting perennials, harvest, seed collection |
| Winter | Dec-Feb | Planning, pruning, infrastructure |

**Implementation:** `lib/time-machine/seasonal-context.ts`

## Performance

### Optimizations
- Memoized growth calculations (useMemo)
- Debounced year changes during drag
- Only renders top 5 preview cards
- Efficient milestone deduplication
- Framer Motion with GPU acceleration

### Benchmarks
- Target: 60fps during playback
- Scales to 50+ plantings
- Timeline interactions: <16ms
- Growth calculations: <5ms per planting

## Mobile Responsive

### Breakpoints
- `sm:` 640px - Two-column layout for content
- `md:` 768px - Increased padding

### Touch Optimizations
- `touch-none` on timeline prevents scroll interference
- `touch-manipulation` on buttons for faster tap response
- Larger hit areas (44px minimum)
- Flexible button layouts with wrapping

### Layout
- Single column on mobile (<640px)
- Two columns on tablet+ (≥640px)
- Stacked controls on mobile
- Horizontal controls on desktop

## Integration

Integrated into MapBottomDrawer as the 'timemachine' tab:

```tsx
// components/map/map-bottom-drawer.tsx
{activeTab === 'timemachine' && currentYear !== undefined && onYearChange && (
  <RedesignedTimeMachine
    plantings={plantings}
    currentYear={currentYear}
    onYearChange={onYearChange}
    minYear={minYear}
    maxYear={maxYear}
    onClose={onCloseTimeMachine}
  />
)}
```

## Dependencies

- **framer-motion**: Smooth animations and drag interactions
- **d3-scale**: Timeline scaling and positioning
- **date-fns**: Date calculations (if needed for seasonal logic)

## Testing

### Manual Testing Checklist
- [ ] Timeline renders correctly
- [ ] Milestones appear at correct positions
- [ ] Dragging indicator changes year
- [ ] Play/pause controls work
- [ ] Speed controls work (1x, 2x, 4x)
- [ ] Growth cards animate smoothly
- [ ] Seasonal context updates with year
- [ ] Mobile responsive (test on device)
- [ ] Touch interactions work
- [ ] Performance: 60fps during playback

### Unit Tests
See `lib/time-machine/growth-milestones.test.ts` for growth calculation tests.

## Known Limitations

1. **Northern Hemisphere Only**: Seasonal activities assume Northern Hemisphere
2. **Fixed Season Logic**: Uses calendar months, doesn't account for climate zones
3. **Preview Limit**: Only shows 5 plants at a time (performance optimization)
4. **No Custom Milestones**: Milestones are auto-calculated, can't be customized per species

## Future Enhancements

- [ ] Climate zone-aware seasonal activities
- [ ] Custom milestone definitions per species
- [ ] Infinite scroll for plant previews
- [ ] Export timeline as video/GIF
- [ ] Compare multiple years side-by-side
- [ ] Milestone notifications during playback
- [ ] Save/load timeline bookmarks

## References

- Sigmoid growth curve: https://en.wikipedia.org/wiki/Sigmoid_function
- Permaculture design principles: https://www.permacultureprinciples.com/
- Plant maturity timelines: Based on typical fruit tree growth rates
