# Track 2: Drawing & Water System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build Line/Polyline drawing tools, Water Design Toolkit with flow calculations, and Custom Imagery Upload for drone orthomosaics.

**Architecture:** Extend MapboxDraw with LineString mode, create `lines` table with water properties, implement R2-based imagery upload with manual alignment UI. Build water calculation utilities (catchment, swale volume) and flow network visualization.

**Tech Stack:** MapboxDraw (line drawing), MapLibre GL JS (arrow rendering, imagery layers), Sharp (server-side image processing), R2 (storage), Turf.js (area calculations)

---

## Prerequisites

- Track 1 completed (design_layers table exists for line assignment)
- MapboxDraw integrated in farm-map.tsx
- R2 storage configured with environment variables
- Existing zone/planting data models

---

## Part 1: Line/Polyline Drawing

### Task 1: Database Schema - Lines Table

**Files:**
- Create: `lib/db/migrations/029_lines.sql`
- Modify: `lib/db/schema.ts`

**Step 1: Create migration file**

Create `lib/db/migrations/029_lines.sql`:

```sql
CREATE TABLE IF NOT EXISTS lines (
  id TEXT PRIMARY KEY,
  farm_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  geometry TEXT NOT NULL,
  line_type TEXT NOT NULL DEFAULT 'custom',
  label TEXT,
  style TEXT NOT NULL,
  layer_ids TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_lines_farm ON lines(farm_id);
CREATE INDEX IF NOT EXISTS idx_lines_type ON lines(line_type);

-- Add layer_ids to lines for Track 1 integration
-- (This enables layer filtering for lines)
```

**Step 2: Run migration**

Run: `turso db shell permaculture-studio < lib/db/migrations/029_lines.sql`

**Step 3: Add TypeScript types**

Add to `lib/db/schema.ts`:

```typescript
export interface Line {
  id: string;
  farm_id: string;
  user_id: string;
  geometry: string; // GeoJSON LineString as TEXT
  line_type: 'swale' | 'flow_path' | 'fence' | 'hedge' | 'contour' | 'custom';
  label: string | null;
  style: string; // JSON: LineStyle
  layer_ids: string | null; // JSON array
  created_at: number;
  updated_at: number;
}

export interface LineStyle {
  color: string; // Hex
  width: number; // Pixels
  dashArray?: number[]; // [2, 2] for dashed
  opacity: number; // 0-1
  arrowDirection?: 'none' | 'forward' | 'reverse' | 'both';
}
```

**Step 4: Commit**

```bash
git add lib/db/migrations/029_lines.sql lib/db/schema.ts
git commit -m "feat(lines): add lines table schema

- GeoJSON LineString storage
- Line types (swale, flow_path, fence, etc.)
- Style storage as JSON (color, width, arrows)
- Layer integration support

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 2: Line Type Configurations

**Files:**
- Create: `lib/map/line-types.ts`

**Step 1: Create line type config file**

Create `lib/map/line-types.ts`:

```typescript
import type { LineStyle } from '@/lib/db/schema';

export interface LineTypeConfig {
  value: string;
  label: string;
  defaultStyle: LineStyle;
  description: string;
}

export const LINE_TYPES: Record<string, LineTypeConfig> = {
  swale: {
    value: 'swale',
    label: 'Swale',
    description: 'Water management swale along contour',
    defaultStyle: {
      color: '#0ea5e9',
      width: 3,
      opacity: 0.8,
      arrowDirection: 'none'
    }
  },
  flow_path: {
    value: 'flow_path',
    label: 'Flow Path',
    description: 'Water flow direction (surface or underground)',
    defaultStyle: {
      color: '#06b6d4',
      width: 2,
      dashArray: [4, 2],
      opacity: 0.7,
      arrowDirection: 'forward'
    }
  },
  fence: {
    value: 'fence',
    label: 'Fence',
    description: 'Fence line or boundary',
    defaultStyle: {
      color: '#71717a',
      width: 2,
      dashArray: [1, 3],
      opacity: 0.6,
      arrowDirection: 'none'
    }
  },
  hedge: {
    value: 'hedge',
    label: 'Hedge Row',
    description: 'Hedge or windbreak line',
    defaultStyle: {
      color: '#22c55e',
      width: 3,
      opacity: 0.7,
      arrowDirection: 'none'
    }
  },
  contour: {
    value: 'contour',
    label: 'Contour Line',
    description: 'Elevation contour reference',
    defaultStyle: {
      color: '#78716c',
      width: 1,
      opacity: 0.5,
      arrowDirection: 'none'
    }
  },
  custom: {
    value: 'custom',
    label: 'Custom',
    description: 'User-defined line',
    defaultStyle: {
      color: '#64748b',
      width: 2,
      opacity: 0.7,
      arrowDirection: 'none'
    }
  }
};

export function getLineTypeConfig(lineType: string): LineTypeConfig {
  return LINE_TYPES[lineType] || LINE_TYPES.custom;
}
```

**Step 2: Commit**

```bash
git add lib/map/line-types.ts
git commit -m "feat(lines): add line type configurations

- Predefined styles for swale, flow path, fence, hedge, contour
- Default colors, widths, dash patterns
- Arrow direction settings

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 3: API Route - Line CRUD

**Files:**
- Create: `app/api/farms/[id]/lines/route.ts`
- Create: `app/api/farms/[id]/lines/[lineId]/route.ts`

**Step 1: Create lines route**

Create `app/api/farms/[id]/lines/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { getLineTypeConfig } from '@/lib/map/line-types';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const farmId = params.id;
  const body = await request.json();

  // Validate required fields
  if (!body.geometry || !body.line_type) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 }
    );
  }

  // Verify farm ownership
  const farm = await db.execute({
    sql: 'SELECT user_id FROM farms WHERE id = ?',
    args: [farmId]
  });

  if (farm.rows.length === 0) {
    return NextResponse.json({ error: 'Farm not found' }, { status: 404 });
  }

  if (farm.rows[0].user_id !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Get default style if not provided
  const lineTypeConfig = getLineTypeConfig(body.line_type);
  const style = body.style || lineTypeConfig.defaultStyle;

  // Create line
  const lineId = crypto.randomUUID();
  await db.execute({
    sql: `INSERT INTO lines
          (id, farm_id, user_id, geometry, line_type, label, style, layer_ids)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      lineId,
      farmId,
      session.user.id,
      typeof body.geometry === 'string' ? body.geometry : JSON.stringify(body.geometry),
      body.line_type,
      body.label || null,
      JSON.stringify(style),
      body.layer_ids ? JSON.stringify(body.layer_ids) : null
    ]
  });

  const result = await db.execute({
    sql: 'SELECT * FROM lines WHERE id = ?',
    args: [lineId]
  });

  return NextResponse.json(result.rows[0], { status: 201 });
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const farmId = params.id;
  const { searchParams } = new URL(request.url);
  const lineType = searchParams.get('line_type');

  let sql = 'SELECT * FROM lines WHERE farm_id = ?';
  const args: any[] = [farmId];

  if (lineType) {
    sql += ' AND line_type = ?';
    args.push(lineType);
  }

  sql += ' ORDER BY created_at DESC';

  const result = await db.execute({ sql, args });

  // Parse JSON fields
  const lines = result.rows.map(row => ({
    ...row,
    style: row.style ? JSON.parse(row.style) : null,
    layer_ids: row.layer_ids ? JSON.parse(row.layer_ids) : []
  }));

  return NextResponse.json({ lines });
}
```

**Step 2: Create line update/delete route**

Create `app/api/farms/[id]/lines/[lineId]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; lineId: string } }
) {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: farmId, lineId } = params;
  const body = await request.json();

  const updates: string[] = [];
  const args: any[] = [];

  if (body.geometry !== undefined) {
    updates.push('geometry = ?');
    args.push(typeof body.geometry === 'string' ? body.geometry : JSON.stringify(body.geometry));
  }

  if (body.line_type !== undefined) {
    updates.push('line_type = ?');
    args.push(body.line_type);
  }

  if (body.label !== undefined) {
    updates.push('label = ?');
    args.push(body.label);
  }

  if (body.style !== undefined) {
    updates.push('style = ?');
    args.push(JSON.stringify(body.style));
  }

  if (body.layer_ids !== undefined) {
    updates.push('layer_ids = ?');
    args.push(JSON.stringify(body.layer_ids));
  }

  updates.push('updated_at = unixepoch()');

  if (updates.length === 1) {
    return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
  }

  args.push(lineId);

  await db.execute({
    sql: `UPDATE lines SET ${updates.join(', ')} WHERE id = ?`,
    args
  });

  const result = await db.execute({
    sql: 'SELECT * FROM lines WHERE id = ?',
    args: [lineId]
  });

  return NextResponse.json(result.rows[0]);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; lineId: string } }
) {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: farmId, lineId } = params;

  await db.execute({
    sql: 'DELETE FROM lines WHERE id = ? AND farm_id = ?',
    args: [lineId, farmId]
  });

  return NextResponse.json({ success: true });
}
```

**Step 3: Commit**

```bash
git add app/api/farms/\[id\]/lines/route.ts app/api/farms/\[id\]/lines/\[lineId\]/route.ts
git commit -m "feat(lines): add line CRUD API routes

- POST /api/farms/[id]/lines (create with auto-style)
- GET /api/farms/[id]/lines (list with filtering)
- PATCH /api/farms/[id]/lines/[lineId] (update)
- DELETE /api/farms/[id]/lines/[lineId] (delete)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 4: MapboxDraw Line Mode Integration

**Files:**
- Modify: `components/map/farm-map.tsx`

**Step 1: Enable line drawing mode**

