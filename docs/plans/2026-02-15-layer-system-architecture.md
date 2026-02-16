# Layer System Architecture Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement a layer management system where zones, plantings, and lines exist on separate selectable layers, solving click-through issues and enabling professional CAD-like layer control.

**Architecture:** Layer manager with toggle visibility, lock/unlock, z-index ordering, and layer-specific click handlers. Extend existing schema with layer assignments, use MapLibre layer ordering for rendering.

**Tech Stack:** React Context, MapLibre GL JS layers, Database migrations (zones/plantings layer_ids already exists)

---

## Current System Analysis

**Current Implementation:**
- Database: `zones` and `plantings` tables have `layer_ids` column (TEXT, JSON array) from migration `015_extend_features_layer_ids.sql`
- Map rendering: All features render on same z-index, causing click conflicts
- No layer management UI exists

**Click Priority Issues:**
- Plantings (markers) have z-index 10
- Zones (polygons) have z-index (implicit, lower)
- When overlapping, zones can block planting clicks

**Existing Layer References:**
- Plant "layers" (canopy, understory, etc.) are permaculture stratification - different concept
- Need design layers (like Photoshop/CAD layers)

---

## Task 1: Layer Data Model

**Files:**
- Create: `lib/layers/layer-types.ts`
- Test: `lib/layers/layer-types.test.ts`

**Step 1: Write failing test**

```typescript
// lib/layers/layer-types.test.ts
import { describe, test, expect } from '@jest/globals';
import { createDefaultLayers, getLayerOrder, validateLayerId } from './layer-types';

describe('Layer Types', () => {
  test('creates default layers with correct properties', () => {
    const layers = createDefaultLayers('farm-123');

    expect(layers).toHaveLength(5);
    expect(layers[0]).toMatchObject({
      name: 'Zones',
      featureType: 'zone',
      visible: true,
      locked: false,
      zIndex: 1
    });
  });

  test('calculates layer z-index order correctly', () => {
    const layers = createDefaultLayers('farm-123');
    const order = getLayerOrder(layers);

    expect(order[0].name).toBe('Zones'); // Bottom
    expect(order[order.length - 1].name).toBe('Annotations'); // Top
  });

  test('validates layer IDs', () => {
    expect(validateLayerId('layer-123')).toBe(true);
    expect(validateLayerId('invalid')).toBe(false);
  });
});
```

**Step 2: Run test to verify failure**

```bash
npm test -- layer-types.test.ts
```

Expected: FAIL - module not found

**Step 3: Implement layer types**

