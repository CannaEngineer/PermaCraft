# Farm Public Visitor View Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a simplified public profile view for farm visitors while preserving the full dashboard for farm owners.

**Architecture:** Split the farm page into two distinct views based on `isOwner` flag. Owners see the full FarmEditorClient (current behavior). Visitors see a new FarmPublicView component with read-only map showing only farm outline and the social feed.

**Tech Stack:** Next.js 14 Server Components, MapLibre GL JS (read-only mode), existing FarmFeedClient, shadcn/ui

---

## User Experience Comparison

### Visitor View (New):
- Farm name and description header
- Read-only map showing only farm boundary outline
- No drawing tools, no zone details
- No AI chat panel
- Social feed showing shared posts
- Can react, comment, and share posts

### Owner View (Current):
- Full farm editor with all controls
- Interactive map with drawing tools
- All zones and details visible
- AI chat panel for farm analysis
- Farm settings and delete buttons
- Social feed below map

---

## Task 1: Create Read-Only Map Component

**Files:**
- Create: `components/map/farm-map-readonly.tsx`

**Step 1: Create read-only map component**

This component shows only the farm boundary without any editing tools or zone details.

Create `components/map/farm-map-readonly.tsx`:

```typescript
'use client';

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Farm } from '@/lib/db/schema';

interface FarmMapReadonlyProps {
  farm: Farm;
}

export function FarmMapReadonly({ farm }: FarmMapReadonlyProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    // Initialize map centered on farm
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: [farm.center_lng, farm.center_lat],
      zoom: 16,
      attributionControl: false,
    });

    // Add attribution control
    map.current.addControl(
      new maplibregl.AttributionControl({
        compact: true,
      }),
      'bottom-right'
    );

    // Add navigation controls (zoom in/out)
    map.current.addControl(
      new maplibregl.NavigationControl({
        showCompass: false,
      }),
      'top-right'
    );

    // Calculate farm bounds from acres
    // Approximate: 1 acre ≈ 4047 m² ≈ 63.6m × 63.6m square
    const metersPerSide = Math.sqrt(farm.acres * 4047);
    const latOffset = metersPerSide / 111320; // 1 degree latitude ≈ 111.32 km
    const lngOffset = metersPerSide / (111320 * Math.cos(farm.center_lat * Math.PI / 180));

    // Create simple rectangular boundary
    const boundary: [number, number][] = [
      [farm.center_lng - lngOffset / 2, farm.center_lat - latOffset / 2],
      [farm.center_lng + lngOffset / 2, farm.center_lat - latOffset / 2],
      [farm.center_lng + lngOffset / 2, farm.center_lat + latOffset / 2],
      [farm.center_lng - lngOffset / 2, farm.center_lat + latOffset / 2],
      [farm.center_lng - lngOffset / 2, farm.center_lat - latOffset / 2], // Close the loop
    ];

    // Wait for map to load
    map.current.on('load', () => {
      if (!map.current) return;

      // Add farm boundary outline
      map.current.addSource('farm-boundary', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Polygon',
            coordinates: [boundary],
          },
        },
      });

      // Add fill layer (semi-transparent)
      map.current.addLayer({
        id: 'farm-boundary-fill',
        type: 'fill',
        source: 'farm-boundary',
        paint: {
          'fill-color': '#22c55e',
          'fill-opacity': 0.1,
        },
      });

      // Add outline layer
      map.current.addLayer({
        id: 'farm-boundary-outline',
        type: 'line',
        source: 'farm-boundary',
        paint: {
          'line-color': '#22c55e',
          'line-width': 3,
        },
      });

      // Fit map to boundary
      const coordinates = boundary;
      const bounds = coordinates.reduce(
        (bounds, coord) => bounds.extend(coord as [number, number]),
        new maplibregl.LngLatBounds(coordinates[0], coordinates[0])
      );

      map.current.fitBounds(bounds, {
        padding: 50,
        maxZoom: 16,
      });
    });

    return () => {
      map.current?.remove();
    };
  }, [farm]);

  return (
    <div className="relative h-[400px] w-full rounded-lg overflow-hidden border">
      <div ref={mapContainer} className="w-full h-full" />

      {/* Map info overlay */}
      <div className="absolute top-4 left-4 bg-background/90 backdrop-blur rounded-lg px-3 py-2 text-sm shadow-lg">
        <p className="font-semibold">{farm.acres} acres</p>
        {farm.climate_zone && (
          <p className="text-xs text-muted-foreground">Zone {farm.climate_zone}</p>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add components/map/farm-map-readonly.tsx
git commit -m "feat: add read-only map component for farm visitors"
```

