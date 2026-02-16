# Redesigned Map Info Sheet

## Overview
The redesigned map info sheet provides quick access to farm statistics, filters, and actions with a modern, card-based layout optimized for both desktop and mobile.

## Components

### QuickStatsCard
Displays key farm metrics in a grid layout.

**Props:**
- `stats`: Array of StatItem (label, value, icon, color)
- `title`: Optional section title
- `className`: Additional CSS classes

**Example:**
```tsx
<QuickStatsCard
  title="Farm Overview"
  stats={[
    { label: 'Plantings', value: 24, icon: Sprout, color: 'success' },
    { label: 'Zones', value: 8, icon: Square, color: 'info' }
  ]}
/>
```

### CompactFilterPills
Toggle filters with visual pills showing active state.

**Props:**
- `filters`: Array of FilterPill (id, label, color, count)
- `activeFilters`: Array of active filter IDs
- `onToggle`: Callback for filter toggle
- `onClearAll`: Optional clear all callback
- `title`: Section title (default: "Filters")

**Example:**
```tsx
<CompactFilterPills
  title="Layer Filters"
  filters={layerFilters}
  activeFilters={activeLayerFilters}
  onToggle={(id) => toggleFilter(id)}
  onClearAll={() => clearAll()}
/>
```

### QuickActionsBar
Quick access buttons for common map actions.

**Props:**
- `actions`: Array of QuickAction (id, label, icon, onClick, variant, badge)
- `className`: Additional CSS classes

**Example:**
```tsx
<QuickActionsBar
  actions={[
    { id: 'plant', label: 'Add Plant', icon: Leaf, onClick: handleAddPlant },
    { id: 'zone', label: 'Draw Zone', icon: Square, onClick: handleDrawZone }
  ]}
/>
```

### RedesignedMapInfoSheet
Main container component with three sections: Overview, Filters, and Advanced.

**Props:**
- `plantingCount`: Number of plantings
- `zoneCount`: Number of zones
- `functionCount`: Number of unique permaculture functions
- `layerFilters`: Array of layer filter definitions
- `activeLayerFilters`: Active layer filter IDs
- `onToggleLayerFilter`: Layer filter toggle callback
- `vitalFilters`: Array of vital filter definitions
- `activeVitalFilters`: Active vital filter IDs
- `onToggleVitalFilter`: Vital filter toggle callback
- `onAddPlant`: Add plant action handler
- `onDrawZone`: Draw zone action handler
- `onWaterSystem`: Water system action handler
- `onBuildGuild`: Build guild action handler
- `children`: Advanced section content

## Feature Flag
Controlled by `NEXT_PUBLIC_USE_REDESIGNED_INFO_SHEET` environment variable.

Set to `'true'` to enable the redesigned sheet, or `'false'` to use the original MapBottomDrawer.

## Integration

In `components/map/farm-map.tsx`:

```tsx
{process.env.NEXT_PUBLIC_USE_REDESIGNED_INFO_SHEET === 'true' ? (
  <RedesignedMapInfoSheet
    plantingCount={filteredPlantings.length}
    zoneCount={zones.filter(z => z.zone_type !== 'farm_boundary').length}
    functionCount={uniqueFunctionCount}
    layerFilters={layerFilterData}
    activeLayerFilters={plantingFilters}
    onToggleLayerFilter={toggleLayerFilter}
    // ... other props
  />
) : (
  <MapBottomDrawer {...originalProps} />
)}
```

## Design Tokens

All components use centralized design tokens from `lib/design/map-info-tokens.ts`:

- **Spacing**: Consistent padding, gaps, and margins
- **Typography**: Title, subtitle, value, label, metric styles
- **Colors**: Card backgrounds, borders, status colors
- **Animations**: Smooth transitions for cards, slides, fades
- **Shadows**: Subtle depth for cards and drawer

## Rollout Plan