```typescript
// lib/layers/layer-types.ts
export interface DesignLayer {
  id: string;
  farm_id: string;
  name: string;
  color: string | null;
  description: string | null;
  visible: number; // 0 or 1 (SQLite boolean)
  locked: number; // 0 or 1
  display_order: number; // Z-index
  featureType: 'zone' | 'planting' | 'line' | 'annotation';
  created_at: number;
}

export interface LayerWithFeatures extends DesignLayer {
  featureCount: number;
}

/**
 * Create default layer structure for a new farm
 */
export function createDefaultLayers(farmId: string): Omit<DesignLayer, 'created_at'>[] {
  const now = Date.now();

  return [
    {
      id: `${farmId}-layer-zones`,
      farm_id: farmId,
      name: 'Zones',
      color: null,
      description: 'Zone boundaries and areas',
      visible: 1,
      locked: 0,
      display_order: 1,
      featureType: 'zone'
    },
    {
      id: `${farmId}-layer-plantings`,
      farm_id: farmId,
      name: 'Plantings',
      color: '#22c55e',
      description: 'Individual plants and trees',
      visible: 1,
      locked: 0,
      display_order: 2,
      featureType: 'planting'
    },
    {
      id: `${farmId}-layer-water`,
      farm_id: farmId,
      name: 'Water Systems',
      color: '#0ea5e9',
      description: 'Swales, ponds, and water flow',
      visible: 1,
      locked: 0,
      display_order: 3,
      featureType: 'line'
    },
    {
      id: `${farmId}-layer-infrastructure`,
      farm_id: farmId,
      name: 'Infrastructure',
      color: '#64748b',
      description: 'Paths, fences, and structures',
      visible: 1,
      locked: 0,
      display_order: 4,
      featureType: 'zone'
    },
    {
      id: `${farmId}-layer-annotations`,
      farm_id: farmId,
      name: 'Annotations',
      color: '#8b5cf6',
      description: 'Notes and labels',
      visible: 1,
      locked: 0,
      display_order: 5,
      featureType: 'annotation'
    }
  ];
}

/**
 * Get layers sorted by display order (z-index)
 */
export function getLayerOrder(layers: DesignLayer[]): DesignLayer[] {
  return [...layers].sort((a, b) => a.display_order - b.display_order);
}

/**
 * Validate layer ID format
 */
export function validateLayerId(id: string): boolean {
  return /^[a-z0-9-]+-layer-[a-z0-9-]+$/.test(id);
}

/**
 * Check if feature belongs to layer
 */
export function isFeatureInLayer(
  featureLayerIds: string | null,
  layerId: string
): boolean {
  if (!featureLayerIds) return false;
  try {
    const layers = JSON.parse(featureLayerIds);
    return Array.isArray(layers) && layers.includes(layerId);
  } catch {
    return false;
  }
}

/**
 * Add feature to layer
 */
export function addFeatureToLayer(
  currentLayerIds: string | null,
  layerId: string
): string {
  try {
    const layers = currentLayerIds ? JSON.parse(currentLayerIds) : [];
    if (!layers.includes(layerId)) {
      layers.push(layerId);
    }
    return JSON.stringify(layers);
  } catch {
    return JSON.stringify([layerId]);
  }
}

/**
 * Remove feature from layer
 */
export function removeFeatureFromLayer(
  currentLayerIds: string | null,
  layerId: string
): string {
  try {
    const layers = currentLayerIds ? JSON.parse(currentLayerIds) : [];
    const filtered = layers.filter((id: string) => id !== layerId);
    return JSON.stringify(filtered);
  } catch {
    return JSON.stringify([]);
  }
}
```

**Step 4: Run test to verify pass**

```bash
npm test -- layer-types.test.ts
```

Expected: PASS

**Step 5: Commit layer types**

```bash
git add lib/layers/layer-types.ts lib/layers/layer-types.test.ts
git commit -m "feat(layers): add layer data model and utilities"
```

---

## Task 2: Layer Database Schema (Already Exists!)

**Files:**
- Verify: `lib/db/migrations/003_design_layers.sql`
- Reference: `lib/db/schema.ts:439-451`

**Step 1: Review existing schema**

The `design_layers` table already exists:

```sql
-- From migration 003_design_layers.sql
CREATE TABLE IF NOT EXISTS design_layers (
  id TEXT PRIMARY KEY,
  farm_id TEXT NOT NULL,
  name TEXT NOT NULL,
  color TEXT,
  description TEXT,
  visible INTEGER NOT NULL DEFAULT 1,
  locked INTEGER NOT NULL DEFAULT 0,
  display_order INTEGER NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE
);
```

Also, `zones.layer_ids` and `plantings.layer_ids` columns exist from migration 015.

**Step 2: Create seed layers migration**

```sql
-- lib/db/migrations/050_seed_default_layers.sql
-- Add default layers for existing farms that don't have any

-- For each farm without layers, create default layer set
INSERT INTO design_layers (id, farm_id, name, color, description, visible, locked, display_order)
SELECT
  f.id || '-layer-zones',
  f.id,
  'Zones',
  NULL,
  'Zone boundaries and areas',
  1,
  0,
  1
FROM farms f
WHERE NOT EXISTS (
  SELECT 1 FROM design_layers dl WHERE dl.farm_id = f.id
);

INSERT INTO design_layers (id, farm_id, name, color, description, visible, locked, display_order)
SELECT
  f.id || '-layer-plantings',
  f.id,
  'Plantings',
  '#22c55e',
  'Individual plants and trees',
  1,
  0,
  2
FROM farms f
WHERE NOT EXISTS (
  SELECT 1 FROM design_layers dl WHERE dl.farm_id = f.id AND dl.name = 'Plantings'
);

-- ... similar for other default layers
```

**Step 3: Apply migration**

```bash
npx tsx scripts/run-migration.ts 050_seed_default_layers.sql
```

**Step 4: Commit migration**