---

## Task 2: Create Farm Public View Component

**Files:**
- Create: `components/farm/farm-public-view.tsx`

**Step 1: Create public view component**

This component shows the visitor-facing view of a public farm.

Create `components/farm/farm-public-view.tsx`:

```typescript
'use client';

import { FarmMapReadonly } from '@/components/map/farm-map-readonly';
import { FarmFeedClient } from '@/components/feed/farm-feed-client';
import type { Farm } from '@/lib/db/schema';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface FarmPublicViewProps {
  farm: Farm;
  farmOwner: {
    name: string;
    image: string | null;
  };
  initialFeedData: {
    posts: any[];
    next_cursor: string | null;
    has_more: boolean;
  };
}

export function FarmPublicView({
  farm,
  farmOwner,
  initialFeedData,
}: FarmPublicViewProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Farm Header */}
      <div className="bg-card border-b border-border">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-start gap-4">
            {/* Farm owner avatar */}
            <Avatar className="h-16 w-16">
              <AvatarImage src={farmOwner.image || undefined} />
              <AvatarFallback className="text-lg">
                {farmOwner.name[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>

            {/* Farm info */}
            <div className="flex-1">
              <h1 className="text-3xl font-serif font-bold">{farm.name}</h1>
              <p className="text-muted-foreground mt-1">
                by {farmOwner.name}
              </p>
              {farm.description && (
                <p className="mt-2 text-sm">{farm.description}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Map Section */}
      <div className="container mx-auto px-4 py-8">
        <FarmMapReadonly farm={farm} />
      </div>

      {/* Feed Section */}
      <div className="container mx-auto px-4 pb-8">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">Farm Updates</h2>
          <FarmFeedClient farmId={farm.id} initialData={initialFeedData} />
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add components/farm/farm-public-view.tsx
git commit -m "feat: add public view component for farm visitors"
```

---

## Task 3: Update Farm Page to Use Split Views

**Files:**
- Modify: `app/(app)/farm/[id]/page.tsx`

**Step 1: Add owner info query**

Modify `app/(app)/farm/[id]/page.tsx` to fetch farm owner information:

```typescript
// After fetching farm data, add owner query
const ownerResult = await db.execute({
  sql: "SELECT name, image FROM users WHERE id = ?",
  args: [farm.user_id],
});

const farmOwner = ownerResult.rows[0] as { name: string; image: string | null };
```

**Step 2: Add conditional rendering**

Import the new component at the top:

```typescript
import { FarmPublicView } from '@/components/farm/farm-public-view';
```

Replace the return statement to conditionally render based on `isOwner`:

```typescript
// If visitor (not owner), show public view
if (!isOwner) {
  return (
    <FarmPublicView
      farm={farm}
      farmOwner={farmOwner}
      initialFeedData={initialFeedData}
    />
  );
}

// If owner, show full editor dashboard (current behavior)
return (
  <div>
    <FarmEditorClient
      farm={farm}
      initialZones={zones}
      isOwner={isOwner}
      initialIsPublic={!!farm.is_public}
    />
    <div className="mt-8 px-4 pb-8">
      <h2 className="text-2xl font-bold mb-4 text-center">Farm Feed</h2>
      <FarmFeedClient farmId={id} initialData={initialFeedData} />
    </div>
  </div>
);
```

**Step 3: Commit**

```bash
git add app/(app)/farm/[id]/page.tsx
git commit -m "feat: implement split view for farm owners vs visitors"
```

---

## Task 4: Handle Private Farms for Non-Owners

**Files:**
- Modify: `app/(app)/farm/[id]/page.tsx`

**Step 1: Add private farm check for visitors**

After the farm ownership check, add logic to handle private farms:

```typescript
// After checking isOwner and farm.is_public
// If not owner and farm is private, show 404 or access denied
if (!isOwner && !farm.is_public) {
  notFound(); // Returns 404 page
}
```

**Step 2: Update the ownership check logic**

Modify the existing ownership check section:

```typescript
// First try to fetch farm as owner
let farmResult = await db.execute({
  sql: "SELECT * FROM farms WHERE id = ? AND user_id = ?",
  args: [id, session.user.id],
});

let isOwner = farmResult.rows.length > 0;

// If not found as owner, try fetching as public farm
if (!isOwner) {
  farmResult = await db.execute({
    sql: "SELECT * FROM farms WHERE id = ? AND is_public = 1",
    args: [id],
  });
}

const farm = farmResult.rows[0] as unknown as Farm;
if (!farm) {
  notFound();
}

// At this point:
// - isOwner = true: User owns this farm (can see private or public)
// - isOwner = false: Farm is public (visitor can see)
```

