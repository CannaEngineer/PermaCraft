# Layer-Aware Click Handler Integration Guide

## Overview

This document describes how to integrate layer-aware click handling into the FarmMap component to prevent interaction with features on locked layers.

## Status

- **Task 5 Progress**: Partial
- **Components Created**: Layer system fully functional
- **Remaining Work**: Click handler integration in farm-map.tsx

## Integration Points

### 1. FarmMap Component (components/map/farm-map.tsx)

Add layer context import at the top:

```typescript
import { useLayerContext } from '@/contexts/layer-context';
```

Inside the FarmMap function component, add the hook (with optional fallback):

```typescript
export function FarmMap({ ... }: FarmMapProps) {
  const { toast } = useToast();

  // Layer context (optional - gracefully degrades if not available)
  let layerContext = null;
  try {
    layerContext = useLayerContext();
  } catch (e) {
    // Layer provider not available, skip layer checks
  }
```

### 2. Zone Click Handler (line ~2055)

Modify the zone selection handler to check if the zone's layer is locked:

```typescript
// Handle zone selection (from colored layer)
if (feature.layer.id === 'colored-zones-fill' && feature.properties) {
  // Layer-aware check: skip if feature is on a locked layer
  if (layerContext && feature.properties.layer_ids) {
    try {
      const featureLayerIds = JSON.parse(feature.properties.layer_ids);
      const isLocked = featureLayerIds.some((layerId: string) =>
        layerContext.isLayerLocked(layerId)
      );
      if (isLocked) {
        // Feature is on a locked layer, ignore click
        return;
      }
    } catch (e) {
      // Invalid layer data, allow interaction as fallback
    }
  }

  onFeatureSelect(feature.properties.id || feature.id?.toString(), 'zone', {
    id: feature.properties.id || feature.id,
    name: feature.properties.name,
    zone_type: feature.properties.user_zone_type,
  });

  // ...rest of handler
}
```

### 3. Planting Click Handler (line ~2034)

Similar modification for planting selection:

```typescript
// Handle planting selection
if (feature.layer.id === 'plantings-layer' && feature.properties) {
  // Layer-aware check
  if (layerContext && feature.properties.layer_ids) {
    try {
      const featureLayerIds = JSON.parse(feature.properties.layer_ids);
      const isLocked = featureLayerIds.some((layerId: string) =>
        layerContext.isLayerLocked(layerId)
      );
      if (isLocked) {
        return; // Skip locked features
      }
    } catch (e) {
      // Fallback: allow interaction
    }
  }

  const plantingData = {
    // ...planting data
  };
  onFeatureSelect(feature.properties.id, 'planting', plantingData);
  // ...rest of handler
}
```

### 4. PlantingMarker Component (components/map/planting-marker.tsx)

Add an optional prop for layer checking:

```typescript
interface PlantingMarkerProps {
  planting: any;
  map: maplibregl.Map;
  currentYear?: number;
  onClick?: (planting: any) => void;
  onBeforeClick?: (planting: any) => boolean; // NEW: Return false to prevent click
}
```

Modify the click handler in useEffect (line ~88):

```typescript
if (onClick) {
  el.addEventListener('click', () => {
    // Check if click is allowed
    const canClick = onBeforeClick ? onBeforeClick(planting) : true;
    if (canClick) {
      onClick(planting);
    }
  });
}
```

Then in FarmMap where PlantingMarker is used, pass the check function:

```typescript
<PlantingMarker
  key={planting.id}
  planting={planting}
  map={map.current}
  currentYear={currentYear}
  onBeforeClick={(p) => {
    // Check if planting's layer is locked
    if (layerContext && p.layer_ids) {
      try {
        const layers = JSON.parse(p.layer_ids);
        return !layers.some((layerId: string) => layerContext.isLayerLocked(layerId));
      } catch {
        return true; // Fallback: allow click
      }
    }
    return true; // No layer context, allow click
  }}
  onClick={(p) => {
    setSelectedPlanting(p);
    // ...rest of handler
  }}
/>
```

## Visual Feedback

Consider adding visual indicators for locked layers:

1. Reduce opacity of features on locked layers
2. Show lock icon cursor on hover
3. Toast notification when clicking locked features

Example:

```typescript
if (isLocked) {
  toast({
    title: "Layer Locked",
    description: "This feature is on a locked layer. Unlock it in Settings to edit.",
    variant: "destructive",
  });
  return;
}
```

## Testing Checklist

- [ ] Zone click respects layer lock state
- [ ] Planting click respects layer lock state
- [ ] Line click respects layer lock state (when implemented)
- [ ] Locked features show visual feedback
- [ ] Graceful degradation when layer context not available
- [ ] Performance: no lag when checking locks on many features

## Future Enhancements

1. **Active Layer Filtering**: Only allow editing features on the active layer
2. **Layer Visibility**: Hide features when their layer is invisible
3. **Multi-Layer Features**: Handle features that belong to multiple layers
4. **Layer-Based Z-Index**: Render features in layer display_order
5. **Bulk Layer Assignment**: Tools to assign multiple features to a layer

## Notes

- Layer system is fully implemented and functional
- Integration requires modifying click handlers in farm-map.tsx
- Design is non-breaking: works with or without LayerProvider
- All infrastructure (context, UI, API, database) is ready