### Week 1: Internal Testing
- Enable flag for development (`NEXT_PUBLIC_USE_REDESIGNED_INFO_SHEET=true`)
- Test all user flows on desktop and mobile
- Fix critical bugs
- Verify accessibility with screen readers

### Week 2: Beta Users
- Enable for 10% of users (random selection via backend)
- Monitor analytics for engagement metrics
- Collect feedback via in-app survey
- Track performance metrics (frame rate, load times)

### Week 3: Iteration
- Address user feedback
- Polish interactions based on real-world usage
- Performance tuning for slower devices
- A/B testing results analysis

### Week 4: Full Rollout
- Enable for 100% of users
- Monitor for issues via error tracking
- Gather satisfaction data
- Plan removal of old MapBottomDrawer component

## Accessibility

### Features
- Full keyboard navigation (Tab, Enter, Space)
- ARIA labels on all interactive elements
- Screen reader friendly with semantic HTML
- Touch targets ≥44x44px on mobile
- Focus indicators with visible rings
- Proper heading hierarchy

### Testing
Manual tests performed:
- [x] Tab through all interactive elements
- [x] Enter/Space activates buttons and toggles
- [x] Screen reader announces labels correctly
- [x] Focus visible on all interactive elements
- [x] Touch targets meet minimum size requirements

## Performance

### Optimizations
- Memoized calculations for filter counts
- Memoized callbacks to prevent recreation
- React.memo on child components (planned)
- Optimized re-renders with proper dependencies
- Debounced filter changes (150ms)

### Metrics
- Target: >60fps during interactions
- Card render time: <16ms
- Filter toggle response: <100ms
- Drawer expand/collapse: <300ms smooth animation

## Success Metrics

### Engagement
- Click-through rate on quick actions: Target +25%
- Time spent in info sheet: Target +15%
- Filter usage frequency: Target +30%

### Efficiency
- Time to apply filter: <2 seconds (down from 5s)
- Clicks to access common actions: 1-2 (down from 3-5)
- Task completion rate: >90%

### Satisfaction
- User survey rating: >4.5/5
- Net Promoter Score: >40
- Feature adoption rate: >80%

### Performance
- Frame rate during interactions: >60fps
- First contentful paint: <200ms
- Interaction to next paint: <100ms
- WCAG AA compliance: 100%

## Migration Path

Once redesigned sheet is stable and validated:

1. **Remove feature flag checks** - Make redesigned sheet the default
2. **Delete old component** - Remove `map-bottom-drawer.tsx`
3. **Clean up imports** - Remove MapBottomDrawer imports from farm-map.tsx
4. **Update tests** - Convert all tests to use new component
5. **Create migration guide** - Document changes for any custom integrations
6. **Archive old code** - Keep in git history for reference

## Known Issues

None at this time. Report bugs via GitHub issues with label `component:map-info-sheet`.

## Future Enhancements

- [ ] Draggable drawer height
- [ ] Swipe gestures on mobile
- [ ] Quick filter presets (e.g., "Show only edibles")
- [ ] Recent actions history
- [ ] Keyboard shortcuts (e.g., 'F' for filters)
- [ ] Dark mode color refinements
- [ ] Customizable action buttons
- [ ] Export filter configurations

## Related Files

- `components/map/redesigned-map-info-sheet.tsx` - Main container
- `components/map/info-cards/quick-stats-card.tsx` - Stats display
- `components/map/info-cards/compact-filter-pills.tsx` - Filter pills
- `components/map/info-cards/quick-actions-bar.tsx` - Action buttons
- `lib/design/map-info-tokens.ts` - Design system tokens
- `components/map/farm-map.tsx` - Integration point

## Support

For questions or issues:
- Check this documentation
- Review the implementation plan: `docs/plans/2026-02-15-map-info-sheet-redesign.md`
- Open GitHub issue with `component:map-info-sheet` label
- Contact development team via Slack #permaculture-studio
