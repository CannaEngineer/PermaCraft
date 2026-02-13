# CLAUDE.md - Permaculture.Studio Development Guide

## Project Overview

Permaculture.Studio is an AI-first, map-based permaculture planning platform for small farmers, curious landowners, and permaculture students. Users draw zones and plantings on interactive maps, receive AI-powered design recommendations based on screenshot analysis, simulate growth over time, and share designs with a community.

### Core Philosophy
- **Native species first**: Always prioritize native plants; mark non-natives clearly
- **Permaculture principles**: Every AI suggestion should connect to established permaculture ethics and principles
- **Playful but professional**: Game-like UI that produces professional-grade farm designs
- **AI-first**: The AI analysis and recommendations are the core value proposition

## Tech Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| Framework | Next.js 14 (App Router) | Use server components by default |
| Styling | Tailwind CSS + shadcn/ui | No custom CSS unless necessary |
| Maps | MapLibre GL JS | Open source, no API keys needed for tiles |
| Map Tiles | OpenFreeMap / OSM / ESRI Satellite | Free tile sources |
| Database | Turso (libSQL) | Use `@libsql/client` |
| Auth | Better Auth | Self-hosted, works with Turso |
| AI | OpenRouter | Free models: `meta-llama/llama-3.2-90b-vision-instruct:free` |
| Storage | Cloudflare R2 | For map screenshots |
| Hosting | Vercel | Edge runtime where possible |

## Project Structure

```
permaculture-studio/
├── app/
│   ├── (app)/                    # Authenticated routes
│   │   ├── dashboard/page.tsx    # User's farms list
│   │   ├── farm/
│   │   │   ├── new/page.tsx      # Create farm flow
│   │   │   └── [id]/page.tsx     # Main map editor
│   │   ├── gallery/page.tsx      # Public farm gallery
│   │   └── layout.tsx            # App shell with sidebar
│   ├── (auth)/                   # Auth routes (no shell)
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── api/                      # API routes
│   │   ├── auth/[...all]/route.ts
│   │   ├── farms/
│   │   ├── species/
│   │   └── ai/analyze/route.ts
│   ├── globals.css
│   └── layout.tsx                # Root layout
├── components/
│   ├── ui/                       # shadcn components (don't edit)
│   ├── map/                      # Map-related components
│   ├── ai/                       # AI chat and suggestions
│   └── shared/                   # Shared components
├── lib/
│   ├── db/                       # Database client and queries
│   ├── auth/                     # Better Auth config
│   ├── ai/                       # OpenRouter client and prompts
│   ├── map/                      # Map utilities
│   └── utils/                    # General utilities
├── hooks/                        # React hooks
└── data/                         # Seed data (species, etc.)
```

## Immersive Map Editor

The farm detail page has two implementations:

1. **Classic Editor** (`FarmEditorClient`) - Original implementation
2. **Immersive Editor** (`ImmersiveMapEditor`) - Full-screen experience

### Feature Flag

Controlled via `NEXT_PUBLIC_USE_IMMERSIVE_EDITOR` environment variable.

### Components

Located in `components/immersive-map/`:
- `immersive-map-editor.tsx` - Main component
- `collapsible-header.tsx` - Auto-collapsing header
- `map-control-panel.tsx` - Map settings panel
- `drawing-toolbar.tsx` - Drawing tools (conditional)
- `bottom-drawer.tsx` - Slide-up details drawer
- `chat-overlay.tsx` - AI chat overlay

### State Management

Uses `ImmersiveMapUIContext` (in `contexts/`) for centralized panel visibility.

### Design Reference

See `docs/plans/2026-02-12-immersive-map-design.md` for full specifications.

## Key Files Reference

### Database (`lib/db/index.ts`)
```typescript
import { createClient } from '@libsql/client';

export const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});
```

### OpenRouter Client (`lib/ai/openrouter.ts`)
```typescript
import OpenAI from 'openai';

export const openrouter = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL,
    'X-Title': 'Permaculture.Studio',
  },
});
```

### Environment Variables
```
TURSO_DATABASE_URL=libsql://...
TURSO_AUTH_TOKEN=...
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=http://localhost:3000
OPENROUTER_API_KEY=sk-or-...
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=permaculture-studio-snapshots
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Database Schema (Turso/SQLite)

Core tables: `users`, `sessions`, `farms`, `zones`, `plantings`, `species`, `map_snapshots`, `ai_analyses`, `farm_collaborators`, `regional_knowledge`

### Key Relationships
- User has many Farms
- Farm has many Zones, Plantings, MapSnapshots, AIAnalyses
- Planting references Species and optionally Zone
- Species is community-contributed with native region data

### ID Generation
Use `crypto.randomUUID()` for all IDs. Store as TEXT in SQLite.

### Timestamps
Store as INTEGER (Unix epoch) using `unixepoch()` default.

## Coding Standards

### TypeScript
- Strict mode enabled
- Define types in `lib/db/schema.ts` matching database tables
- Use Zod for API input validation
- Prefer `interface` over `type` for object shapes

### React Components
- Server Components by default
- Add `'use client'` only when needed (interactivity, hooks)
- Colocate component-specific types in the same file
- Use `cn()` utility for conditional classes

### API Routes
- Use Next.js Route Handlers (app/api)
- Return `Response.json()` for data
- Handle errors with appropriate status codes
- Validate input with Zod before database operations

### Database Queries
- Use parameterized queries (`args` array) always
- Never interpolate user input into SQL strings
- Return `rows` from execute, handle empty results

Example:
```typescript
const result = await db.execute({
  sql: 'SELECT * FROM farms WHERE user_id = ? AND id = ?',
  args: [userId, farmId]
});
const farm = result.rows[0];
if (!farm) return new Response('Not found', { status: 404 });
```

### Map Components
- MapLibre instance should be stored in a ref
- Use `useEffect` for map initialization and cleanup
- Drawing tools via `@mapbox/mapbox-gl-draw`
- Store geometry as GeoJSON TEXT in database

### AI Integration
- Always include the permaculture system prompt
- Send map screenshots as base64 data URLs
- Use vision model for screenshot analysis
- Parse structured JSON from responses when needed

## Common Commands

```bash
# Development
npm run dev

