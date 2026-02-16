# Drone Imagery Overlay System
**Status:** Deferred
**Priority:** Medium
**Complexity:** Medium
**Estimated Effort:** 3-5 days

## Overview
Allow users to upload custom drone imagery and overlay it on the map for precise site-specific design work.

## Business Value
- **Professional Use Case**: Essential for consultants working on real client sites
- **Accuracy**: Enables precise measurements and planning based on actual site conditions
- **User Retention**: High-value feature that increases platform stickiness
- **Competitive Advantage**: Few competitors offer georeferenced custom imagery upload

## Technical Architecture

### Database Schema

```sql
-- Migration: migrations/031_custom_imagery.sql
CREATE TABLE IF NOT EXISTS custom_imagery (
  id TEXT PRIMARY KEY,
  farm_id TEXT NOT NULL,
  user_id TEXT NOT NULL,

  -- File storage
  file_url TEXT NOT NULL,              -- R2 storage path
  original_filename TEXT NOT NULL,
  file_size_bytes INTEGER NOT NULL,
  mime_type TEXT NOT NULL,

  -- Georeferencing
  bounds_geojson TEXT NOT NULL,        -- GeoJSON Polygon of image bounds
  center_lat REAL NOT NULL,
  center_lng REAL NOT NULL,
  rotation_degrees REAL DEFAULT 0,     -- Rotation from north

  -- Display properties
  display_name TEXT NOT NULL,
  opacity REAL DEFAULT 1.0,            -- 0.0 to 1.0
  blend_mode TEXT DEFAULT 'normal',    -- 'normal', 'multiply', 'overlay'
  is_visible INTEGER DEFAULT 1,
  z_index INTEGER DEFAULT 0,           -- Layer ordering

  -- Metadata
  capture_date INTEGER,                -- Unix timestamp
  resolution_meters_per_pixel REAL,   -- Ground sampling distance
  processing_status TEXT DEFAULT 'completed', -- 'uploading', 'processing', 'completed', 'failed'
  processing_error TEXT,

  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),

  FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_custom_imagery_farm ON custom_imagery(farm_id);
CREATE INDEX idx_custom_imagery_user ON custom_imagery(user_id);
CREATE INDEX idx_custom_imagery_visible ON custom_imagery(farm_id, is_visible);
```

### TypeScript Types

```typescript
// lib/db/schema.ts
export interface CustomImagery {
  id: string;
  farm_id: string;
  user_id: string;

  // File storage
  file_url: string;
  original_filename: string;
  file_size_bytes: number;
  mime_type: string;

  // Georeferencing
  bounds_geojson: string; // GeoJSON Polygon
  center_lat: number;
  center_lng: number;
  rotation_degrees: number;

  // Display properties
  display_name: string;
  opacity: number;
  blend_mode: 'normal' | 'multiply' | 'overlay';
  is_visible: 0 | 1;
  z_index: number;

  // Metadata
  capture_date?: number;
  resolution_meters_per_pixel?: number;
  processing_status: 'uploading' | 'processing' | 'completed' | 'failed';
  processing_error?: string;

  created_at: number;
  updated_at: number;
}
```

### API Routes

```typescript
// app/api/farms/[id]/custom-imagery/route.ts

import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { uploadToR2 } from '@/lib/storage/r2';
import { extractGeoReference } from '@/lib/imagery/georeference';

// POST - Upload custom imagery
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return new Response('Unauthorized', { status: 401 });

  const formData = await request.formData();
  const file = formData.get('file') as File;
  const displayName = formData.get('display_name') as string;

  // Option 1: User provides bounds manually
  const bounds = formData.get('bounds'); // GeoJSON Polygon

  // Option 2: Extract from GeoTIFF metadata
  let geoReference;
  if (file.type === 'image/tiff' || file.name.endsWith('.tif')) {
    geoReference = await extractGeoReference(file);
  }

  // Upload to R2
  const fileUrl = await uploadToR2({
    file,
    bucket: 'custom-imagery',
    path: `${params.id}/${crypto.randomUUID()}-${file.name}`
  });

  // Save to database
  const imagery = {
    id: crypto.randomUUID(),
    farm_id: params.id,
    user_id: session.user.id,
    file_url: fileUrl,
    original_filename: file.name,
    file_size_bytes: file.size,
    mime_type: file.type,
    bounds_geojson: bounds || geoReference.bounds,
    center_lat: geoReference.center[1],
    center_lng: geoReference.center[0],
    rotation_degrees: geoReference.rotation || 0,
    display_name: displayName,
    opacity: 1.0,
    is_visible: 1,
    z_index: 0
  };

  await db.execute({
    sql: `INSERT INTO custom_imagery VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [/* ... */]
  });

  return Response.json(imagery);
}