Add line drawing mode to MapboxDraw initialization in `components/map/farm-map.tsx`:

```typescript
// Add to drawing mode state
const [drawTool, setDrawTool] = useState<'polygon' | 'circle' | 'line' | 'point' | null>(null);

// Function to activate line drawing
function startLineDrawing() {
  if (!draw.current) return;

  draw.current.changeMode('draw_line_string');
  setDrawTool('line');
  setDrawMode('draw_line_string');
}

// Add to draw.create event handler
map.current.on('draw.create', (e) => {
  const feature = e.features[0];

  if (feature.geometry.type === 'LineString') {
    // Handle line creation
    handleLineCreate(feature);
  } else if (feature.geometry.type === 'Polygon') {
    // Existing polygon handling
    handleZoneCreate(feature);
  }
});

async function handleLineCreate(feature: any) {
  // Open line detail form to get type and label
  setLineFeature(feature);
  setShowLineForm(true);
}
```

**Step 2: Add line drawing button to toolbar**

Add line button to drawing toolbar:

```typescript
<Button
  variant={drawTool === 'line' ? 'default' : 'outline'}
  size="sm"
  onClick={startLineDrawing}
  title="Draw Line"
>
  <Minus className="h-4 w-4" /> {/* Or custom line icon */}
  Line
</Button>
```

**Step 3: Commit**

```bash
git add components/map/farm-map.tsx
git commit -m "feat(lines): integrate line drawing mode with MapboxDraw

- Add draw_line_string mode support
- Handle line creation events
- Add line button to drawing toolbar

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 5: Line Rendering on Map

**Files:**
- Modify: `components/map/farm-map.tsx`

**Step 1: Add line source and layers**

Add MapLibre layers for rendering lines:

```typescript
// After map load, add line layers
map.current.on('load', () => {
  // ... existing sources/layers

  // Add lines source
  map.current!.addSource('lines-source', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] }
  });

  // Add lines layer
  map.current!.addLayer({
    id: 'design-lines',
    type: 'line',
    source: 'lines-source',
    paint: {
      'line-color': ['get', 'color'],
      'line-width': ['get', 'width'],
      'line-dasharray': ['coalesce', ['get', 'dashArray'], [1, 0]],
      'line-opacity': ['get', 'opacity']
    }
  });

  // Add arrows layer (for flow direction)
  map.current!.addLayer({
    id: 'line-arrows',
    type: 'symbol',
    source: 'lines-source',
    filter: ['!=', ['get', 'arrowDirection'], 'none'],
    layout: {
      'symbol-placement': 'line',
      'symbol-spacing': 100,
      'icon-image': 'arrow-icon', // Need to load this image
      'icon-size': 0.5,
      'icon-rotation-alignment': 'map',
      'icon-rotate': [
        'case',
        ['==', ['get', 'arrowDirection'], 'reverse'], 180,
        0
      ]
    }
  });

  loadLines(); // Load lines from API
});
```

**Step 2: Load lines function**

Add function to load lines from API:

```typescript
async function loadLines() {
  try {
    const response = await fetch(`/api/farms/${farm.id}/lines`);
    const data = await response.json();

    const lineFeatures = data.lines.map((line: any) => {
      const geometry = JSON.parse(line.geometry);
      const style = line.style;

      return {
        type: 'Feature',
        id: line.id,
        geometry,
        properties: {
          id: line.id,
          line_type: line.line_type,
          label: line.label,
          ...style // Spread color, width, dashArray, opacity, arrowDirection
        }
      };
    });

    const source = map.current!.getSource('lines-source') as maplibregl.GeoJSONSource;
    if (source) {
      source.setData({
        type: 'FeatureCollection',
        features: lineFeatures
      });
    }
  } catch (error) {
    console.error('Failed to load lines:', error);
  }
}
```

**Step 3: Load arrow icon**

Add arrow icon image:

```typescript
// Load arrow icon for directional lines
map.current.loadImage('/icons/arrow.png', (error, image) => {
  if (error) {
    console.error('Failed to load arrow icon:', error);
    return;
  }
  if (image) {
    map.current!.addImage('arrow-icon', image);
  }
});
```

**Step 4: Create arrow icon**

Create `public/icons/arrow.png` (or use SVG):
- Simple arrow pointing right
- 32x32px, transparent background
- White or black (will be tinted by line color)

**Step 5: Commit**

```bash
git add components/map/farm-map.tsx public/icons/arrow.png
git commit -m "feat(lines): render lines on map with arrows

- Add lines-source and design-lines layer
- Support dash patterns and arrows
- Load arrow icon for directional lines

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 6: Line Style Picker Component

**Files:**
- Create: `components/drawing/line-style-picker.tsx`

**Step 1: Create line style picker**

Create `components/drawing/line-style-picker.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { LineStyle } from '@/lib/db/schema';

interface LineStylePickerProps {
  value: LineStyle;
  onChange: (style: LineStyle) => void;
}

export function LineStylePicker({ value, onChange }: LineStylePickerProps) {
  function updateStyle(updates: Partial<LineStyle>) {
    onChange({ ...value, ...updates });
  }

  return (
    <div className="space-y-4">
      {/* Color */}
      <div>
        <Label htmlFor="line-color">Color</Label>
        <div className="flex gap-2 items-center">
          <Input
            id="line-color"
            type="color"
            value={value.color}
            onChange={(e) => updateStyle({ color: e.target.value })}
            className="w-20 h-10"
          />
          <span className="text-sm text-muted-foreground">{value.color}</span>
        </div>
      </div>

      {/* Width */}
      <div>
        <Label htmlFor="line-width">Width: {value.width}px</Label>
        <Slider
          id="line-width"
          min={1}
          max={10}
          step={0.5}
          value={[value.width]}
          onValueChange={([width]) => updateStyle({ width })}
        />
      </div>

      {/* Dash Pattern */}
      <div>
        <Label>Line Style</Label>
        <RadioGroup
          value={getDashPatternKey(value.dashArray)}
          onValueChange={(key) => updateStyle({ dashArray: getDashPattern(key) })}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="solid" id="solid" />
            <Label htmlFor="solid" className="flex items-center gap-2">
              Solid <div className="w-12 h-0.5 bg-foreground" />
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="dashed" id="dashed" />
            <Label htmlFor="dashed" className="flex items-center gap-2">
              Dashed <div className="w-12 h-0.5 border-t-2 border-dashed border-foreground" />
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="dotted" id="dotted" />
            <Label htmlFor="dotted" className="flex items-center gap-2">
              Dotted <div className="w-12 h-0.5 border-t-2 border-dotted border-foreground" />
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Arrow Direction */}
      <div>
        <Label>Arrow Direction</Label>
        <RadioGroup
          value={value.arrowDirection || 'none'}
          onValueChange={(arrowDirection: any) => updateStyle({ arrowDirection })}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="none" id="arrow-none" />
            <Label htmlFor="arrow-none">None</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="forward" id="arrow-forward" />
            <Label htmlFor="arrow-forward">Forward →</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="reverse" id="arrow-reverse" />
            <Label htmlFor="arrow-reverse">Reverse ←</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="both" id="arrow-both" />
            <Label htmlFor="arrow-both">Both ↔</Label>
          </div>
        </RadioGroup>
      </div>

      {/* Opacity */}
      <div>
        <Label htmlFor="line-opacity">Opacity: {Math.round(value.opacity * 100)}%</Label>
        <Slider
          id="line-opacity"
          min={0}
          max={1}
          step={0.1}
          value={[value.opacity]}
          onValueChange={([opacity]) => updateStyle({ opacity })}
        />
      </div>
    </div>
  );
}

function getDashPatternKey(dashArray?: number[]): string {
  if (!dashArray) return 'solid';
  if (dashArray[0] === 4 && dashArray[1] === 2) return 'dashed';
  if (dashArray[0] === 1 && dashArray[1] === 3) return 'dotted';
  return 'solid';
}

function getDashPattern(key: string): number[] | undefined {
  if (key === 'dashed') return [4, 2];
  if (key === 'dotted') return [1, 3];
  return undefined; // solid
}
```

**Step 2: Commit**

```bash
git add components/drawing/line-style-picker.tsx
git commit -m "feat(lines): add line style picker component

- Color picker
- Width slider (1-10px)
- Dash pattern (solid, dashed, dotted)
- Arrow direction (none, forward, reverse, both)
- Opacity slider

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 7: Line Type Selector & Line Form

**Files:**
- Create: `components/drawing/line-type-selector.tsx`
- Create: `components/drawing/line-form.tsx`

**Step 1: Create line type selector**

Create `components/drawing/line-type-selector.tsx`:

```typescript
'use client';

import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LINE_TYPES } from '@/lib/map/line-types';

interface LineTypeSelectorProps {
  value: string;
  onChange: (type: string) => void;
}