**Step 3: Commit**

```bash
git add app/(app)/farm/[id]/page.tsx
git commit -m "feat: restrict private farm access to owners only"
```

---

## Task 5: Add Visit Farm Link to Global Feed

**Files:**
- Modify: `components/feed/global-feed-client.tsx`

**Step 1: Update farm header to be more prominent**

Modify the farm context header in `global-feed-client.tsx` to make it clearer that users can visit the farm:

```typescript
{/* Farm context header - updated design */}
<Link href={`/farm/${post.farm_id}`} className="block">
  <div className="bg-accent hover:bg-accent/80 transition-colors rounded-lg p-4 mb-2">
    <div className="flex items-center gap-2">
      <div className="flex-1">
        <p className="font-semibold text-lg">{post.farm_name}</p>
        {post.farm_description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {post.farm_description}
          </p>
        )}
      </div>
      <div className="text-xs text-muted-foreground">
        Visit Farm →
      </div>
    </div>
  </div>
</Link>
```

**Step 2: Commit**

```bash
git add components/feed/global-feed-client.tsx
git commit -m "feat: improve farm header in global feed with visit link"
```

---

## Task 6: Build Verification

**Step 1: Run full build**

```bash
npm run build
```

Expected: `✓ Compiled successfully`

**Step 2: Manual testing checklist**

Start dev server and test both views:

```bash
npm run dev
```

**As Farm Owner:**
- [ ] Visit your own farm → see full dashboard with map editor
- [ ] See drawing tools and zone details
- [ ] See AI chat panel on the right
- [ ] See farm settings and delete buttons
- [ ] See feed below map
- [ ] Can create posts via FAB

**As Visitor (use incognito or different account):**
- [ ] Visit a public farm → see simplified view
- [ ] See read-only map with just farm outline
- [ ] See farm name, owner, description in header
- [ ] No drawing tools or editing capabilities visible
- [ ] No AI chat panel visible
- [ ] See feed with shared posts
- [ ] Can react and comment on posts
- [ ] Cannot see FAB (no post creation)

**Private Farm Access:**
- [ ] Visit private farm as non-owner → get 404
- [ ] Visit private farm as owner → see full dashboard

**Global Feed:**
- [ ] Click farm name in global feed → navigate to farm public view
- [ ] Verify farm header looks good in global feed

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete farm visitor view implementation

Owners see full dashboard with map editor, AI chat, and all controls.
Visitors see simplified public profile with read-only map and feed.

Changes:
- Created FarmMapReadonly component for visitor map view
- Created FarmPublicView component for visitor layout
- Split farm page rendering based on isOwner flag
- Private farms return 404 for non-owners
- Improved farm header in global feed
- Read-only map shows farm boundary outline only

Manual testing:
- ✓ Owner view: Full dashboard works
- ✓ Visitor view: Simplified profile works
- ✓ Private farm access restricted
- ✓ Public farm accessible to all
- ✓ Global feed farm links work"
```

---

## Architecture Notes

### Why This Approach?

**Single Page, Two Views:**
- Same URL structure (`/farm/[id]`)
- Conditional rendering based on `isOwner`
- Clean separation of concerns
- Easy to maintain

**Security:**
- Private farms return 404 for non-owners (server-side check)
- No sensitive data sent to client for visitors
- Owner check happens on every request

**Performance:**
- Visitors get simpler component (less JavaScript)
- Read-only map is lightweight (no drawing tools)
- Feed component is reused (consistent UX)

### Component Hierarchy

**Owner View:**
```
FarmEditorClient
├── FarmMap (full interactive)
├── EnhancedChatPanel (AI chat)
├── Settings & Controls
└── FarmFeedClient (below)
```

**Visitor View:**
```
FarmPublicView
├── Farm Header (owner info)
├── FarmMapReadonly (boundary only)
└── FarmFeedClient (feed)
```

---

## Next Steps (Optional Enhancements)

After this implementation is complete and tested:

1. **Farm Stats Display** - Show public stats for visitors (total posts, followers, etc.)
2. **Follow/Subscribe** - Let visitors follow farms for updates
3. **Share Farm Profile** - Social sharing buttons for farm profile
4. **Farm Collections** - Group farms by region, type, or topic
5. **Embedded Map** - Let owners embed their farm map elsewhere

Choose based on user feedback and priorities.