```bash
git add lib/db/migrations/050_seed_default_layers.sql
git commit -m "feat(layers): add seed migration for default layers"
```

---

## Task 3: Layer Context Provider

**Files:**
- Create: `contexts/layer-context.tsx`

**Step 1: Create layer context**

```tsx
// contexts/layer-context.tsx
'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { DesignLayer, getLayerOrder } from '@/lib/layers/layer-types';

interface LayerContextValue {
  layers: DesignLayer[];
  visibleLayers: Set<string>;
  lockedLayers: Set<string>;
  activeLayer: string | null;

  toggleLayerVisibility: (layerId: string) => void;
  toggleLayerLock: (layerId: string) => void;
  setActiveLayer: (layerId: string | null) => void;
  reorderLayers: (layerId: string, newOrder: number) => void;
  refreshLayers: () => Promise<void>;

  isLayerVisible: (layerId: string) => boolean;
  isLayerLocked: (layerId: string) => boolean;
  isFeatureInActiveLayer: (featureLayerIds: string | null) => boolean;
}

const LayerContext = createContext<LayerContextValue | null>(null);

export function useLayerContext() {
  const context = useContext(LayerContext);
  if (!context) {
    throw new Error('useLayerContext must be used within LayerProvider');
  }
  return context;
}

interface LayerProviderProps {
  farmId: string;
  children: React.ReactNode;
}

export function LayerProvider({ farmId, children }: LayerProviderProps) {
  const [layers, setLayers] = useState<DesignLayer[]>([]);
  const [visibleLayers, setVisibleLayers] = useState<Set<string>>(new Set());
  const [lockedLayers, setLockedLayers] = useState<Set<string>>(new Set());
  const [activeLayer, setActiveLayerState] = useState<string | null>(null);

  // Load layers from API
  const refreshLayers = useCallback(async () => {
    try {
      const response = await fetch(`/api/farms/${farmId}/layers`);
      const data = await response.json();

      setLayers(data.layers || []);

      // Update visible/locked sets
      const visible = new Set(
        data.layers.filter((l: DesignLayer) => l.visible).map((l: DesignLayer) => l.id)
      );
      const locked = new Set(
        data.layers.filter((l: DesignLayer) => l.locked).map((l: DesignLayer) => l.id)
      );

      setVisibleLayers(visible);
      setLockedLayers(locked);

      // Set first visible, unlocked layer as active
      if (!activeLayer) {
        const firstEditable = data.layers.find(
          (l: DesignLayer) => l.visible && !l.locked
        );
        if (firstEditable) {
          setActiveLayerState(firstEditable.id);
        }
      }
    } catch (error) {
      console.error('Failed to load layers:', error);
    }
  }, [farmId, activeLayer]);

  useEffect(() => {
    refreshLayers();
  }, [refreshLayers]);

  // Toggle visibility
  const toggleLayerVisibility = useCallback(async (layerId: string) => {
    const layer = layers.find(l => l.id === layerId);
    if (!layer) return;

    const newVisible = !layer.visible;

    try {
      await fetch(`/api/farms/${farmId}/layers/${layerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visible: newVisible ? 1 : 0 })
      });

      setVisibleLayers(prev => {
        const next = new Set(prev);
        if (newVisible) {
          next.add(layerId);
        } else {
          next.delete(layerId);
        }
        return next;
      });

      await refreshLayers();
    } catch (error) {
      console.error('Failed to toggle visibility:', error);
    }
  }, [farmId, layers, refreshLayers]);

  // Toggle lock
  const toggleLayerLock = useCallback(async (layerId: string) => {
    const layer = layers.find(l => l.id === layerId);
    if (!layer) return;

    const newLocked = !layer.locked;

    try {
      await fetch(`/api/farms/${farmId}/layers/${layerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locked: newLocked ? 1 : 0 })
      });

      setLockedLayers(prev => {
        const next = new Set(prev);
        if (newLocked) {
          next.add(layerId);
        } else {
          next.delete(layerId);
        }
        return next;
      });

      await refreshLayers();
    } catch (error) {
      console.error('Failed to toggle lock:', error);
    }
  }, [farmId, layers, refreshLayers]);

  // Reorder layers
  const reorderLayers = useCallback(async (layerId: string, newOrder: number) => {
    try {
      await fetch(`/api/farms/${farmId}/layers/${layerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_order: newOrder })
      });

      await refreshLayers();
    } catch (error) {
      console.error('Failed to reorder layer:', error);
    }
  }, [farmId, refreshLayers]);

  // Helper functions
  const isLayerVisible = useCallback((layerId: string) => {
    return visibleLayers.has(layerId);
  }, [visibleLayers]);

  const isLayerLocked = useCallback((layerId: string) => {
    return lockedLayers.has(layerId);
  }, [lockedLayers]);

  const isFeatureInActiveLayer = useCallback((featureLayerIds: string | null) => {
    if (!activeLayer || !featureLayerIds) return false;
    try {
      const layers = JSON.parse(featureLayerIds);
      return Array.isArray(layers) && layers.includes(activeLayer);
    } catch {
      return false;
    }
  }, [activeLayer]);

  const value: LayerContextValue = {
    layers: getLayerOrder(layers),
    visibleLayers,
    lockedLayers,
    activeLayer,
    toggleLayerVisibility,
    toggleLayerLock,
    setActiveLayer: setActiveLayerState,
    reorderLayers,
    refreshLayers,
    isLayerVisible,
    isLayerLocked,
    isFeatureInActiveLayer
  };

  return (
    <LayerContext.Provider value={value}>
      {children}
    </LayerContext.Provider>
  );
}
```

**Step 2: Commit layer context**

```bash
git add contexts/layer-context.tsx
git commit -m "feat(layers): add layer context provider"
```

---

## Task 4: Layer Manager UI Component

**Files:**
- Create: `components/layers/layer-manager.tsx`

**Step 1: Create layer manager component**

```tsx
// components/layers/layer-manager.tsx
'use client';