export function LineTypeSelector({ value, onChange }: LineTypeSelectorProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="line-type">Line Type</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id="line-type">
          <SelectValue placeholder="Select line type" />
        </SelectTrigger>
        <SelectContent>
          {Object.values(LINE_TYPES).map(type => (
            <SelectItem key={type.value} value={type.value}>
              <div>
                <div className="font-medium">{type.label}</div>
                <div className="text-xs text-muted-foreground">
                  {type.description}
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
```

**Step 2: Create line form component**

Create `components/drawing/line-form.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LineTypeSelector } from './line-type-selector';
import { LineStylePicker } from './line-style-picker';
import { getLineTypeConfig } from '@/lib/map/line-types';
import type { LineStyle } from '@/lib/db/schema';
import { useToast } from '@/hooks/use-toast';

interface LineFormProps {
  farmId: string;
  geometry: any; // GeoJSON LineString
  onComplete: () => void;
  onCancel: () => void;
}

export function LineForm({ farmId, geometry, onComplete, onCancel }: LineFormProps) {
  const [lineType, setLineType] = useState('custom');
  const [label, setLabel] = useState('');
  const [style, setStyle] = useState<LineStyle>(getLineTypeConfig('custom').defaultStyle);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  function handleTypeChange(type: string) {
    setLineType(type);
    // Auto-apply default style for type
    setStyle(getLineTypeConfig(type).defaultStyle);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch(`/api/farms/${farmId}/lines`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          geometry,
          line_type: lineType,
          label: label || null,
          style
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create line');
      }

      toast({ title: 'Line created successfully' });
      onComplete();
    } catch (error) {
      console.error('Failed to create line:', error);
      toast({
        title: 'Failed to create line',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4">
      <h3 className="text-lg font-semibold">Line Details</h3>

      <LineTypeSelector value={lineType} onChange={handleTypeChange} />

      <div>
        <Label htmlFor="line-label">Label (optional)</Label>
        <Input
          id="line-label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g., Main Swale, North Fence"
        />
      </div>

      <LineStylePicker value={style} onChange={setStyle} />

      <div className="flex gap-2">
        <Button type="submit" disabled={saving} className="flex-1">
          {saving ? 'Creating...' : 'Create Line'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
```

**Step 3: Commit**

```bash
git add components/drawing/line-type-selector.tsx components/drawing/line-form.tsx
git commit -m "feat(lines): add line type selector and line form

- Line type dropdown with descriptions
- Auto-apply default styles on type selection
- Label input
- Style customization
- Save to API

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Part 2: Water Design Toolkit

### Task 8: Database Schema - Water Properties

**Files:**
- Create: `lib/db/migrations/030_water_properties.sql`

**Step 1: Create migration file**

Create `lib/db/migrations/030_water_properties.sql`:

```sql
-- Extend lines table with water properties
ALTER TABLE lines ADD COLUMN water_properties TEXT;

-- Extend zones table with catchment and swale properties
ALTER TABLE zones ADD COLUMN catchment_properties TEXT;
ALTER TABLE zones ADD COLUMN swale_properties TEXT;

-- Example JSON structures (documented in comments):
-- water_properties: {"flow_type":"surface","flow_rate_estimate":"5 gpm","source_feature_id":"zone-123","destination_feature_id":"pond-456"}
-- catchment_properties: {"is_catchment":true,"rainfall_inches_per_year":40,"estimated_capture_gallons":15000,"destination_feature_id":"swale-789"}
-- swale_properties: {"is_swale":true,"length_feet":150,"cross_section_width_feet":3,"cross_section_depth_feet":1.5,"estimated_volume_gallons":2500,"overflow_destination_id":"pond-101"}
```

**Step 2: Run migration**

Run: `turso db shell permaculture-studio < lib/db/migrations/030_water_properties.sql`

**Step 3: Add TypeScript types**

Add to `lib/db/schema.ts`:

```typescript
export interface WaterProperties {
  flow_type: 'surface' | 'underground' | 'seasonal';
  flow_rate_estimate?: string;
  source_feature_id?: string;
  destination_feature_id?: string;
}

export interface CatchmentProperties {
  is_catchment: boolean;
  rainfall_inches_per_year?: number;
  estimated_capture_gallons?: number;
  destination_feature_id?: string;
}

export interface SwaleProperties {
  is_swale: boolean;
  length_feet?: number;
  cross_section_width_feet?: number;
  cross_section_depth_feet?: number;
  estimated_volume_gallons?: number;
  overflow_destination_id?: string;
}
```

**Step 4: Commit**

```bash
git add lib/db/migrations/030_water_properties.sql lib/db/schema.ts
git commit -m "feat(water): add water properties schema extensions

- Water properties for lines (flow type, source, destination)
- Catchment properties for zones (rainfall, capture volume)
- Swale properties for zones (dimensions, capacity)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 9: Water Calculation Utilities

**Files:**
- Create: `lib/water/calculations.ts`
- Install: `npm install @turf/turf` (if not already installed)

**Step 1: Create water calculation utilities**

Create `lib/water/calculations.ts`:

```typescript
import * as turf from '@turf/turf';
import type { Polygon, LineString } from 'geojson';

/**
 * Calculate catchment area in square feet and estimated capture volume
 */
export function calculateCatchment(
  polygon: Polygon,
  rainfallInchesPerYear: number
): {
  areaSquareFeet: number;
  areaAcres: number;
  estimatedCaptureGallons: number;
} {
  const areaSquareMeters = turf.area(polygon);
  const areaSquareFeet = areaSquareMeters * 10.764;
  const areaAcres = areaSquareFeet / 43560;

  // Calculate capture volume
  const rainfallFeet = rainfallInchesPerYear / 12;
  const volumeCubicFeet = areaSquareFeet * rainfallFeet;
  const estimatedCaptureGallons = volumeCubicFeet * 7.48; // ft³ to gallons

  return {
    areaSquareFeet: Math.round(areaSquareFeet),
    areaAcres: parseFloat(areaAcres.toFixed(3)),
    estimatedCaptureGallons: Math.round(estimatedCaptureGallons)
  };
}

/**
 * Calculate swale volume based on length and cross-section
 * Assumes triangular cross-section
 */
export function calculateSwaleVolume(
  lineGeometry: LineString,
  widthFeet: number,
  depthFeet: number
): {
  lengthFeet: number;
  lengthMeters: number;
  volumeCubicFeet: number;
  volumeGallons: number;
  volumeLiters: number;
} {
  const lengthMeters = turf.length(lineGeometry, { units: 'meters' });
  const lengthFeet = lengthMeters * 3.28084;

  // Triangular cross-section: (width * depth / 2) * length
  const volumeCubicFeet = (widthFeet * depthFeet / 2) * lengthFeet;
  const volumeGallons = volumeCubicFeet * 7.48;
  const volumeLiters = volumeGallons * 3.78541;

  return {
    lengthFeet: Math.round(lengthFeet),
    lengthMeters: parseFloat(lengthMeters.toFixed(2)),
    volumeCubicFeet: Math.round(volumeCubicFeet),
    volumeGallons: Math.round(volumeGallons),
    volumeLiters: Math.round(volumeLiters)
  };
}

/**
 * Get average annual rainfall for a location (mock for now)
 * TODO: Integrate with NOAA API or use user input
 */
export async function getAverageRainfall(
  lat: number,
  lng: number
): Promise<number> {
  // For MVP, return a placeholder
  // In production, call NOAA Climate Data API
  return 40; // inches per year (national average)
}
```

**Step 2: Commit**

```bash
git add lib/water/calculations.ts package.json
git commit -m "feat(water): add water calculation utilities

- Catchment area and capture volume calculation
- Swale volume calculation (triangular cross-section)
- Rainfall lookup placeholder

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 10: API Route - Water Calculations

**Files:**
- Create: `app/api/farms/[id]/water/calculate-catchment/route.ts`
- Create: `app/api/farms/[id]/water/calculate-swale-volume/route.ts`

**Step 1: Create catchment calculation route**

Create `app/api/farms/[id]/water/calculate-catchment/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { calculateCatchment } from '@/lib/water/calculations';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const farmId = params.id;
  const body = await request.json();

  if (!body.zone_id || !body.rainfall_inches_per_year) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 }
    );
  }

  // Get zone geometry
  const zone = await db.execute({
    sql: 'SELECT geometry FROM zones WHERE id = ? AND farm_id = ?',
    args: [body.zone_id, farmId]
  });

  if (zone.rows.length === 0) {
    return NextResponse.json({ error: 'Zone not found' }, { status: 404 });
  }

  const geometry = JSON.parse(zone.rows[0].geometry as string);
  const result = calculateCatchment(geometry, body.rainfall_inches_per_year);

  // Update zone with catchment properties
  await db.execute({
    sql: 'UPDATE zones SET catchment_properties = ? WHERE id = ?',
    args: [
      JSON.stringify({
        is_catchment: true,
        rainfall_inches_per_year: body.rainfall_inches_per_year,
        estimated_capture_gallons: result.estimatedCaptureGallons,
        destination_feature_id: body.destination_feature_id || null
      }),
      body.zone_id
    ]
  });

  return NextResponse.json(result);
}
```

**Step 2: Create swale volume calculation route**

Create `app/api/farms/[id]/water/calculate-swale-volume/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { calculateSwaleVolume } from '@/lib/water/calculations';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const farmId = params.id;
  const body = await request.json();

  if (!body.zone_id || !body.cross_section_width_feet || !body.cross_section_depth_feet) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 }
    );
  }

  // Get zone geometry (could also be a line)
  const zone = await db.execute({
    sql: 'SELECT geometry FROM zones WHERE id = ? AND farm_id = ?',
    args: [body.zone_id, farmId]
  });

  if (zone.rows.length === 0) {
    return NextResponse.json({ error: 'Zone not found' }, { status: 404 });
  }

  const geometry = JSON.parse(zone.rows[0].geometry as string);

  // Convert polygon to linestring (use boundary)
  // For MVP, assume it's already a line or use first ring
  const lineGeometry = geometry.type === 'LineString'
    ? geometry
    : { type: 'LineString', coordinates: geometry.coordinates[0] };

  const result = calculateSwaleVolume(
    lineGeometry,
    body.cross_section_width_feet,
    body.cross_section_depth_feet
  );

  // Update zone with swale properties
  await db.execute({
    sql: 'UPDATE zones SET swale_properties = ? WHERE id = ?',
    args: [
      JSON.stringify({
        is_swale: true,
        length_feet: result.lengthFeet,
        cross_section_width_feet: body.cross_section_width_feet,
        cross_section_depth_feet: body.cross_section_depth_feet,
        estimated_volume_gallons: result.volumeGallons,
        overflow_destination_id: body.overflow_destination_id || null
      }),
      body.zone_id
    ]
  });

  return NextResponse.json(result);
}
```

**Step 3: Commit**

```bash
git add app/api/farms/\[id\]/water/calculate-catchment/route.ts app/api/farms/\[id\]/water/calculate-swale-volume/route.ts
git commit -m "feat(water): add water calculation API endpoints

- POST /api/farms/[id]/water/calculate-catchment
- POST /api/farms/[id]/water/calculate-swale-volume
- Update zones with calculated properties

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 11: Catchment Calculator UI Component

**Files:**
- Create: `components/water/catchment-calculator.tsx`

**Step 1: Create catchment calculator component**

Create `components/water/catchment-calculator.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Droplet } from 'lucide-react';

interface CatchmentCalculatorProps {
  farmId: string;
  zoneId: string;
  onCalculated: (result: any) => void;
}

export function CatchmentCalculator({ farmId, zoneId, onCalculated }: CatchmentCalculatorProps) {
  const [rainfallInches, setRainfallInches] = useState('40');
  const [calculating, setCalculating] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  async function handleCalculate() {
    setCalculating(true);

    try {
      const response = await fetch(`/api/farms/${farmId}/water/calculate-catchment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          zone_id: zoneId,
          rainfall_inches_per_year: parseFloat(rainfallInches)
        })
      });

      if (!response.ok) {
        throw new Error('Failed to calculate catchment');
      }

      const data = await response.json();
      setResult(data);
      onCalculated(data);

      toast({
        title: 'Catchment calculated',
        description: `Estimated ${data.estimatedCaptureGallons.toLocaleString()} gallons/year`
      });
    } catch (error) {
      console.error('Failed to calculate catchment:', error);
      toast({
        title: 'Calculation failed',
        variant: 'destructive'
      });
    } finally {
      setCalculating(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Droplet className="h-5 w-5 text-blue-500" />
          Catchment Calculator
        </CardTitle>
        <CardDescription>
          Calculate water capture potential from this area
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="rainfall">Average Annual Rainfall (inches)</Label>
          <Input
            id="rainfall"
            type="number"
            value={rainfallInches}
            onChange={(e) => setRainfallInches(e.target.value)}
            min="0"
            step="0.1"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Check NOAA data or use farm location default
          </p>
        </div>

        <Button onClick={handleCalculate} disabled={calculating} className="w-full">
          {calculating ? 'Calculating...' : 'Calculate Catchment'}
        </Button>

        {result && (
          <div className="bg-muted p-4 rounded-md space-y-2">
            <div className="flex justify-between">
              <span className="text-sm font-medium">Area:</span>
              <span className="text-sm">
                {result.areaSquareFeet.toLocaleString()} ft² ({result.areaAcres} acres)
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium">Annual Rainfall:</span>
              <span className="text-sm">{rainfallInches} inches</span>
            </div>
            <div className="flex justify-between text-blue-600 font-semibold">
              <span>Est. Capture:</span>
              <span>{result.estimatedCaptureGallons.toLocaleString()} gallons/year</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {Math.round(result.estimatedCaptureGallons / 365)} gallons/day average
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

**Step 2: Commit**

```bash
git add components/water/catchment-calculator.tsx
git commit -m "feat(water): add catchment calculator component

- Input for annual rainfall
- Calculate area and capture volume
- Display daily average
- Save to zone properties

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 12: Swale Designer UI Component

**Files:**
- Create: `components/water/swale-designer.tsx`

**Step 1: Create swale designer component**

Create `components/water/swale-designer.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Waves } from 'lucide-react';

interface SwaleDesignerProps {
  farmId: string;
  zoneId: string;
  onCalculated: (result: any) => void;
}

export function SwaleDesigner({ farmId, zoneId, onCalculated }: SwaleDesignerProps) {
  const [width, setWidth] = useState('3');
  const [depth, setDepth] = useState('1.5');
  const [calculating, setCalculating] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  async function handleCalculate() {
    setCalculating(true);

    try {
      const response = await fetch(`/api/farms/${farmId}/water/calculate-swale-volume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          zone_id: zoneId,
          cross_section_width_feet: parseFloat(width),
          cross_section_depth_feet: parseFloat(depth)
        })
      });

      if (!response.ok) {
        throw new Error('Failed to calculate swale volume');
      }

      const data = await response.json();
      setResult(data);
      onCalculated(data);

      toast({
        title: 'Swale volume calculated',
        description: `${data.volumeGallons.toLocaleString()} gallons capacity`
      });
    } catch (error) {
      console.error('Failed to calculate swale:', error);
      toast({
        title: 'Calculation failed',
        variant: 'destructive'
      });
    } finally {
      setCalculating(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Waves className="h-5 w-5 text-cyan-500" />
          Swale Designer
        </CardTitle>
        <CardDescription>
          Calculate swale capacity based on dimensions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="width">Width (feet)</Label>
            <Input
              id="width"
              type="number"
              value={width}
              onChange={(e) => setWidth(e.target.value)}
              min="0.5"
              step="0.5"
            />
          </div>
          <div>
            <Label htmlFor="depth">Depth (feet)</Label>
            <Input
              id="depth"
              type="number"
              value={depth}
              onChange={(e) => setDepth(e.target.value)}
              min="0.5"
              step="0.5"
            />
          </div>
        </div>

        <div className="bg-muted p-3 rounded text-xs">
          <p className="font-medium mb-1">Cross-section: Triangular</p>
          <pre className="text-[10px]">
{`    ${width}ft
  ┌─────┐
  │╲   ╱│ ${depth}ft
  │ ╲ ╱ │
  └──┴──┘`}
          </pre>
        </div>

        <Button onClick={handleCalculate} disabled={calculating} className="w-full">
          {calculating ? 'Calculating...' : 'Calculate Volume'}
        </Button>

        {result && (
          <div className="bg-muted p-4 rounded-md space-y-2">
            <div className="flex justify-between">
              <span className="text-sm font-medium">Length:</span>
              <span className="text-sm">
                {result.lengthFeet.toLocaleString()} ft ({result.lengthMeters} m)
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium">Cross-section:</span>
              <span className="text-sm">{width} ft × {depth} ft</span>
            </div>
            <div className="flex justify-between text-cyan-600 font-semibold">
              <span>Capacity:</span>
              <span>{result.volumeGallons.toLocaleString()} gallons</span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Volume:</span>
              <span>
                {result.volumeCubicFeet.toLocaleString()} ft³ ({result.volumeLiters.toLocaleString()} L)
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

**Step 2: Commit**

```bash
git add components/water/swale-designer.tsx
git commit -m "feat(water): add swale designer component

- Input for width and depth dimensions
- Visual cross-section diagram
- Calculate volume and capacity
- Display in gallons, cubic feet, and liters

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 13: Water Connection Picker

**Files:**
- Create: `components/water/water-connection-picker.tsx`

**Step 1: Create water connection picker**

Create `components/water/water-connection-picker.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface Feature {
  id: string;
  type: 'zone' | 'line';
  label: string;
  zone_type?: string;
  line_type?: string;
}

interface WaterConnectionPickerProps {
  farmId: string;
  sourceId?: string | null;
  destinationId?: string | null;
  onSourceChange: (featureId: string | null) => void;
  onDestinationChange: (featureId: string | null) => void;
}

export function WaterConnectionPicker({
  farmId,
  sourceId,
  destinationId,
  onSourceChange,
  onDestinationChange
}: WaterConnectionPickerProps) {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFeatures();
  }, [farmId]);

  async function loadFeatures() {
    try {
      // Load zones
      const zonesResponse = await fetch(`/api/farms/${farmId}/zones`);
      const zonesData = await zonesResponse.json();

      // Load lines
      const linesResponse = await fetch(`/api/farms/${farmId}/lines`);
      const linesData = await linesResponse.json();

      const allFeatures: Feature[] = [
        ...zonesData.zones.map((z: any) => ({
          id: z.id,
          type: 'zone' as const,
          label: z.label || `Zone (${z.zone_type})`,
          zone_type: z.zone_type
        })),
        ...linesData.lines.map((l: any) => ({
          id: l.id,
          type: 'line' as const,
          label: l.label || `Line (${l.line_type})`,
          line_type: l.line_type
        }))
      ];

      setFeatures(allFeatures);
    } catch (error) {
      console.error('Failed to load features:', error);
    } finally {
      setLoading(false);
    }
  }

  function renderFeature(feature: Feature) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant={feature.type === 'zone' ? 'default' : 'secondary'}>
          {feature.type}
        </Badge>
        <span>{feature.label}</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="source">Water Source (optional)</Label>
        <Select
          value={sourceId || 'none'}
          onValueChange={(value) => onSourceChange(value === 'none' ? null : value)}
          disabled={loading}
        >
          <SelectTrigger id="source">
            <SelectValue placeholder="Select water source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No source</SelectItem>
            {features.map(feature => (
              <SelectItem key={feature.id} value={feature.id}>
                {renderFeature(feature)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground mt-1">
          Where does water come from? (pond, roof, uphill catchment)
        </p>
      </div>

      <div>
        <Label htmlFor="destination">Water Destination (optional)</Label>
        <Select
          value={destinationId || 'none'}
          onValueChange={(value) => onDestinationChange(value === 'none' ? null : value)}
          disabled={loading}
        >
          <SelectTrigger id="destination">
            <SelectValue placeholder="Select destination" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No destination</SelectItem>
            {features.map(feature => (
              <SelectItem key={feature.id} value={feature.id}>
                {renderFeature(feature)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground mt-1">
          Where does water flow to? (swale, pond, irrigation zone)
        </p>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add components/water/water-connection-picker.tsx
git commit -m "feat(water): add water connection picker component

- Select source and destination features
- Load all zones and lines
- Badge indicators for feature types
- Helper text for clarification

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 14: Water System Panel

**Files:**
- Create: `components/water/water-system-panel.tsx`

**Step 1: Create water system overview panel**

Create `components/water/water-system-panel.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Droplet, Waves, ArrowRight } from 'lucide-react';

interface WaterSystemPanelProps {
  farmId: string;
}

interface WaterFeature {
  id: string;
  type: 'catchment' | 'swale' | 'flow';
  label: string;
  properties: any;
}

export function WaterSystemPanel({ farmId }: WaterSystemPanelProps) {
  const [features, setFeatures] = useState<WaterFeature[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWaterFeatures();
  }, [farmId]);

  async function loadWaterFeatures() {
    try {
      const zonesResponse = await fetch(`/api/farms/${farmId}/zones`);
      const zonesData = await zonesResponse.json();

      const linesResponse = await fetch(`/api/farms/${farmId}/lines`);
      const linesData = await linesResponse.json();

      const waterFeatures: WaterFeature[] = [];

      // Extract catchments
      zonesData.zones.forEach((zone: any) => {
        if (zone.catchment_properties) {
          const props = JSON.parse(zone.catchment_properties);
          if (props.is_catchment) {
            waterFeatures.push({
              id: zone.id,
              type: 'catchment',
              label: zone.label || 'Catchment Area',
              properties: props
            });
          }
        }

        // Extract swales
        if (zone.swale_properties) {
          const props = JSON.parse(zone.swale_properties);
          if (props.is_swale) {
            waterFeatures.push({
              id: zone.id,
              type: 'swale',
              label: zone.label || 'Swale',
              properties: props
            });
          }
        }
      });

      // Extract flow paths
      linesData.lines.forEach((line: any) => {
        if (line.line_type === 'flow_path' && line.water_properties) {
          const props = JSON.parse(line.water_properties);
          waterFeatures.push({
            id: line.id,
            type: 'flow',
            label: line.label || 'Flow Path',
            properties: props
          });
        }
      });

      setFeatures(waterFeatures);
    } catch (error) {
      console.error('Failed to load water features:', error);
    } finally {
      setLoading(false);
    }
  }

  const catchments = features.filter(f => f.type === 'catchment');
  const swales = features.filter(f => f.type === 'swale');
  const flows = features.filter(f => f.type === 'flow');

  const totalCaptureGallons = catchments.reduce(
    (sum, c) => sum + (c.properties.estimated_capture_gallons || 0),
    0
  );

  const totalSwaleCapacityGallons = swales.reduce(
    (sum, s) => sum + (s.properties.estimated_volume_gallons || 0),
    0
  );

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading water system...</div>;
  }

  if (features.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground text-center">
            No water features yet. Use the catchment calculator or swale designer to get started.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Water System Overview</CardTitle>
        <CardDescription>
          Manage catchments, swales, and water flow paths
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="summary">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="catchments">Catchments</TabsTrigger>
            <TabsTrigger value="swales">Swales</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-md">
                <div className="flex items-center gap-2 mb-2">
                  <Droplet className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">Total Capture</span>
                </div>
                <div className="text-2xl font-bold text-blue-600">
                  {totalCaptureGallons.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">gallons/year</div>
              </div>

              <div className="bg-cyan-50 dark:bg-cyan-950 p-4 rounded-md">
                <div className="flex items-center gap-2 mb-2">
                  <Waves className="h-4 w-4 text-cyan-600" />
                  <span className="text-sm font-medium">Swale Capacity</span>
                </div>
                <div className="text-2xl font-bold text-cyan-600">
                  {totalSwaleCapacityGallons.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">gallons</div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Features:</div>
              <div className="flex gap-2">
                <Badge>{catchments.length} Catchment{catchments.length !== 1 ? 's' : ''}</Badge>
                <Badge variant="secondary">{swales.length} Swale{swales.length !== 1 ? 's' : ''}</Badge>
                <Badge variant="outline">{flows.length} Flow Path{flows.length !== 1 ? 's' : ''}</Badge>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="catchments" className="space-y-3">
            {catchments.map(catchment => (
              <div key={catchment.id} className="border rounded-md p-3">
                <div className="font-medium text-sm mb-2">{catchment.label}</div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Annual capture:</span>
                  <span className="font-medium">
                    {catchment.properties.estimated_capture_gallons?.toLocaleString()} gal
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Rainfall:</span>
                  <span>{catchment.properties.rainfall_inches_per_year} in/year</span>
                </div>
                {catchment.properties.destination_feature_id && (
                  <div className="flex items-center gap-1 text-xs text-blue-600 mt-2">
                    <ArrowRight className="h-3 w-3" />
                    <span>Connected to destination</span>
                  </div>
                )}
              </div>
            ))}
          </TabsContent>

          <TabsContent value="swales" className="space-y-3">
            {swales.map(swale => (
              <div key={swale.id} className="border rounded-md p-3">
                <div className="font-medium text-sm mb-2">{swale.label}</div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Capacity:</span>
                  <span className="font-medium">
                    {swale.properties.estimated_volume_gallons?.toLocaleString()} gal
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Length:</span>
                  <span>{swale.properties.length_feet} ft</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Cross-section:</span>
                  <span>
                    {swale.properties.cross_section_width_feet} ft × {swale.properties.cross_section_depth_feet} ft
                  </span>
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
```

**Step 2: Commit**

```bash
git add components/water/water-system-panel.tsx
git commit -m "feat(water): add water system overview panel

- Summary tab with totals
- Catchments list with capture volumes
- Swales list with capacity and dimensions
- Feature counts and badges

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Part 3: Custom Imagery Upload

### Task 15: Custom Imagery Database Schema

**Files:**
- Create: `lib/db/migrations/031_custom_imagery.sql`
- Modify: `lib/db/schema.ts`

**Step 1: Create migration file**

Create `lib/db/migrations/031_custom_imagery.sql`:

```sql
CREATE TABLE IF NOT EXISTS custom_imagery (
  id TEXT PRIMARY KEY,
  farm_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  label TEXT NOT NULL,
  source_url TEXT NOT NULL,
  processing_status TEXT NOT NULL DEFAULT 'pending' CHECK(processing_status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  tile_url_template TEXT,
  bounds TEXT NOT NULL,
  alignment_corners TEXT,
  opacity REAL NOT NULL DEFAULT 1.0,
  visible INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_custom_imagery_farm ON custom_imagery(farm_id);
CREATE INDEX IF NOT EXISTS idx_custom_imagery_status ON custom_imagery(processing_status);

-- bounds: JSON [[west, south], [east, north]]
-- alignment_corners: JSON [[lng1, lat1], [lng2, lat2], [lng3, lat3], [lng4, lat4]]
-- tile_url_template: "https://r2-bucket/farm-123/imagery-456/{z}/{x}/{y}.png"
```

**Step 2: Run migration**

Run: `turso db shell permaculture-studio < lib/db/migrations/031_custom_imagery.sql`

**Step 3: Add TypeScript types**

Add to `lib/db/schema.ts`:

```typescript
export interface CustomImagery {
  id: string;
  farm_id: string;
  user_id: string;
  label: string;
  source_url: string;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message: string | null;
  tile_url_template: string | null;
  bounds: string; // JSON [[west, south], [east, north]]
  alignment_corners: string | null; // JSON [[lng1, lat1], ...]
  opacity: number;
  visible: number; // SQLite boolean
  created_at: number;
  updated_at: number;
}

export interface ImageryBounds {
  southwest: [number, number];
  northeast: [number, number];
}

export interface ImageryAlignment {
  corners: [[number, number], [number, number], [number, number], [number, number]];
}
```

**Step 4: Commit**

```bash
git add lib/db/migrations/031_custom_imagery.sql lib/db/schema.ts
git commit -m "feat(imagery): add custom imagery database schema

- Processing status tracking
- R2 tile URL storage
- Alignment corner coordinates
- Opacity and visibility controls

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 16: R2 Signed URL Upload Endpoint

**Files:**
- Create: `app/api/farms/[id]/imagery/upload-url/route.ts`
- Create: `lib/r2/imagery-upload.ts`

**Step 1: Create R2 upload utility**

Create `lib/r2/imagery-upload.ts`:

```typescript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function generateUploadUrl(
  farmId: string,
  imageryId: string,
  filename: string
): Promise<{ uploadUrl: string; objectKey: string }> {
  const objectKey = `farms/${farmId}/imagery/${imageryId}/${filename}`;

  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: objectKey,
    ContentType: 'image/jpeg', // or detect from filename
  });

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

  return { uploadUrl, objectKey };
}

export function getPublicUrl(objectKey: string): string {
  return `https://pub-${process.env.R2_ACCOUNT_ID}.r2.dev/${objectKey}`;
}
```

**Step 2: Create upload URL route**

Create `app/api/farms/[id]/imagery/upload-url/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { generateUploadUrl } from '@/lib/r2/imagery-upload';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const farmId = params.id;
  const body = await request.json();

  if (!body.filename || !body.label) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 }
    );
  }

  // Verify farm ownership
  const farm = await db.execute({
    sql: 'SELECT user_id FROM farms WHERE id = ?',
    args: [farmId]
  });

  if (farm.rows.length === 0) {
    return NextResponse.json({ error: 'Farm not found' }, { status: 404 });
  }

  if (farm.rows[0].user_id !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Create imagery record
  const imageryId = crypto.randomUUID();

  // Generate signed upload URL
  const { uploadUrl, objectKey } = await generateUploadUrl(
    farmId,
    imageryId,
    body.filename
  );

  // Create database record
  await db.execute({
    sql: `INSERT INTO custom_imagery
          (id, farm_id, user_id, label, source_url, bounds, processing_status)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
      imageryId,
      farmId,
      session.user.id,
      body.label,
      objectKey,
      JSON.stringify(body.bounds || [[-180, -90], [180, 90]]), // Default bounds
      'pending'
    ]
  });

  return NextResponse.json({
    imageryId,
    uploadUrl,
    objectKey
  });
}
```

**Step 3: Install AWS SDK**

Run: `npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner`

**Step 4: Commit**

```bash
git add lib/r2/imagery-upload.ts app/api/farms/\[id\]/imagery/upload-url/route.ts package.json
git commit -m "feat(imagery): add R2 signed URL upload endpoint

- Generate presigned upload URLs
- Create imagery database records
- AWS SDK S3 client configuration

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 17: Image Processing & Tiling

**Files:**
- Create: `lib/imagery/tiler.ts`
- Create: `app/api/farms/[id]/imagery/[imageryId]/process/route.ts`
- Install: `npm install sharp`

**Step 1: Create image tiler utility**

Create `lib/imagery/tiler.ts`:

```typescript
import sharp from 'sharp';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const TILE_SIZE = 256;
const MAX_ZOOM = 21;
const MIN_ZOOM = 10;

/**
 * Process a large image into map tiles
 */
export async function generateTiles(
  sourceKey: string,
  farmId: string,
  imageryId: string
): Promise<string> {
  // Download source image from R2
  const getCommand = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: sourceKey,
  });

  const response = await s3Client.send(getCommand);
  const stream = response.Body as Readable;

  // Convert stream to buffer
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  const imageBuffer = Buffer.concat(chunks);

  // Get image metadata
  const metadata = await sharp(imageBuffer).metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error('Failed to read image dimensions');
  }

  // For MVP: create a single tile at zoom level 18
  // In production, implement full tiling pyramid
  const tileBuffer = await sharp(imageBuffer)
    .resize(TILE_SIZE, TILE_SIZE, { fit: 'cover' })
    .png()
    .toBuffer();

  // Upload tile to R2
  const tileKey = `farms/${farmId}/imagery/${imageryId}/tiles/18/0/0.png`;
  await s3Client.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: tileKey,
    Body: tileBuffer,
    ContentType: 'image/png',
  }));

  // Return tile URL template
  const tileUrlTemplate = `https://pub-${process.env.R2_ACCOUNT_ID}.r2.dev/farms/${farmId}/imagery/${imageryId}/tiles/{z}/{x}/{y}.png`;

  return tileUrlTemplate;
}
```

**Step 2: Create processing route**

Create `app/api/farms/[id]/imagery/[imageryId]/process/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { generateTiles } from '@/lib/imagery/tiler';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; imageryId: string } }
) {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: farmId, imageryId } = params;

  // Update status to processing
  await db.execute({
    sql: 'UPDATE custom_imagery SET processing_status = ? WHERE id = ?',
    args: ['processing', imageryId]
  });

  try {
    // Get source URL
    const imagery = await db.execute({
      sql: 'SELECT source_url FROM custom_imagery WHERE id = ?',
      args: [imageryId]
    });

    if (imagery.rows.length === 0) {
      throw new Error('Imagery not found');
    }

    const sourceUrl = imagery.rows[0].source_url as string;

    // Generate tiles
    const tileUrlTemplate = await generateTiles(sourceUrl, farmId, imageryId);

    // Update with tile URL and mark complete
    await db.execute({
      sql: 'UPDATE custom_imagery SET tile_url_template = ?, processing_status = ?, updated_at = unixepoch() WHERE id = ?',
      args: [tileUrlTemplate, 'completed', imageryId]
    });

    return NextResponse.json({
      success: true,
      tileUrlTemplate
    });
  } catch (error: any) {
    // Mark as failed
    await db.execute({
      sql: 'UPDATE custom_imagery SET processing_status = ?, error_message = ? WHERE id = ?',
      args: ['failed', error.message, imageryId]
    });

    return NextResponse.json(
      { error: 'Processing failed', message: error.message },
      { status: 500 }
    );
  }
}
```

**Step 3: Install Sharp**

Run: `npm install sharp`

**Step 4: Commit**

```bash
git add lib/imagery/tiler.ts app/api/farms/\[id\]/imagery/\[imageryId\]/process/route.ts package.json
git commit -m "feat(imagery): add image tiling and processing

- Sharp-based image resizing
- Generate map tiles (MVP: single tile)
- Upload tiles to R2
- Processing status updates

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 18: Imagery Alignment Tool UI

**Files:**
- Create: `components/imagery/imagery-alignment-tool.tsx`

**Step 1: Create alignment tool component**

Create `components/imagery/imagery-alignment-tool.tsx`:

```typescript
'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Move } from 'lucide-react';

interface ImageryAlignmentToolProps {
  farmId: string;
  imageryId: string;
  imageUrl: string;
  center: [number, number];
  onAlignmentComplete: (corners: [[number, number], [number, number], [number, number], [number, number]]) => void;
}

export function ImageryAlignmentTool({
  farmId,
  imageryId,
  imageUrl,
  center,
  onAlignmentComplete
}: ImageryAlignmentToolProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [corners, setCorners] = useState<[[number, number], [number, number], [number, number], [number, number]] | null>(null);
  const markers = useRef<maplibregl.Marker[]>([]);

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: center,
      zoom: 16,
    });

    // Add satellite layer
    map.current.on('load', () => {
      map.current!.addSource('satellite', {
        type: 'raster',
        tiles: [
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
        ],
        tileSize: 256
      });

      map.current!.addLayer({
        id: 'satellite-layer',
        type: 'raster',
        source: 'satellite',
        paint: {
          'raster-opacity': 0.7
        }
      });

      // Initialize 4 corner markers
      const initialCorners: [[number, number], [number, number], [number, number], [number, number]] = [
        [center[0] - 0.001, center[1] + 0.001], // NW
        [center[0] + 0.001, center[1] + 0.001], // NE
        [center[0] + 0.001, center[1] - 0.001], // SE
        [center[0] - 0.001, center[1] - 0.001]  // SW
      ];

      initialCorners.forEach((lngLat, index) => {
        const el = document.createElement('div');
        el.className = 'imagery-corner-marker';
        el.style.width = '20px';
        el.style.height = '20px';
        el.style.backgroundColor = '#ff0000';
        el.style.border = '2px solid #fff';
        el.style.borderRadius = '50%';
        el.style.cursor = 'move';
        el.textContent = `${index + 1}`;
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';
        el.style.fontSize = '12px';
        el.style.color = '#fff';
        el.style.fontWeight = 'bold';

        const marker = new maplibregl.Marker({ element: el, draggable: true })
          .setLngLat(lngLat)
          .addTo(map.current!);

        marker.on('dragend', () => {
          updateCorners();
        });

        markers.current.push(marker);
      });

      setCorners(initialCorners);
    });

    return () => map.current?.remove();
  }, []);

  function updateCorners() {
    const updatedCorners: [[number, number], [number, number], [number, number], [number, number]] = [
      markers.current[0].getLngLat().toArray() as [number, number],
      markers.current[1].getLngLat().toArray() as [number, number],
      markers.current[2].getLngLat().toArray() as [number, number],
      markers.current[3].getLngLat().toArray() as [number, number]
    ];
    setCorners(updatedCorners);
  }

  function handleSave() {
    if (corners) {
      onAlignmentComplete(corners);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Move className="h-5 w-5" />
          Align Custom Imagery
        </CardTitle>
        <CardDescription>
          Drag the 4 corner markers to align the imagery with the map
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          ref={mapContainer}
          className="w-full h-[400px] rounded-md border"
        />

        <div className="space-y-2">
          <Label>Corner Coordinates:</Label>
          {corners && (
            <div className="text-xs font-mono bg-muted p-2 rounded">
              <div>1 (NW): [{corners[0][0].toFixed(6)}, {corners[0][1].toFixed(6)}]</div>
              <div>2 (NE): [{corners[1][0].toFixed(6)}, {corners[1][1].toFixed(6)}]</div>
              <div>3 (SE): [{corners[2][0].toFixed(6)}, {corners[2][1].toFixed(6)}]</div>
              <div>4 (SW): [{corners[3][0].toFixed(6)}, {corners[3][1].toFixed(6)}]</div>
            </div>
          )}
        </div>

        <Button onClick={handleSave} disabled={!corners} className="w-full">
          Save Alignment
        </Button>
      </CardContent>
    </Card>
  );
}
```

**Step 2: Commit**

```bash
git add components/imagery/imagery-alignment-tool.tsx
git commit -m "feat(imagery): add imagery alignment tool component

- MapLibre with satellite base layer
- 4 draggable corner markers
- Real-time coordinate display
- Save alignment to imagery record

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 19: Imagery Layer Selector

**Files:**
- Create: `components/imagery/imagery-layer-selector.tsx`

**Step 1: Create imagery layer selector**

Create `components/imagery/imagery-layer-selector.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Image as ImageIcon, Eye, EyeOff } from 'lucide-react';

interface ImageryLayer {
  id: string;
  label: string;
  visible: boolean;
  opacity: number;
}

interface ImageryLayerSelectorProps {
  farmId: string;
  onLayerToggle: (imageryId: string, visible: boolean) => void;
}

export function ImageryLayerSelector({ farmId, onLayerToggle }: ImageryLayerSelectorProps) {
  const [layers, setLayers] = useState<ImageryLayer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadImageryLayers();
  }, [farmId]);

  async function loadImageryLayers() {
    try {
      const response = await fetch(`/api/farms/${farmId}/imagery`);
      const data = await response.json();

      const imageryLayers: ImageryLayer[] = data.imagery.map((img: any) => ({
        id: img.id,
        label: img.label,
        visible: Boolean(img.visible),
        opacity: img.opacity || 1.0
      }));

      setLayers(imageryLayers);
    } catch (error) {
      console.error('Failed to load imagery layers:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle(imageryId: string, visible: boolean) {
    try {
      // Update locally
      setLayers(prev =>
        prev.map(layer =>
          layer.id === imageryId ? { ...layer, visible } : layer
        )
      );

      // Update in database
      await fetch(`/api/farms/${farmId}/imagery/${imageryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visible: visible ? 1 : 0 })
      });

      // Notify parent
      onLayerToggle(imageryId, visible);
    } catch (error) {
      console.error('Failed to toggle layer:', error);
    }
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading imagery layers...</div>;
  }

  if (layers.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground text-center">
            No custom imagery layers yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          Custom Imagery Layers
        </CardTitle>
        <CardDescription>
          Toggle visibility of uploaded imagery
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {layers.map(layer => (
          <div key={layer.id} className="flex items-center justify-between border-b pb-2">
            <div className="flex items-center gap-2">
              {layer.visible ? (
                <Eye className="h-4 w-4 text-green-600" />
              ) : (
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              )}
              <Label htmlFor={`layer-${layer.id}`} className="cursor-pointer">
                {layer.label}
              </Label>
            </div>
            <Switch
              id={`layer-${layer.id}`}
              checked={layer.visible}
              onCheckedChange={(checked) => handleToggle(layer.id, checked)}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
```

**Step 2: Commit**

```bash
git add components/imagery/imagery-layer-selector.tsx
git commit -m "feat(imagery): add imagery layer selector component

- List all custom imagery layers
- Toggle visibility with switch
- Eye icon indicators
- Update database and notify map

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 20: Imagery Opacity Slider

**Files:**
- Create: `components/imagery/imagery-opacity-slider.tsx`

**Step 1: Create opacity slider component**

Create `components/imagery/imagery-opacity-slider.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';

interface ImageryOpacitySliderProps {
  farmId: string;
  imageryId: string;
  initialOpacity: number;
  onOpacityChange: (imageryId: string, opacity: number) => void;
}

export function ImageryOpacitySlider({
  farmId,
  imageryId,
  initialOpacity,
  onOpacityChange
}: ImageryOpacitySliderProps) {
  const [opacity, setOpacity] = useState(initialOpacity);

  async function handleOpacityChange(value: number[]) {
    const newOpacity = value[0];
    setOpacity(newOpacity);

    // Update database (debounced in production)
    try {
      await fetch(`/api/farms/${farmId}/imagery/${imageryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opacity: newOpacity })
      });

      // Notify parent for immediate map update
      onOpacityChange(imageryId, newOpacity);
    } catch (error) {
      console.error('Failed to update opacity:', error);
    }
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={`opacity-${imageryId}`}>
        Opacity: {Math.round(opacity * 100)}%
      </Label>
      <Slider
        id={`opacity-${imageryId}`}
        min={0}
        max={1}
        step={0.05}
        value={[opacity]}
        onValueChange={handleOpacityChange}
      />
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add components/imagery/imagery-opacity-slider.tsx
git commit -m "feat(imagery): add imagery opacity slider component

- 0-100% opacity control
- Real-time map updates
- Database persistence
- Percentage display

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 21: MapLibre Imagery Source Integration

**Files:**
- Modify: `components/map/farm-map.tsx`

**Step 1: Add custom imagery source and layer**

Add imagery loading to `components/map/farm-map.tsx`:

```typescript
// Add state for custom imagery
const [customImagery, setCustomImagery] = useState<any[]>([]);

// Load custom imagery on mount
useEffect(() => {
  if (map.current) {
    loadCustomImagery();
  }
}, [farm.id]);

async function loadCustomImagery() {
  try {
    const response = await fetch(`/api/farms/${farm.id}/imagery`);
    const data = await response.json();

    const completedImagery = data.imagery.filter(
      (img: any) => img.processing_status === 'completed' && img.tile_url_template
    );

    setCustomImagery(completedImagery);

    // Add imagery layers to map
    completedImagery.forEach((imagery: any) => {
      addImageryLayer(imagery);
    });
  } catch (error) {
    console.error('Failed to load custom imagery:', error);
  }
}

function addImageryLayer(imagery: any) {
  if (!map.current) return;

  const sourceId = `imagery-source-${imagery.id}`;
  const layerId = `imagery-layer-${imagery.id}`;

  // Parse bounds
  const bounds = JSON.parse(imagery.bounds);

  // Add raster source
  map.current.addSource(sourceId, {
    type: 'raster',
    tiles: [imagery.tile_url_template],
    tileSize: 256,
    bounds: [bounds[0][0], bounds[0][1], bounds[1][0], bounds[1][1]]
  });

  // Add raster layer
  map.current.addLayer(
    {
      id: layerId,
      type: 'raster',
      source: sourceId,
      paint: {
        'raster-opacity': imagery.opacity,
        'raster-fade-duration': 0
      },
      layout: {
        visibility: imagery.visible ? 'visible' : 'none'
      }
    },
    'satellite-layer' // Insert below satellite for proper layering
  );
}

function toggleImageryLayer(imageryId: string, visible: boolean) {
  if (!map.current) return;

  const layerId = `imagery-layer-${imageryId}`;
  map.current.setLayoutProperty(
    layerId,
    'visibility',
    visible ? 'visible' : 'none'
  );
}

function updateImageryOpacity(imageryId: string, opacity: number) {
  if (!map.current) return;

  const layerId = `imagery-layer-${imageryId}`;
  map.current.setPaintProperty(layerId, 'raster-opacity', opacity);
}
```

**Step 2: Commit**

```bash
git add components/map/farm-map.tsx
git commit -m "feat(imagery): integrate custom imagery with MapLibre

- Load imagery layers from API
- Add raster sources and layers
- Toggle visibility and opacity
- Layer ordering (below satellite)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 22: Imagery Processing Status Indicator

**Files:**
- Create: `components/imagery/imagery-processing-status.tsx`

**Step 1: Create processing status component**

Create `components/imagery/imagery-processing-status.tsx`:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, CheckCircle, XCircle, Clock } from 'lucide-react';

interface ImageryProcessingStatusProps {
  farmId: string;
  imageryId: string;
}

export function ImageryProcessingStatus({ farmId, imageryId }: ImageryProcessingStatusProps) {
  const [status, setStatus] = useState<'pending' | 'processing' | 'completed' | 'failed'>('pending');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      checkStatus();
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(interval);
  }, [imageryId]);

  async function checkStatus() {
    try {
      const response = await fetch(`/api/farms/${farmId}/imagery/${imageryId}`);
      const data = await response.json();

      setStatus(data.processing_status);
      setErrorMessage(data.error_message);

      // Stop polling if completed or failed
      if (data.processing_status === 'completed' || data.processing_status === 'failed') {
        return;
      }
    } catch (error) {
      console.error('Failed to check status:', error);
    }
  }

  function getStatusIcon() {
    switch (status) {
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'processing':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
    }
  }

  function getStatusBadge() {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      pending: 'secondary',
      processing: 'default',
      completed: 'default',
      failed: 'destructive'
    };

    return (
      <Badge variant={variants[status]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getStatusIcon()}
          Processing Status
        </CardTitle>
        <CardDescription>
          Imagery is being processed and tiled
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {getStatusBadge()}

        {status === 'processing' && (
          <div>
            <Progress value={50} className="w-full" />
            <p className="text-xs text-muted-foreground mt-2">
              Generating map tiles...
            </p>
          </div>
        )}

        {status === 'completed' && (
          <div className="bg-green-50 dark:bg-green-950 p-3 rounded text-sm">
            ✓ Imagery successfully processed and ready to display
          </div>
        )}

        {status === 'failed' && (
          <div className="bg-red-50 dark:bg-red-950 p-3 rounded text-sm">
            <div className="font-medium text-red-600">Processing failed</div>
            {errorMessage && (
              <div className="text-xs mt-1 text-muted-foreground">{errorMessage}</div>
            )}
          </div>
        )}

        {status === 'pending' && (
          <div className="bg-yellow-50 dark:bg-yellow-950 p-3 rounded text-sm">
            Waiting to start processing...
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

**Step 2: Commit**

```bash
git add components/imagery/imagery-processing-status.tsx
git commit -m "feat(imagery): add processing status indicator

- Real-time status polling
- Status icons and badges
- Progress bar for processing
- Error message display

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Integration & Testing

### Task 23: Integrate Line Layers with Track 1 Layer Filtering

**Files:**
- Modify: `components/map/farm-map.tsx`
- Modify: `components/immersive-map/design-layer-panel.tsx` (if it exists from Track 1)

**Step 1: Add line layer filtering**

Update layer filtering logic to include lines:

```typescript
// In farm-map.tsx, update layer filtering function
function applyLayerFilters(selectedLayerIds: string[]) {
  if (!map.current) return;

  // Filter zones (existing)
  const zoneFilter = selectedLayerIds.length > 0
    ? ['in', ['get', 'layer_id'], ['literal', selectedLayerIds]]
    : true;

  if (map.current.getLayer('zones-layer')) {
    map.current.setFilter('zones-layer', zoneFilter);
  }

  // Filter lines (new)
  const lineFeatures = customLines.filter((line: any) => {
    if (!line.layer_ids || line.layer_ids.length === 0) return true;
    return line.layer_ids.some((id: string) => selectedLayerIds.includes(id));
  });

  const lineSource = map.current.getSource('lines-source') as maplibregl.GeoJSONSource;
  if (lineSource) {
    lineSource.setData({
      type: 'FeatureCollection',
      features: lineFeatures.map(lineToGeoJSON)
    });
  }

  // Filter plantings (existing)
  // ...
}
```

**Step 2: Commit**

```bash
git add components/map/farm-map.tsx
git commit -m "feat(lines): integrate line layer filtering with Track 1

- Apply design layer filters to lines
- Filter by layer_ids array
- Maintain zone and planting filtering

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 24: Water Flow Arrows Animation

**Files:**
- Create: `lib/map/water-flow-animation.ts`
- Modify: `components/map/farm-map.tsx`

**Step 1: Create flow animation utility**

Create `lib/map/water-flow-animation.ts`:

```typescript
import maplibregl from 'maplibre-gl';

/**
 * Animate arrow symbols along flow paths
 */
export function animateFlowArrows(map: maplibregl.Map, layerId: string) {
  let offset = 0;

  function animate() {
    offset = (offset + 1) % 200; // Cycle every 200px

    if (map.getLayer(layerId)) {
      map.setLayoutProperty(layerId, 'icon-offset', [0, -offset]);
    }

    requestAnimationFrame(animate);
  }

  animate();
}
```

**Step 2: Apply animation to flow arrows**

Add animation in `components/map/farm-map.tsx`:

```typescript
import { animateFlowArrows } from '@/lib/map/water-flow-animation';

// After adding line-arrows layer
useEffect(() => {
  if (map.current && map.current.getLayer('line-arrows')) {
    animateFlowArrows(map.current, 'line-arrows');
  }
}, [customLines]);
```

**Step 3: Commit**

```bash
git add lib/map/water-flow-animation.ts components/map/farm-map.tsx
git commit -m "feat(water): add animated flow arrows

- Continuous arrow animation along flow paths
- Offset-based animation loop
- Visual flow direction indicator

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 25: Manual Testing Checklist

**Files:**
- Create: `docs/testing/track2-testing-checklist.md`

**Step 1: Create testing checklist**

Create `docs/testing/track2-testing-checklist.md`:

```markdown
# Track 2: Drawing & Water System - Testing Checklist

## Part 1: Line/Polyline Drawing

### Line Drawing
- [ ] Click "Draw Line" button activates line drawing mode
- [ ] Click points on map to draw line
- [ ] Double-click or press Enter to finish line
- [ ] Line form appears after drawing
- [ ] Can select line type (swale, flow_path, fence, hedge, contour, custom)
- [ ] Changing line type auto-applies default style
- [ ] Can customize color, width, dash pattern, arrows, opacity
- [ ] Can add optional label
- [ ] "Create Line" saves to database
- [ ] Line appears on map immediately after creation

### Line Rendering
- [ ] Saved lines load correctly on page refresh
- [ ] Line colors display correctly
- [ ] Line widths render accurately
- [ ] Dash patterns (solid, dashed, dotted) work
- [ ] Arrows display on flow_path lines
- [ ] Arrow direction (forward, reverse, both) works
- [ ] Line opacity applies correctly
- [ ] Lines layer below zones for proper stacking

### Line Editing (if implemented)
- [ ] Can click line to select
- [ ] Can edit line properties (color, width, etc.)
- [ ] Can delete line
- [ ] Changes save to database

## Part 2: Water Design Toolkit

### Catchment Calculator
- [ ] Opens when zone is selected
- [ ] Can input annual rainfall (inches)
- [ ] "Calculate Catchment" button works
- [ ] Displays area in square feet and acres
- [ ] Displays estimated annual capture in gallons
- [ ] Shows daily average
- [ ] Saves catchment properties to zone
- [ ] Can link to destination feature (swale, pond)

### Swale Designer
- [ ] Opens for swale-type zones or lines
- [ ] Can input width (feet)
- [ ] Can input depth (feet)
- [ ] Cross-section diagram displays
- [ ] "Calculate Volume" button works
- [ ] Displays length in feet and meters
- [ ] Displays capacity in gallons
- [ ] Displays volume in cubic feet and liters
- [ ] Saves swale properties to zone

### Water Connections
- [ ] Water connection picker loads all zones and lines
- [ ] Can select source feature
- [ ] Can select destination feature
- [ ] Connections save to water_properties
- [ ] Flow paths render with arrows pointing to destination

### Water System Panel
- [ ] Summary tab shows total capture gallons
- [ ] Summary tab shows total swale capacity
- [ ] Feature counts display correctly
- [ ] Catchments tab lists all catchment zones
- [ ] Catchments show annual capture and rainfall
- [ ] Swales tab lists all swale zones
- [ ] Swales show capacity, length, and dimensions
- [ ] Can navigate between tabs

## Part 3: Custom Imagery Upload

### Upload Flow
- [ ] Upload button opens file picker
- [ ] Can select image file (PNG, JPEG, TIFF)
- [ ] Can enter label for imagery
- [ ] Upload initiates with progress indicator
- [ ] Signed URL generated successfully
- [ ] File uploads to R2 bucket
- [ ] Imagery record created in database

### Processing
- [ ] Processing status shows "Pending" initially
- [ ] Status changes to "Processing" when started
- [ ] Progress bar displays during processing
- [ ] Status changes to "Completed" when done
- [ ] Tiles generated successfully
- [ ] Tile URL template saved to database
- [ ] Failed uploads show "Failed" status with error message

### Alignment Tool
- [ ] Alignment tool opens after upload
- [ ] Map displays with satellite base layer
- [ ] 4 corner markers appear
- [ ] Markers are draggable
- [ ] Corner coordinates update in real-time
- [ ] "Save Alignment" button saves corners to database
- [ ] Alignment corners persist on page refresh

### Imagery Display
- [ ] Custom imagery layer selector lists all uploaded imagery
- [ ] Toggle switch shows/hides imagery on map
- [ ] Eye icon indicates visibility status
- [ ] Opacity slider controls imagery transparency (0-100%)
- [ ] Opacity changes reflect on map immediately
- [ ] Multiple imagery layers can be visible simultaneously
- [ ] Imagery layers render within bounds
- [ ] Imagery aligns correctly with satellite layer

### Imagery Layer Management
- [ ] Can reorder imagery layers (if implemented)
- [ ] Can delete imagery layer
- [ ] Deletion removes from database and R2
- [ ] Imagery persists across page refreshes

## Integration Tests

### Track 1 Integration
- [ ] Lines respect design layer filtering
- [ ] Lines assigned to layers filter correctly
- [ ] Can toggle line layers on/off
- [ ] Line layer toggle works with zone/planting toggles

### Water Flow Animation
- [ ] Flow path arrows animate continuously
- [ ] Animation direction matches arrow direction
- [ ] Animation smooth and performant
- [ ] Animation pauses when layer hidden (optional)

## Performance Tests
- [ ] Drawing 10+ lines performs smoothly
- [ ] Uploading large image (10MB+) succeeds
- [ ] Processing large image completes without timeout
- [ ] Map renders 5+ imagery layers without lag
- [ ] Water system panel loads quickly with 20+ features

## Error Handling
- [ ] Invalid rainfall input shows error
- [ ] Invalid swale dimensions show error
- [ ] Upload without label shows error
- [ ] Upload failure shows clear error message
- [ ] Processing failure displays error details
- [ ] Missing source/destination gracefully handled

## Browser Compatibility
- [ ] All features work in Chrome
- [ ] All features work in Firefox
- [ ] All features work in Safari
- [ ] All features work in Edge
- [ ] Mobile browser support (if applicable)

---

**Tester Notes:**

**Environment:**
- URL: http://localhost:3000/farm/[id]
- Test Farm ID: _______________
- Browser: _______________
- Date: _______________

**Issues Found:**
(Record any bugs, unexpected behavior, or UX issues here)
```

**Step 2: Commit**

```bash
git add docs/testing/track2-testing-checklist.md
git commit -m "docs(testing): add Track 2 manual testing checklist

- Line drawing tests
- Water toolkit tests
- Custom imagery upload tests
- Integration and performance tests

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Plan Complete

This completes the Track 2: Drawing & Water System implementation plan with 25 detailed, bite-sized tasks covering:

**Part 1: Line/Polyline Drawing (Tasks 1-7)**
- Database schema
- Line type configurations
- API routes
- MapboxDraw integration
- Rendering with arrows
- Style picker
- Line forms

**Part 2: Water Design Toolkit (Tasks 8-14)**
- Water properties schema
- Calculation utilities (catchment, swale)
- API endpoints
- Catchment calculator UI
- Swale designer UI
- Water connection picker
- Water system panel

**Part 3: Custom Imagery Upload (Tasks 15-22)**
- Imagery database schema
- R2 signed URL upload
- Image processing and tiling
- Alignment tool UI
- Layer selector
- Opacity slider
- MapLibre integration
- Processing status indicator

**Integration & Testing (Tasks 23-25)**
- Layer filtering integration
- Flow arrow animation
- Manual testing checklist

Total: 25 tasks, each following TDD pattern (test → implementation → commit)