// GET - List all custom imagery for farm
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const result = await db.execute({
    sql: 'SELECT * FROM custom_imagery WHERE farm_id = ? ORDER BY z_index ASC',
    args: [params.id]
  });

  return Response.json(result.rows);
}
```

### UI Components

```typescript
// components/map/custom-imagery-uploader.tsx

'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CustomImageryUploaderProps {
  farmId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadComplete: (imagery: CustomImagery) => void;
}

export function CustomImageryUploader({
  farmId,
  open,
  onOpenChange,
  onUploadComplete
}: CustomImageryUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [georeferencing, setGeoreferencing] = useState<'auto' | 'manual'>('auto');
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('display_name', displayName || file.name);

      const response = await fetch(`/api/farms/${farmId}/custom-imagery`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Upload failed');

      const imagery = await response.json();
      onUploadComplete(imagery);

      toast({
        title: 'Imagery uploaded',
        description: 'Your custom imagery has been added to the map.'
      });

      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Upload failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Custom Imagery</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* File input */}
          <div>
            <Label>Image File</Label>
            <Input
              type="file"
              accept=".tif,.tiff,.jpg,.jpeg,.png"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Supported formats: GeoTIFF, JPEG, PNG
            </p>
          </div>

          {/* Display name */}
          <div>
            <Label>Display Name</Label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={file?.name || 'e.g., Drone Survey 2024'}
            />
          </div>

          {/* Georeferencing method */}
          <div>
            <Label>Georeferencing</Label>
            <div className="flex gap-2 mt-2">
              <Button
                variant={georeferencing === 'auto' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setGeoreferencing('auto')}
              >
                Auto-detect
              </Button>
              <Button
                variant={georeferencing === 'manual' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setGeoreferencing('manual')}
              >
                <MapPin className="w-4 h-4 mr-1" />
                Manual Placement
              </Button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={!file || uploading}>
              {uploading ? 'Uploading...' : 'Upload'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### MapLibre Integration

```typescript
// lib/map/imagery-layer-manager.ts

import maplibregl from 'maplibre-gl';
import type { CustomImagery } from '@/lib/db/schema';

export class ImageryLayerManager {
  private map: maplibregl.Map;
  private layers: Map<string, CustomImagery> = new Map();

  constructor(map: maplibregl.Map) {
    this.map = map;
  }

  addImagery(imagery: CustomImagery) {
    const sourceId = `custom-imagery-${imagery.id}`;
    const layerId = `custom-imagery-layer-${imagery.id}`;

    // Parse bounds
    const bounds = JSON.parse(imagery.bounds_geojson);
    const coordinates = bounds.coordinates[0]; // Polygon outer ring

    // Add raster source
    this.map.addSource(sourceId, {
      type: 'image',
      url: imagery.file_url,
      coordinates: [
        [coordinates[0][0], coordinates[0][1]], // top-left
        [coordinates[1][0], coordinates[1][1]], // top-right
        [coordinates[2][0], coordinates[2][1]], // bottom-right
        [coordinates[3][0], coordinates[3][1]]  // bottom-left
      ]
    });

    // Add raster layer
    this.map.addLayer({
      id: layerId,
      type: 'raster',
      source: sourceId,
      paint: {
        'raster-opacity': imagery.opacity,
        'raster-fade-duration': 0
      },
      layout: {
        visibility: imagery.is_visible ? 'visible' : 'none'
      }
    }, 'zones-fill'); // Insert below zones layer

    this.layers.set(imagery.id, imagery);
  }

  updateOpacity(imageryId: string, opacity: number) {
    const layerId = `custom-imagery-layer-${imageryId}`;
    this.map.setPaintProperty(layerId, 'raster-opacity', opacity);
  }

  toggleVisibility(imageryId: string) {
    const layerId = `custom-imagery-layer-${imageryId}`;
    const visibility = this.map.getLayoutProperty(layerId, 'visibility');
    this.map.setLayoutProperty(
      layerId,
      'visibility',
      visibility === 'visible' ? 'none' : 'visible'
    );
  }

  removeImagery(imageryId: string) {
    const layerId = `custom-imagery-layer-${imageryId}`;
    const sourceId = `custom-imagery-${imageryId}`;

    if (this.map.getLayer(layerId)) {
      this.map.removeLayer(layerId);
    }
    if (this.map.getSource(sourceId)) {
      this.map.removeSource(sourceId);
    }

    this.layers.delete(imageryId);
  }
}
```

## Implementation Phases

### Phase 1: Basic Upload (2 days)
- ✅ Database schema and migration
- ✅ File upload to R2
- ✅ Manual georeferencing (user clicks 4 corners)
- ✅ Basic MapLibre raster layer display
- ✅ Upload dialog UI

### Phase 2: Enhanced Features (2 days)
- GeoTIFF metadata extraction (GDAL.js or geotiff.js)
- Automatic bounds detection from GeoTIFF
- Opacity and blend mode controls
- Layer ordering (z-index management)
- Delete imagery

### Phase 3: Advanced Features (1 day)
- Image rotation controls
- Alignment tools (drag corners to adjust)
- Multiple imagery layers with toggle
- Imagery metadata (capture date, resolution)
- Thumbnail generation for layer list

## Dependencies

### NPM Packages
```bash
npm install geotiff        # GeoTIFF parsing
npm install @aws-sdk/client-s3  # R2 upload (already installed)
```

### External Services
- **R2 Storage**: Requires separate bucket for custom imagery
- **Processing**: Consider serverless function for large file processing

## User Experience Flow

1. User clicks "Add Custom Imagery" in Map Control Panel
2. Dialog opens with file upload
3. User selects GeoTIFF or regular image file
4. **If GeoTIFF**: Auto-extract bounds and display preview
5. **If regular image**: Show map with 4 corner markers, user clicks to position
6. User confirms placement
7. File uploads to R2 (with progress indicator)
8. Imagery layer appears on map
9. User can adjust opacity, toggle visibility, or delete

## Testing Strategy

### Unit Tests
- GeoTIFF bounds extraction
- Coordinate transformation
- R2 upload with mocked S3 client

### Integration Tests
- Full upload flow (file → R2 → database)
- MapLibre layer rendering
- Opacity/visibility controls

### Manual Testing Checklist
- [ ] Upload GeoTIFF with embedded georeference
- [ ] Upload regular JPEG with manual placement
- [ ] Adjust opacity (0%, 50%, 100%)
- [ ] Toggle visibility on/off
- [ ] Delete imagery
- [ ] Multiple imagery layers don't conflict
- [ ] Imagery persists after page reload
- [ ] Mobile: Upload works on touch devices

## Security Considerations

- **File Size Limits**: Max 50MB per image (prevent abuse)
- **File Type Validation**: Server-side MIME type checking
- **Farm Ownership**: Verify user owns farm before upload
- **R2 Bucket Isolation**: Per-farm folders with ACLs
- **Malicious Files**: Scan for embedded scripts in TIFF metadata

## Cost Analysis

### Storage Costs (R2)
- Average drone imagery: 10-20MB per image
- 100 active farms × 5 images = 5-10GB
- R2 cost: ~$0.15/month for storage
- Egress: Free to Cloudflare Workers

### Processing Costs
- GeoTIFF parsing: Client-side (free)
- Thumbnail generation: Edge function (<1ms)
- Total: Negligible

## Future Enhancements

- **3D Imagery**: Support for ortho-rectified DEMs (elevation models)
- **Time Series**: Multiple imagery captures over time (before/after)
- **Annotation Tools**: Draw on top of imagery (measurements, labels)
- **AI Analysis**: Extract features from drone imagery (trees, structures)
- **Collaborative Placement**: Share placement controls with team
- **Export**: Download georeferenced imagery with design overlays

## References

- [MapLibre Raster Images](https://maplibre.org/maplibre-gl-js/docs/examples/image-on-a-map/)
- [GeoTIFF.js](https://github.com/geotiffjs/geotiff.js)
- [GDAL.js](https://github.com/bugra9/gdal3.js)
- [Cloudflare R2 Docs](https://developers.cloudflare.com/r2/)