import { Eye, EyeOff, Lock, Unlock, GripVertical, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useLayerContext } from '@/contexts/layer-context';
import { DragDropContext, Draggable, Droppable, DropResult } from '@hello-pangea/dnd';

export function LayerManager() {
  const {
    layers,
    activeLayer,
    setActiveLayer,
    toggleLayerVisibility,
    toggleLayerLock,
    reorderLayers,
    isLayerVisible,
    isLayerLocked
  } = useLayerContext();

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const sourceIndex = result.source.index;
    const destIndex = result.destination.index;

    if (sourceIndex === destIndex) return;

    const draggedLayer = layers[sourceIndex];
    reorderLayers(draggedLayer.id, destIndex + 1);
  };

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 border-b border-border bg-muted/50">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Layers</h3>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Layer list */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="layers">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="divide-y divide-border"
            >
              {layers.map((layer, index) => {
                const isActive = activeLayer === layer.id;
                const isVisible = isLayerVisible(layer.id);
                const isLocked = isLayerLocked(layer.id);

                return (
                  <Draggable key={layer.id} draggableId={layer.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={cn(
                          'flex items-center gap-2 px-3 py-2',
                          'hover:bg-accent/50 transition-colors',
                          isActive && 'bg-primary/10 border-l-2 border-primary',
                          snapshot.isDragging && 'shadow-lg bg-card'
                        )}
                      >
                        {/* Drag handle */}
                        <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing">
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                        </div>

                        {/* Color indicator */}
                        {layer.color && (
                          <div
                            className="w-3 h-3 rounded-full border border-border"
                            style={{ backgroundColor: layer.color }}
                          />
                        )}

                        {/* Layer name */}
                        <button
                          onClick={() => setActiveLayer(isActive ? null : layer.id)}
                          className="flex-1 text-left text-sm font-medium text-foreground hover:text-primary transition-colors"
                        >
                          {layer.name}
                        </button>

                        {/* Controls */}
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => toggleLayerVisibility(layer.id)}
                          >
                            {isVisible ? (
                              <Eye className="h-3.5 w-3.5" />
                            ) : (
                              <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => toggleLayerLock(layer.id)}
                          >
                            {isLocked ? (
                              <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                            ) : (
                              <Unlock className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Legend */}
      <div className="px-3 py-2 border-t border-border bg-muted/30 text-xs text-muted-foreground">
        <div className="flex items-center justify-between">
          <span>Drag to reorder • Click to select</span>
          <span>{layers.length} layers</span>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Install drag-drop dependency**

```bash
npm install @hello-pangea/dnd
```

**Step 3: Commit layer manager**

```bash
git add components/layers/layer-manager.tsx package.json package-lock.json
git commit -m "feat(layers): add layer manager UI component"
```

---

## Task 5: Layer-Aware Click Handler

**Files:**
- Modify: `components/map/farm-map.tsx:1900-1950` (zone click handler)
- Modify: `components/map/planting-marker.tsx:88-90` (planting click handler)

**Step 1: Add layer filter to zone click**

```tsx
// In farm-map.tsx, zone click handler around line 1900:
import { useLayerContext } from '@/contexts/layer-context';

// Inside FarmMap component:
const { activeLayer, isLayerLocked, isFeatureInActiveLayer } = useLayerContext();

// Update click handler:
map.current.on('click', 'colored-zones-fill', (e) => {
  if (!e.features || e.features.length === 0) return;
  const feature = e.features[0];

  // Check if feature's layer is visible and unlocked
  const featureLayerIds = feature.properties?.layer_ids;
  if (featureLayerIds) {
    // Parse layer IDs
    try {
      const layers = JSON.parse(featureLayerIds);
      // Check if any of the feature's layers are active and unlocked
      const canInteract = layers.some((layerId: string) =>
        !isLayerLocked(layerId)
      );
      if (!canInteract) {
        // Feature is on locked layer, ignore click
        return;
      }
    } catch (e) {
      // Invalid layer data, allow interaction
    }
  }

  // ... rest of existing click handler
});
```

**Step 2: Add layer filter to planting marker click**

```tsx
// In planting-marker.tsx:
// Pass layer lock check from FarmMap to PlantingMarker

interface PlantingMarkerProps {
  // ... existing props
  onBeforeClick?: (planting: any) => boolean; // Return false to prevent click
}

// In element click handler:
if (onClick) {
  el.addEventListener('click', () => {
    const canClick = onBeforeClick ? onBeforeClick(planting) : true;
    if (canClick) {
      onClick(planting);
    }
  });
}

// In farm-map.tsx where PlantingMarker is used:
<PlantingMarker
  // ... existing props
  onBeforeClick={(p) => {
    // Check if planting's layer is locked
    if (p.layer_ids) {
      try {
        const layers = JSON.parse(p.layer_ids);
        return layers.some((layerId: string) => !isLayerLocked(layerId));
      } catch {
        return true;
      }
    }
    return true;
  }}
  onClick={(p) => {
    setSelectedPlanting(p);
    // ... rest of handler
  }}
/>
```

**Step 3: Commit layer-aware clicks**

```bash
git add components/map/farm-map.tsx components/map/planting-marker.tsx
git commit -m "feat(layers): add layer-aware click handling"
```

---

## Task 6: Integration with Map UI

**Files:**
- Modify: `components/map/redesigned-map-info-sheet.tsx`
- OR: `components/map/map-bottom-drawer.tsx`

**Step 1: Add layer manager to advanced tab**

```tsx
// In redesigned-map-info-sheet.tsx or map-bottom-drawer.tsx:
import { LayerManager } from '@/components/layers/layer-manager';

// In advanced section:
{activeSection === 'advanced' && (
  <div className="space-y-4">
    <LayerManager />
    {children}
  </div>
)}
```

**Step 2: Wrap farm map with LayerProvider**

```tsx
// In app/(app)/farm/[id]/page.tsx or immersive-map-editor.tsx:
import { LayerProvider } from '@/contexts/layer-context';

<LayerProvider farmId={farm.id}>
  <FarmMap {...props} />
  <MapBottomDrawer {...props} />
</LayerProvider>
```

**Step 3: Commit integration**

```bash
git add components/map/redesigned-map-info-sheet.tsx app/(app)/farm/[id]/page.tsx
git commit -m "feat(layers): integrate layer manager with map UI"
```

---

## Task 7: Layer API Endpoints

**Files:**
- Create: `app/api/farms/[id]/layers/route.ts`
- Create: `app/api/farms/[id]/layers/[layerId]/route.ts`

**Step 1: Create GET /layers endpoint**

```typescript
// app/api/farms/[id]/layers/route.ts
import { requireAuth } from '@/lib/auth/session';
import { db } from '@/lib/db';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id: farmId } = await context.params;

    // Verify farm access
    const farmResult = await db.execute({
      sql: 'SELECT id FROM farms WHERE id = ? AND user_id = ?',
      args: [farmId, session.user.id]
    });

    if (farmResult.rows.length === 0) {
      return Response.json({ error: 'Farm not found' }, { status: 404 });
    }

    // Get layers
    const layersResult = await db.execute({
      sql: `SELECT * FROM design_layers
            WHERE farm_id = ?
            ORDER BY display_order ASC`,
      args: [farmId]
    });

    return Response.json({ layers: layersResult.rows });
  } catch (error) {
    console.error('Get layers error:', error);
    return Response.json({ error: 'Failed to get layers' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id: farmId } = await context.params;
    const body = await request.json();

    // Verify farm ownership
    const farmResult = await db.execute({
      sql: 'SELECT id FROM farms WHERE id = ? AND user_id = ?',
      args: [farmId, session.user.id]
    });

    if (farmResult.rows.length === 0) {
      return Response.json({ error: 'Farm not found' }, { status: 404 });
    }

    // Create new layer
    const layerId = crypto.randomUUID();
    await db.execute({
      sql: `INSERT INTO design_layers
            (id, farm_id, name, color, description, visible, locked, display_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        layerId,
        farmId,
        body.name,
        body.color || null,
        body.description || null,
        body.visible ?? 1,
        body.locked ?? 0,
        body.display_order ?? 999
      ]
    });

    return Response.json({ id: layerId }, { status: 201 });
  } catch (error) {
    console.error('Create layer error:', error);
    return Response.json({ error: 'Failed to create layer' }, { status: 500 });
  }
}
```

**Step 2: Create PATCH /layers/[layerId] endpoint**

```typescript
// app/api/farms/[id]/layers/[layerId]/route.ts
import { requireAuth } from '@/lib/auth/session';
import { db } from '@/lib/db';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string; layerId: string }> }
) {
  try {
    const session = await requireAuth();
    const { id: farmId, layerId } = await context.params;
    const body = await request.json();

    // Verify farm ownership
    const farmResult = await db.execute({
      sql: 'SELECT id FROM farms WHERE id = ? AND user_id = ?',
      args: [farmId, session.user.id]
    });

    if (farmResult.rows.length === 0) {
      return Response.json({ error: 'Farm not found' }, { status: 404 });
    }

    // Build update query dynamically
    const updates: string[] = [];
    const args: any[] = [];

    if (body.name !== undefined) {
      updates.push('name = ?');
      args.push(body.name);
    }
    if (body.visible !== undefined) {
      updates.push('visible = ?');
      args.push(body.visible);
    }
    if (body.locked !== undefined) {
      updates.push('locked = ?');
      args.push(body.locked);
    }
    if (body.display_order !== undefined) {
      updates.push('display_order = ?');
      args.push(body.display_order);
    }

    if (updates.length === 0) {
      return Response.json({ error: 'No updates provided' }, { status: 400 });
    }

    args.push(layerId, farmId);

    await db.execute({
      sql: `UPDATE design_layers SET ${updates.join(', ')}
            WHERE id = ? AND farm_id = ?`,
      args
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Update layer error:', error);
    return Response.json({ error: 'Failed to update layer' }, { status: 500 });
  }
}
```

**Step 3: Commit API endpoints**

```bash
git add app/api/farms/[id]/layers/
git commit -m "feat(layers): add layer API endpoints"
```

---

## Testing Checklist

- [ ] Layers load from database
- [ ] Toggle visibility hides/shows features
- [ ] Toggle lock prevents clicks
- [ ] Drag to reorder changes z-index
- [ ] Active layer highlights correctly
- [ ] Locked layer blocks clicks
- [ ] API endpoints work (GET, POST, PATCH)
- [ ] Migration seeds default layers
- [ ] Context updates across components

---

## Success Metrics

- **Usability:** Layer manager adoption rate >60%
- **Efficiency:** Time to isolate feature type <3 seconds
- **Click accuracy:** Reduced mis-clicks by 80%
- **Professional feel:** User survey "feels like CAD software" >4/5