# Database
turso db shell permaculture-studio              # Interactive SQL shell
turso db tokens create permaculture-studio      # Generate new auth token

# Deployment
vercel                                 # Deploy to Vercel
vercel env pull                        # Pull env vars locally

# Dependencies
npx shadcn@latest add [component]      # Add shadcn component
```

## Implementation Notes

### Map Screenshot Capture
Use MapLibre's `getCanvas().toDataURL()` to capture current map state. Temporarily hide/show layers to capture specific views (satellite only, design only, etc.).

### Growth Simulation
Use sigmoid growth curve based on species' `years_to_maturity`. Store `current_year` on plantings, calculate size at render time based on timeline slider value.

### AI Analysis Flow
1. User clicks "Analyze" button
2. Capture screenshot(s) of relevant layers
3. Upload to R2, get public URLs
4. Send to OpenRouter with permaculture system prompt + user query
5. Display response in chat interface
6. Save analysis to `ai_analyses` table

### Zone Types
```
zone_0, zone_1, zone_2, zone_3, zone_4, zone_5
water_body, water_flow, swale, pond
structure, path, fence
food_forest, silvopasture, alley_crop, windbreak
annual_garden, orchard, pasture, woodland
```

### Species Layers
```
canopy, understory, shrub, herbaceous, groundcover, vine, root, aquatic
```

## Testing Approach

- Focus on integration tests for API routes
- Test AI prompts with real OpenRouter calls in development
- Manual testing for map interactions
- Use Turso's branch feature for test databases

## Performance Considerations

- Use React Server Components for initial page loads
- Lazy load MapLibre (it's large)
- Cache species database queries
- Use R2 public URLs for screenshots (no proxying)
- Consider edge runtime for API routes where possible

## Security Notes

- Validate farm ownership before any mutation
- Sanitize GeoJSON input (validate structure)
- Rate limit AI analysis endpoint
- Never expose API keys to client

## Phase 1 MVP Checklist

- [ ] Next.js project with Tailwind + shadcn
- [ ] Turso database with schema
- [ ] Better Auth login/register
- [ ] Dashboard showing user's farms
- [ ] Create farm with map location picker
- [ ] Farm editor with MapLibre
- [ ] Basic zone drawing (polygons)
- [ ] Save/load zones to database
- [ ] Screenshot capture
- [ ] OpenRouter AI analysis integration
- [ ] Chat interface for AI responses

## Useful Snippets

### Get Current User (Server Component)
```typescript
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export default async function Page() {
  const session = await auth.api.getSession({
    headers: headers(),
  });
  if (!session) redirect('/login');
  // ...
}
```

### Protected API Route
```typescript
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function POST(request: Request) {
  const session = await auth.api.getSession({
    headers: headers(),
  });
  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }
  // session.user.id is available
}
```

### Map Initialization
```typescript
'use client';
import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

export function MapCanvas({ center, zoom }: Props) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (map.current || !mapContainer.current) return;
    
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: center,
      zoom: zoom,
    });

    return () => map.current?.remove();
  }, []);

  return <div ref={mapContainer} className="w-full h-full" />;
}
```

## AI Prompt Guidelines

When generating AI prompts for permaculture analysis:

1. **Always include site context**: acres, climate zone, rainfall, soil types
2. **Reference specific map locations**: "the southeast corner", "along the creek"
3. **Suggest species with scientific names**: Common Name (Genus species)
4. **Mark native status**: [NATIVE], [NATURALIZED], [NON-NATIVE]
5. **Include implementation timeline**: Year 1, Year 2-3, Year 5+
6. **Connect to permaculture principles**: Explain *why* a suggestion follows permaculture ethics
7. **Acknowledge existing plantings**: Don't suggest duplicates

## Known Limitations

- OpenRouter free models may have rate limits
- MapLibre terrain/elevation requires additional tile source setup
- SSURGO soil data API requires separate integration
- Real-time collaboration requires WebSocket infrastructure (Phase 2+)

## Getting Help

- MapLibre docs: https://maplibre.org/maplibre-gl-js/docs/
- Better Auth docs: https://www.better-auth.com/docs
- Turso docs: https://docs.turso.tech/
- OpenRouter docs: https://openrouter.ai/docs
- shadcn/ui: https://ui.shadcn.com/

---

*This file is designed to be read by Claude Code. Keep it updated as the project evolves.*
