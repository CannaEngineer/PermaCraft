# Permaculture.Studio Architecture

This document provides a technical overview of Permaculture.Studio's architecture, design patterns, and implementation details.

## Table of Contents

- [System Overview](#system-overview)
- [Tech Stack Decisions](#tech-stack-decisions)
- [Database Schema](#database-schema)
- [AI Vision Pipeline](#ai-vision-pipeline)
- [Map System](#map-system)
- [Authentication Flow](#authentication-flow)
- [Deployment Architecture](#deployment-architecture)

---

## System Overview

Permaculture.Studio is a **serverless, full-stack Next.js application** with:
- Server-side rendering (SSR) and static generation (SSG)
- Server Components for optimal performance
- Edge runtime where applicable
- Serverless database (Turso)
- Object storage (Cloudflare R2)

```
┌─────────────────────────────────────────────────────────┐
│                    User Browser                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ Map Interface│  │  AI Chat     │  │  Dashboard   │ │
│  │ (MapLibre)   │  │  Panel       │  │              │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                    Next.js App (Vercel)                  │
│  ┌──────────────────────────────────────────────────┐  │
│  │            App Router (RSC)                       │  │
│  │  • Server Components (default)                    │  │
│  │  • Client Components (map, chat)                  │  │
│  │  • API Routes (/api/*)                           │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
         │                   │                    │
         ▼                   ▼                    ▼
┌─────────────┐    ┌─────────────┐      ┌─────────────┐
│   Turso DB  │    │ OpenRouter  │      │Cloudflare R2│
│   (libSQL)  │    │   (AI API)  │      │  (Storage)  │
└─────────────┘    └─────────────┘      └─────────────┘
```

---

## Tech Stack Decisions

### Next.js 14 (App Router)

**Why:**
- React Server Components reduce client bundle size
- Built-in API routes for serverless functions
- Automatic code splitting and optimization
- Edge runtime support
- Easy Vercel deployment

**Key Patterns:**
```typescript
// Server Component (default)
export default async function Page() {
  const data = await fetchData(); // Direct DB access
  return <Component data={data} />;
}

// Client Component (interactive)
'use client';
export function MapComponent() {
  const [state, setState] = useState();
  return <InteractiveMap />;
}
```

### Turso (libSQL)

**Why:**
- Serverless SQLite - no connection pooling needed
- Edge-deployed for low latency
- Cost-effective for small-medium scale
- SQL familiar to developers
- Embedded replicas possible

**Connection:**
```typescript
import { createClient } from '@libsql/client';

export const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Usage
const result = await db.execute({
  sql: 'SELECT * FROM farms WHERE user_id = ?',
  args: [userId]
});
```

### MapLibre GL JS

**Why:**
- Open-source (no vendor lock-in)
- No API keys for base maps
- WebGL rendering (fast)
- GeoJSON native support
- Vector and raster tile support

**vs Mapbox:**
- Mapbox requires API keys + costs money
- MapLibre is fork of Mapbox GL v1 (open source)
- Same API, different tile sources

### OpenRouter

**Why:**
- Free tier for vision models
- Access to Llama 3.2 90B Vision (excellent for our use case)
- Fallback to multiple models on rate limits
- OpenAI-compatible API

**Alternative considered:**
- OpenAI GPT-4 Vision: More expensive, no free tier
- Google Gemini: Good but less permaculture knowledge
- Local models: Too slow for real-time analysis

---

## Database Schema

### Core Tables

```sql
-- Users (managed by Better Auth)
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at INTEGER DEFAULT (unixepoch())
);

-- Farms
CREATE TABLE farms (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  acres REAL,
  climate_zone TEXT,
  rainfall_inches REAL,
  soil_type TEXT,
  center_lat REAL NOT NULL,
  center_lng REAL NOT NULL,
  zoom_level REAL DEFAULT 15,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Zones (drawn features on map)
CREATE TABLE zones (
  id TEXT PRIMARY KEY,
  farm_id TEXT NOT NULL,
  name TEXT,
  zone_type TEXT NOT NULL, -- 'zone_1', 'water_body', 'food_forest', etc.
  geometry TEXT NOT NULL,  -- GeoJSON string
  properties TEXT,         -- Additional JSON properties
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE
);

-- AI Conversations
CREATE TABLE ai_conversations (
  id TEXT PRIMARY KEY,
  farm_id TEXT NOT NULL,
  title TEXT NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE
);

-- AI Analysis (chat messages)
CREATE TABLE ai_analyses (
  id TEXT PRIMARY KEY,
  farm_id TEXT NOT NULL,
  conversation_id TEXT NOT NULL,
  user_query TEXT NOT NULL,
  screenshot_data TEXT,    -- JSON array of R2 URLs or base64
  map_layer TEXT,          -- 'satellite', 'topo', etc.
  zones_context TEXT,      -- JSON snapshot of zones
  ai_response TEXT NOT NULL,
  model TEXT,              -- Which AI model was used
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE,
  FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id) ON DELETE CASCADE
);

-- Species Database
CREATE TABLE species (
  id TEXT PRIMARY KEY,
  common_name TEXT NOT NULL,
  scientific_name TEXT NOT NULL,
  native_region TEXT,
  is_native BOOLEAN,
  usda_zones TEXT,
  sun_requirements TEXT,
  water_needs TEXT,
  layer TEXT,              -- 'canopy', 'understory', 'groundcover', etc.
  edible_parts TEXT,
  companion_species TEXT,  -- JSON array
  created_at INTEGER DEFAULT (unixepoch())
);
```

### Key Design Decisions

**ID Generation:**
- Use `crypto.randomUUID()` for all IDs
- Stored as TEXT in SQLite
- Avoids auto-increment issues in distributed systems

**Timestamps:**
- Store as INTEGER (Unix epoch)
- Use `unixepoch()` SQL function for defaults
- Convert to Date objects in application layer

**GeoJSON Storage:**
- Zones stored as TEXT (JSON string)
- Parsed on read, stringified on write
- Enables future spatial indexing with SQLite extensions

---

## AI Vision Pipeline

### Multi-View Screenshot Capture

**Flow:**
1. User asks question in chat
2. System captures **dual screenshots**:
   - Primary view (current map layer)
   - Topographic view (USGS topo)
3. Screenshots sent to OpenRouter vision API
4. AI analyzes both views together
5. Response displayed in chat

**Implementation (`farm-editor-client.tsx`):**

```typescript
const handleAnalyze = async (query: string) => {
  // 1. Capture current layer
  const currentScreenshot = await captureMapScreenshot();

  // 2. Switch to topo layer (invisible to user)
  const originalLayer = currentMapLayer;
  mapRef.current.setStyle(usgsTopoStyle);
  await waitForTilesLoaded();

  // 3. Capture topo layer
  const topoScreenshot = await captureMapScreenshot();

  // 4. Restore original layer
  mapRef.current.setStyle(originalStyle);

  // 5. Send both screenshots to AI
  const response = await fetch('/api/ai/analyze', {
    method: 'POST',
    body: JSON.stringify({
      screenshots: [
        { type: originalLayer, data: currentScreenshot },
        { type: 'usgs', data: topoScreenshot }
      ],
      query,
      zones,
      farmContext
    })
  });
};
```

### AI Prompt Engineering

**System Prompt Structure:**
```
1. ROLE DEFINITION
   - Expert permaculture designer
   - Natural conversational tone

2. MULTI-VIEW INSTRUCTIONS
   - Analyze BOTH screenshots
   - Correlate features between views
   - Use grid coordinates to match locations

3. TERRAIN INTERPRETATION GUIDE
   - How to read contour lines
   - Slope calculation from spacing
   - Drainage pattern identification
   - Aspect determination

4. RESPONSE GUIDELINES
   - Simple questions = simple answers
   - Design questions = detailed recommendations
   - Always reference grid coordinates
   - Include native species priority
```

See `lib/ai/prompts.ts` for full implementation.

### Screenshot Storage Strategy

**R2 Upload:**
```typescript
// Upload both screenshots
const urls = await Promise.all(
  screenshots.map((ss, idx) =>
    uploadScreenshot(farmId, ss.data, `${ss.type}-${idx}`)
  )
);

// Store as JSON array
await db.execute({
  sql: 'INSERT INTO ai_analyses (..., screenshot_data) VALUES (?, ...)',
  args: [..., JSON.stringify(urls)]
});
```

**Benefits:**
- Separate files preserve full quality
- Easy to display either/both in UI
- R2 fallback to base64 if upload fails

---

## Map System

### MapLibre Integration

**Initialization:**
```typescript
const map = new maplibregl.Map({
  container: containerRef.current,
  style: satelliteStyle,
  center: [lng, lat],
  zoom: 15,
  preserveDrawingBuffer: true, // Required for screenshots
});
```

### Drawing Tools

**Mapbox GL Draw:**
- Polygons, lines, points supported
- Custom circle tool added
- Styled to match UI theme

**Zone Types:**
- 20+ zone types (water, structures, plantings)
- Color-coded by category
- Configurable in `lib/map/zone-types.ts`

### Grid System

**Implementation:**
```typescript
// Generate grid lines every 50ft
const gridLines = generateGridLines(farmBounds, 'imperial');

// Generate alphanumeric labels (A1, B2, etc.)
const labels = generateViewportLabels(farmBounds, viewport, zoom);

// Add to map as GeoJSON layers
map.addSource('grid-lines', { type: 'geojson', data: gridLines });
map.addSource('grid-labels', { type: 'geojson', data: labels });
```

**Grid Coordinate Calculation:**
- Used by AI for precise location references
- Zones mapped to grid cells on save
- Sent to AI in analysis requests

---

## Authentication Flow

### Better Auth

**Session Management:**
```typescript
// Server component
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

const session = await auth.api.getSession({ headers: headers() });
if (!session) redirect('/login');
```

**API Route Protection:**
```typescript
export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) return new Response('Unauthorized', { status: 401 });

  const userId = session.user.id;
  // ... protected logic
}
```

### Farm Ownership Verification

**Pattern:**
```typescript
// Always verify ownership before mutations
const farm = await db.execute({
  sql: 'SELECT * FROM farms WHERE id = ? AND user_id = ?',
  args: [farmId, userId]
});

if (farm.rows.length === 0) {
  return Response.json({ error: 'Not found' }, { status: 404 });
}
```

---

## Deployment Architecture

### Vercel Deployment

**Build Process:**
1. `npm run build` compiles Next.js app
2. Static pages pre-rendered
3. API routes become serverless functions
4. Edge runtime used where possible

**Environment Variables:**
- Set in Vercel dashboard
- Prefix client vars with `NEXT_PUBLIC_`
- Secrets encrypted at rest

### Edge Considerations

**What runs on Edge:**
- Middleware
- Some API routes (auth checks)
- Server components (when possible)

**What runs on Node.js:**
- Database operations (Turso client)
- R2 uploads
- AI API calls

### Performance Optimizations

**1. Code Splitting:**
- MapLibre loaded only on farm editor pages
- AI chat panel lazy loaded

**2. Image Optimization:**
- Next.js Image component for static assets
- R2 serves screenshots directly (no proxying)

**3. Caching:**
- Static pages cached at CDN edge
- Species database queries cached
- Map tiles cached by browser

**4. Bundle Size:**
- Server Components reduce client JS
- Tree-shaking removes unused code
- Dynamic imports for heavy libraries

---

## Security Considerations

### Input Validation

**Zod Schemas:**
```typescript
const analyzeSchema = z.object({
  farmId: z.string(),
  query: z.string().min(1),
  screenshots: z.array(z.object({
    type: z.string(),
    data: z.string()
  })),
  zones: z.array(z.object({ /* ... */ })).optional()
});
```

### SQL Injection Prevention

**Parameterized Queries:**
```typescript
// ✅ SAFE
await db.execute({
  sql: 'SELECT * FROM farms WHERE id = ?',
  args: [farmId]
});

// ❌ NEVER DO THIS
await db.execute({
  sql: `SELECT * FROM farms WHERE id = '${farmId}'`
});
```

### API Rate Limiting

**TODO:** Implement rate limiting on:
- AI analysis endpoint (prevent abuse)
- Farm creation (spam prevention)
- Screenshot uploads (storage limits)

---

## Future Enhancements

### Planned Features

1. **Real-time Collaboration**
   - WebSocket integration
   - Operational transforms for concurrent edits
   - Presence indicators

2. **Advanced Terrain Analysis**
   - Watershed calculations
   - Slope/aspect overlays
   - Solar exposure modeling

3. **Export Formats**
   - PDF design reports
   - CAD/DXF files
   - KML for Google Earth

4. **Mobile App**
   - React Native or PWA
   - Offline mode with local storage
   - GPS integration for field work

---

## Contributing to Architecture

When making architectural changes:

1. **Document decisions** in this file
2. **Update CLAUDE.md** if AI workflow changes
3. **Write migrations** for schema changes
4. **Consider backwards compatibility**
5. **Discuss major changes** in GitHub Discussions

---

**Last Updated:** 2024-11-30
**Maintainers:** See [CONTRIBUTING.md](CONTRIBUTING.md)
