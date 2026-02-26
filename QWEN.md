# Permaculture.Studio — Full Project Context for LLM Assistance

**Last Updated:** 2026-02-26
**Codebase Size:** ~78,700 lines of TypeScript | 263 React components | 143 API routes | 47 page routes | 50+ database tables

---

## 1. PROJECT OVERVIEW

Permaculture.Studio is a **production-grade, AI-powered permaculture design platform** that combines interactive mapping with AI terrain analysis for regenerative agriculture planning. Users draw zones and plantings on satellite/topographic maps, receive AI-powered design recommendations via vision model analysis, simulate growth over time, and share designs with a community.

### Core Philosophy
- **Native species first** — Always prioritize native plants; mark non-natives clearly
- **Permaculture principles** — Every AI suggestion connects to established permaculture ethics and principles
- **Playful but professional** — Game-like UI that produces professional-grade farm designs
- **AI-first** — AI analysis and recommendations are the core value proposition
- **Open source** — GPL v3 license, fully transparent

### What Makes It Unique
No existing farm management software treats the farm as a **designed ecosystem**. Commercial tools (Farmbrite, Granular, Agrivi) manage inputs/outputs for commodity agriculture. Permaculture.Studio is the first platform that models the farm as a whole system — water flows, species guilds, canopy layers, zone interactions, and multi-decade succession — and uses AI vision models to design that system based on actual terrain analysis.

---

## 2. TECH STACK

| Layer | Technology | Notes |
|-------|------------|-------|
| **Framework** | Next.js 14 (App Router) | Server components by default |
| **Language** | TypeScript (strict mode) | ~78.7K lines |
| **Styling** | Tailwind CSS + shadcn/ui | Radix UI primitives underneath |
| **Maps** | MapLibre GL JS v5.13 | Open source, no API keys needed |
| **Drawing** | @mapbox/mapbox-gl-draw | Polygons, lines, points, circles |
| **Map Tiles** | OpenFreeMap / OSM / ESRI Satellite / USGS Topo | Free tile sources |
| **Database** | Turso (libSQL) | Serverless SQLite with edge distribution |
| **Auth** | Better Auth + JWT sessions | Self-hosted, works with Turso |
| **AI** | OpenRouter (OpenAI-compatible API) | Free models: Llama 3.2 90B Vision |
| **Object Storage** | Cloudflare R2 | Map screenshots, media uploads |
| **Rich Text** | TipTap (ProseMirror) | Annotations, content editing |
| **PDF Generation** | PDFKit | Farm export reports |
| **Geospatial** | Turf.js | Area, bbox, centroid calculations |
| **Animation** | Framer Motion | UI transitions |
| **Offline** | Workbox + IndexedDB (idb) | PWA offline queue with sync |
| **Error Tracking** | Sentry | Client, server, edge configs |
| **Testing** | Vitest + Testing Library + Playwright | Unit, integration, E2E |
| **Hosting** | Vercel | Edge runtime where possible |

### Key Dependencies (package.json)
- `maplibre-gl` v5.13, `@mapbox/mapbox-gl-draw` v1.5
- `openai` v4.104 (used as OpenRouter client)
- `@libsql/client` v0.14 (Turso)
- `@tiptap/react` v3.19 (rich text editor)
- `@turf/turf` v7.3 (geospatial)
- `pdfkit` v0.17, `pdfjs-dist` v5.4 (PDF generation + reading)
- `framer-motion` v11.18 (animations)
- `workbox-webpack-plugin` v7.4 (offline/PWA)
- `sharp` v0.34 (image processing)
- `d3-scale` v4.0 (data visualization)
- `@dnd-kit/core` + `@dnd-kit/sortable` (drag-and-drop)
- `zod` v3.23 (input validation)
- `lru-cache` v11.2 (response caching)
- `sonner` v2.0 (toast notifications)

---

## 3. PROJECT STRUCTURE

```
permaculture-studio/
├── app/                          # Next.js App Router
│   ├── (app)/                    # Authenticated routes (with sidebar shell)
│   │   ├── dashboard/            # User's farms list
│   │   ├── farm/
│   │   │   ├── new/              # Create farm flow
│   │   │   ├── [id]/             # Main map editor (classic or immersive)
│   │   │   ├── [id]/shop/        # Farm shop management
│   │   │   └── [id]/story/       # Farm story builder
│   │   ├── gallery/              # Public farm gallery
│   │   │   ├── collections/      # Curated collections
│   │   │   ├── following/        # Following feed
│   │   │   ├── saved/            # Saved/bookmarked farms
│   │   │   └── trending/         # Trending farms
│   │   ├── learn/                # Learning system
│   │   │   ├── blog/             # Blog articles
│   │   │   ├── lessons/[slug]/   # Individual lessons
│   │   │   ├── paths/[slug]/     # Learning paths
│   │   │   ├── topics/[slug]/    # Topic pages
│   │   │   └── practice-farms/   # Practice farm sandbox
│   │   ├── plants/               # Species database browser
│   │   ├── profile/              # User profiles
│   │   ├── shops/                # Farm marketplace
│   │   │   ├── [farmId]/         # Individual shop
│   │   │   └── checkout/         # Checkout flow
│   │   └── admin/                # Admin dashboard
│   │       ├── analytics/        # Platform analytics
│   │       ├── blog/             # Blog management
│   │       ├── content/          # AI content generation studio
│   │       ├── users/            # User management
│   │       └── settings/         # Platform settings
│   ├── (auth)/                   # Auth routes (no shell)
│   │   ├── login/
│   │   └── register/
│   ├── canvas/                   # Unified canvas editor
│   ├── api/                      # 143 API route handlers (see Section 5)
│   ├── globals.css
│   └── layout.tsx                # Root layout
│
├── components/                   # 263 React components
│   ├── ui/                       # shadcn/ui primitives (don't edit directly)
│   ├── map/                      # Map-related (farm-map, overlays, tools, info sheets)
│   ├── immersive-map/            # Full-screen immersive editor
│   ├── canvas/                   # Unified canvas components
│   ├── ai/                       # AI chat panel, suggestions
│   ├── annotations/              # Design annotation system
│   ├── audio/                    # Ambient sound / music player
│   ├── blog/                     # Blog components
│   ├── collections/              # Gallery collections
│   ├── comments/                 # Comment system
│   ├── community/                # Community features
│   ├── dashboard/                # Dashboard components
│   ├── drawing/                  # Drawing toolbar / tools
│   ├── export/                   # Export panel (PDF, KML, markdown)
│   ├── farm/                     # Farm editor, details, settings
│   ├── feed/                     # Social feed components
│   ├── guilds/                   # Guild/companion planting
│   ├── imagery/                  # Custom aerial imagery upload
│   ├── layers/                   # Design layer management
│   ├── learning/                 # Learning system UI
│   ├── offline/                  # Offline status indicator
│   ├── phasing/                  # Implementation phasing/timeline
│   ├── plants/                   # Species database browser
│   ├── profile/                  # User profile components
│   ├── search/                   # Universal search
│   ├── shared/                   # Shared/common components
│   ├── shop/                     # Farm shop / marketplace
│   ├── species/                  # Species detail cards
│   ├── story/                    # Farm story builder
│   ├── theme/                    # Theme / dark mode
│   ├── time-machine/             # Growth simulation timeline
│   ├── varieties/                # Plant variety management
│   └── water/                    # Water management tools
│
├── lib/                          # Core utilities and business logic
│   ├── ai/                       # AI pipeline (19 files)
│   ├── api/                      # API utility helpers
│   ├── auth/                     # Better Auth configuration
│   ├── blog/                     # Blog generation utilities
│   ├── db/                       # Database client, schema, 40+ migrations
│   ├── design/                   # Design tokens (spacing, colors, typography)
│   ├── export/                   # Export utilities (PDF, KML)
│   ├── imagery/                  # Imagery processing
│   ├── layers/                   # Layer management logic
│   ├── learning/                 # Learning system helpers
│   ├── map/                      # Map utilities (10 files: zones, grid, snap, zoom)
│   ├── nav/                      # Navigation helpers
│   ├── offline/                  # Offline queue management
│   ├── rag/                      # RAG pipeline (5 files: scanner, processor, search)
│   ├── species/                  # Species matching, native lookup
│   ├── storage/                  # R2 storage client
│   ├── time-machine/             # Growth simulation logic
│   ├── varieties/                # Variety management
│   ├── videos/                   # Video utilities
│   ├── water/                    # Water calculation utilities
│   ├── env.ts                    # Environment variable validation
│   └── utils.ts                  # cn() utility for className merging
│
├── hooks/                        # Custom React hooks
│   ├── use-ai-chat.ts            # AI chat state management
│   ├── use-infinite-scroll.ts    # Pagination
│   ├── use-media-query.ts        # Responsive breakpoints
│   ├── use-offline-queue.ts      # Offline operation queue
│   ├── use-online-status.ts      # Network status detection
│   ├── use-search.ts             # Search state
│   └── use-toast.ts              # Toast notifications
│
├── contexts/                     # React contexts
│   ├── immersive-map-ui-context.tsx  # Immersive editor panel visibility
│   ├── layer-context.tsx             # Design layer state
│   └── unified-canvas-context.tsx    # Unified canvas state
│
├── data/                         # Seed data and static content
│   ├── knowledge/                # 13 permaculture PDFs for RAG system
│   ├── learning/                 # Lesson specs, badges, paths, topics (JSON)
│   ├── seed-species*.sql         # 300+ species SQL seed data
│   ├── seed-guilds.ts            # Guild template seed data
│   └── tracks.json               # Ambient music track metadata
│
├── scripts/                      # 35 utility scripts
│   ├── migrate.ts                # Database migration runner
│   ├── batch-generate-lessons.ts # AI lesson generation
│   ├── seed-elite-varieties.ts   # Variety seeding
│   ├── seed-guilds.ts            # Guild seeding
│   ├── make-admin.ts             # Admin role assignment
│   └── test-*.ts                 # Various test scripts
│
├── __tests__/                    # Test files (Vitest + Testing Library)
├── test/                         # Test helpers (mock-db, mock-session)
├── types/                        # Shared type definitions
├── migrations/                   # Additional migration files
├── public/                       # Static assets
└── docs/                         # Extensive documentation (90+ files)
    ├── plans/                    # Design docs and implementation plans
    ├── testing/                  # Testing checklists and reports
    ├── grants/                   # Grant analysis documents
    └── future-improvements/      # Future feature designs
```

---

## 4. DATABASE SCHEMA

### Engine: Turso (libSQL) — Serverless SQLite

**Connection:**
```typescript
import { createClient } from '@libsql/client';
export const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});
```

### Core Tables (from schema.sql + 40+ migrations)

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `users` | User accounts (Better Auth) | id, email, name, image, password |
| `sessions` | Auth sessions | id, user_id, expires_at |
| `farms` | Farm properties | id, user_id, name, acres, climate_zone, center_lat/lng, is_public |
| `zones` | Drawn map features (polygons) | id, farm_id, zone_type, geometry (GeoJSON), layer_ids, phase_id, catchment_properties, swale_properties |
| `species` | Plant database (300+) | id, common_name, scientific_name, layer, native_regions, hardiness_zones, permaculture_functions, companion_plants, edible_parts |
| `plantings` | Individual plant placements | id, farm_id, species_id, lat/lng, planted_year, layer_ids, phase_id |
| `ai_conversations` | AI chat threads | id, farm_id, title |
| `ai_analyses` | AI chat messages | id, conversation_id, user_query, screenshot_data, ai_response, model |
| `map_snapshots` | Map screenshots | id, farm_id, url, snapshot_type |
| `farm_collaborators` | Sharing/collaboration | farm_id, user_id, role (owner/editor/viewer) |
| `regional_knowledge` | Community knowledge | region, climate_zone, knowledge_type, content |
| `farmer_goals` | Farm goals/objectives | farm_id, goal_category, priority, timeline, status |

### Extended Tables (via migrations)

| Table | Purpose |
|-------|---------|
| `lines` | Line features (paths, fences, water lines) with water_properties |
| `design_layers` | Custom layer organization |
| `phases` | Implementation timeline phases |
| `guilds` / `guild_templates` | Companion planting groups |
| `annotations` / `media_attachments` | Design annotations with rich text + media |
| `comments` | Farm comments |
| `farm_posts` / `post_reactions` / `post_comments` | Social feed system |
| `farm_story_sections` | Farm narrative story builder |
| `farm_journal_entries` | Date-based journal |
| `learning_paths` / `lessons` / `topics` / `user_progress` / `badges` | Learning system |
| `practice_farms` | Sandbox farms for learning |
| `shop_products` / `cart_items` / `shop_orders` | Marketplace |
| `plant_varieties` | Cultivar/variety data |
| `species_content` / `species_videos` / `species_affiliate_links` | Extended species info |
| `species_community_tips` / `species_edits` | Community contributions |
| `knowledge_chunks` | RAG system chunks from PDF processing |
| `blog_posts` / `blog_topic_queue` | Blog system |
| `admin_content_generations` | AI content generation tracking |
| `ai_model_catalog` / `model_settings` | AI model configuration |
| `user_follows` / `user_profiles` | Social profiles |
| `collections` / `collection_items` | Gallery collections |
| `password_reset_tokens` | Password recovery |

### Key Design Decisions
- **IDs:** `crypto.randomUUID()` stored as TEXT
- **Timestamps:** INTEGER (Unix epoch) using `unixepoch()` default
- **Geometry:** GeoJSON stored as TEXT, parsed at application layer
- **JSON fields:** Stored as TEXT, parsed with `JSON.parse()` on read
- **Parameterized queries:** Always use `args` array, never interpolate user input

---

## 5. API ROUTES (143 endpoints)

### AI System
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/ai/analyze` | POST | AI vision analysis (dual screenshot + RAG + multi-model fallback) |
| `/api/ai/chat` | POST | AI text chat with farm context |
| `/api/ai/cache-stats` | GET | Response cache statistics |

### Farm Management
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/farms` | GET/POST | List user farms / Create farm |
| `/api/farms/[id]` | GET/PUT/DELETE | Farm CRUD |
| `/api/farms/[id]/zones` | GET/POST | Zone management |
| `/api/farms/[id]/zones/[zoneId]/layers` | PUT | Zone layer assignment |
| `/api/farms/[id]/zones/[zoneId]/water-properties` | PUT | Water feature properties |
| `/api/farms/[id]/plantings` | GET/POST | Planting management |
| `/api/farms/[id]/plantings/[plantingId]` | PUT/DELETE | Individual planting |
| `/api/farms/[id]/lines` | GET/POST | Line features (paths, fences) |
| `/api/farms/[id]/lines/[lineId]/water-properties` | PUT | Water line properties |
| `/api/farms/[id]/layers` | GET/POST | Design layer management |
| `/api/farms/[id]/phases` | GET/POST | Implementation phases |
| `/api/farms/[id]/guilds` | GET/POST | Guild management |
| `/api/farms/[id]/goals` | GET/POST | Farmer goals |
| `/api/farms/[id]/conversations` | GET/POST | AI conversation threads |
| `/api/farms/[id]/annotations` | GET/POST | Design annotations |
| `/api/farms/[id]/comments` | GET/POST | Farm comments |
| `/api/farms/[id]/export/pdf` | POST | PDF export |
| `/api/farms/[id]/imagery` | GET/POST | Custom aerial imagery |
| `/api/farms/[id]/native-species` | GET | Native species for farm location |
| `/api/farms/[id]/story` | GET/POST | Farm story sections |
| `/api/farms/[id]/feed` | GET | Farm activity feed |
| `/api/farms/[id]/follow` | POST | Follow/unfollow farm |
| `/api/farms/[id]/posts` | GET/POST | Farm posts (social feed) |

### Water Management
| Endpoint | Purpose |
|----------|---------|
| `/api/farms/[id]/water/calculate-catchment` | Catchment area calculation |
| `/api/farms/[id]/water/calculate-swale-volume` | Swale volume estimation |

### Species Database
| Endpoint | Purpose |
|----------|---------|
| `/api/species` | List/search species |
| `/api/species/[id]` | Species detail |
| `/api/species/[id]/varieties` | Plant varieties |
| `/api/species/[id]/tips` | Community growing tips |
| `/api/species/[id]/community` | Community contributions |
| `/api/species/[id]/generate-content` | AI content generation |
| `/api/species/[id]/videos` | Educational videos |
| `/api/species/[id]/products` | Related products |
| `/api/species/batch-generate` | Batch AI content generation |
| `/api/varieties/[id]` | Variety detail |

### Social & Community
| Endpoint | Purpose |
|----------|---------|
| `/api/feed/global` | Global activity feed |
| `/api/feed/following` | Following feed |
| `/api/feed/saved` | Saved/bookmarked posts |
| `/api/feed/trending-hashtags` | Trending topics |
| `/api/posts/[postId]/reactions` | Post reactions |
| `/api/posts/[postId]/comments` | Post comments |
| `/api/posts/[postId]/save` | Bookmark post |
| `/api/posts/[postId]/share` | Share post |
| `/api/users/[id]/follow` | Follow/unfollow user |
| `/api/users/[id]/followers` | User followers |
| `/api/users/[id]/following` | User following |
| `/api/collections` | Gallery collections CRUD |
| `/api/community/feed` | Community feed |

### Learning System
| Endpoint | Purpose |
|----------|---------|
| `/api/learning/paths` | Learning path list |
| `/api/learning/paths/[slug]` | Path detail |
| `/api/learning/paths/[slug]/enroll` | Enroll in path |
| `/api/learning/lessons/[slug]` | Lesson detail |
| `/api/learning/lessons/[slug]/complete` | Mark lesson complete |
| `/api/learning/lessons/[slug]/personalize` | AI-personalized lesson |
| `/api/learning/topics` | Topic list |
| `/api/learning/ai-tutor` | AI tutor endpoint |
| `/api/learning/badges` | Badge list |
| `/api/learning/progress` | User progress |
| `/api/learning/practice-farms` | Practice farm sandbox |
| `/api/learning/contextual-hints` | Context-aware hints |
| `/api/learning/wizard-recommendations` | Path recommendations |

### Shop / Marketplace
| Endpoint | Purpose |
|----------|---------|
| `/api/shops` | Shop listing |
| `/api/shops/[farmId]` | Shop detail |
| `/api/shops/[farmId]/products` | Product CRUD |
| `/api/shops/[farmId]/settings` | Shop settings |
| `/api/cart` | Shopping cart |
| `/api/orders` | Order management |

### Auth & User
| Endpoint | Purpose |
|----------|---------|
| `/api/auth/login` / `sign-in` | Login |
| `/api/auth/register` | Registration |
| `/api/auth/logout` / `sign-out` | Logout |
| `/api/users/me` | Current user profile |
| `/api/users/me/avatar` / `cover` | Profile images |
| `/api/upload` / `upload/photo` | File uploads |
| `/api/search` | Universal cross-entity search |

### Admin
| Endpoint | Purpose |
|----------|---------|
| `/api/admin/users/[id]` | User management |
| `/api/admin/ai-models` | AI model catalog |
| `/api/admin/model-settings` | Model configuration |
| `/api/admin/content/generate` | AI content generation |
| `/api/admin/run-migration` | Run database migrations |

### Blog
| Endpoint | Purpose |
|----------|---------|
| `/api/blog/posts` | Blog post CRUD |
| `/api/blog/auto-generate` | Auto blog generation |
| `/api/blog/recent` | Recent posts |

---

## 6. FEATURE INVENTORY (What Is Actually Built)

### Map Editor (Core)
- **Interactive satellite/topo map** via MapLibre GL JS with multiple tile sources (ESRI Satellite, USGS Topo, OpenTopoMap, OpenStreetMap, OpenFreeMap)
- **21 zone types**: Permaculture zones 0-5, water features (pond, swale, water_body, water_flow), structures, paths, fences, food forests, silvopasture, alley cropping, windbreaks, annual gardens, orchards, pastures, woodlands
- **Drawing tools**: Polygons, lines, points, circles via Mapbox GL Draw
- **Measurement grid**: 50ft/25m grid with alphanumeric labels (A1, B2, etc.)
- **Enhanced zoom (18-21)**: Progressive satellite fade, snap-to-grid at zoom 20+, fine grid subdivision (10ft/5m)
- **Custom imagery upload**: Aerial photo overlay with georeferencing and opacity control
- **Farm boundary**: Protected polygon with area calculation

### Map Editor Variants
1. **Classic Editor** (`FarmEditorClient`) — Original sidebar-based layout
2. **Immersive Editor** (`ImmersiveMapEditor`) — Full-screen experience with collapsible header, floating panels
3. **Unified Canvas** (`canvas/`) — Newer unified editor with context-based state management

Feature flag: `NEXT_PUBLIC_USE_IMMERSIVE_EDITOR`

### AI Vision Analysis
- **Dual-screenshot capture**: Satellite view + USGS topographic view captured simultaneously
- **Multi-model fallback**: 5 free models + 1 paid fallback via OpenRouter
- **RAG integration**: 13 permaculture PDFs auto-processed, 5 relevant chunks retrieved per query
- **Farm context compression**: All farm data compressed to <2000 tokens for AI context
- **Response caching**: Content hash-based LRU cache
- **Rate limiting**: 20 requests/hour/user
- **AI sketch generation**: 2-stage process for design visualization
- **Persistent conversations**: Threaded AI discussions per farm

### AI Pipeline (lib/ai/)
| File | Purpose |
|------|---------|
| `openrouter.ts` | OpenRouter client (OpenAI-compatible) |
| `prompts.ts` | Permaculture system prompt (~1,500 words) |
| `context-compressor.ts` | Farm data compression for AI context |
| `context-manager.ts` | Conversation context management |
| `goals-context.ts` | Farmer goal integration into AI context |
| `rag-context.ts` | RAG chunk retrieval for AI queries |
| `rate-limit.ts` | Per-user rate limiting |
| `response-cache.ts` | LRU response caching |
| `screenshot-optimizer.ts` | Screenshot compression/optimization |
| `optimized-analyze.ts` | Optimized analysis pipeline |
| `model-settings.ts` | Model selection and configuration |
| `guild-prompter.ts` | Guild/companion suggestion prompts |
| `sketch-generator.ts` | AI-powered design sketch generation |
| `species-content-generator.ts` | AI species content generation |
| `json-utils.ts` | JSON parsing utilities for AI responses |

### RAG Knowledge Base (lib/rag/)
- **Auto-scanner**: Watches `data/knowledge/` for new PDFs
- **Document processor**: Extracts text, chunks into ~500-token segments
- **Embedding generator**: Vector embeddings for semantic search (API-dependent)
- **Semantic search**: Retrieves relevant chunks for AI context
- **13 permaculture texts**: Gaia's Garden, Restoration Agriculture, Sepp Holzer's Permaculture, etc.

### Species Database
- **300+ species** with permaculture-specific data
- 8 canopy layers: canopy, understory, shrub, herbaceous, groundcover, vine, root, aquatic
- Native region matching, USDA hardiness zones
- Permaculture functions, companion plants, edible parts
- Community tips with voting
- AI-generated content (descriptions, growing guides)
- Plant variety/cultivar management
- Species videos, affiliate links

### Water Management
- **Catchment calculator**: Rainfall × area = water capture volume
- **Swale designer**: Volume estimation for earthwork features
- **Flow animation**: Animated water flow visualization on map
- **Water properties**: Per-zone/line water feature configuration
- **Contour analysis**: AI reads topo contour lines for water infrastructure placement

### Guild / Companion Planting
- **Guild templates**: Pre-built companion planting groups
- **AI-suggested companions**: Context-aware companion recommendations
- **Spacing rules**: Plant spacing within guilds

### Learning System
- **6 learning paths** with progressive curriculum
- **100+ lessons** (AI-generated with human review)
- **Topics**: Organized by subject area
- **Badges**: Gamification/achievement system
- **AI tutor**: Contextual AI assistance while learning
- **Practice farms**: Sandbox environments for learning
- **Contextual hints**: Context-aware help based on user actions
- **User progress tracking**: Lesson completion, path enrollment

### Social / Community
- **Social feed**: Global, following, saved views
- **Posts**: Text + media, reactions (like, love, leaf, etc.), comments
- **Bookmarks**: Save posts for later
- **User profiles**: Bio, avatar, cover photo, followers/following
- **Collections**: Curated farm collections in gallery
- **Trending hashtags**: Discover popular topics

### Farm Story Builder
- **Narrative sections**: Origin story, values, seasonal rhythms, products
- **Section reordering** via drag-and-drop
- **AI story generation** assistance
- **Public publishing** to gallery

### Journal System
- **Date-based entries** with weather data
- **Tags and media** support
- **Sharing to feed** capability

### Annotation System
- **Design rationale** annotations on map features
- **Rich text** editing via TipTap (ProseMirror)
- **Media attachments**: Photos and files
- **External links**: Reference materials

### Phasing / Timeline
- **Multi-year implementation phases** (Year 1, Year 2-3, Year 5+)
- **Color-coded phases** on map
- **Zone/planting assignment** to phases
- **Timeline visualization**

### Time Machine / Growth Simulation
- **Sigmoid growth curves** based on species years_to_maturity
- **Timeline slider**: Visualize farm at different growth stages
- **Canopy spread** visualization over time

### Export System
- **PDF reports**: Full farm design document via PDFKit
- **KML export**: For GIS tools and Google Earth
- **Markdown export**: Text-based farm documentation

### Design Layer System
- **Custom layers**: Organize features by user-defined layers
- **Layer visibility** toggling
- **Layer assignment** for zones, plantings, lines

### Farm Shop / Marketplace (Partially Built)
- **Product listings**: CRUD for farm products
- **Shop settings**: Farm-level shop configuration
- **Shopping cart**: Cart management
- **Order system**: Basic order tracking
- **Gap**: Stripe Connect not wired (no payment processing)

### Ambient Sound / Music
- **Ambient nature sounds** for immersive experience
- **Track metadata** in `data/tracks.json`
- **Compact music controller** UI

### Admin Dashboard
- **User management**: List, view, role assignment, password reset
- **AI model catalog**: Configure available models
- **Content studio**: AI-powered content generation for lessons/species
- **Blog management**: Create, edit, auto-generate blog posts
- **Analytics**: Platform-level metrics

### Universal Search
- Cross-entity search across farms, species, posts, lessons
- Keyboard accessible
- `/api/search` endpoint

### Offline Support
- **IndexedDB queue** for offline operations
- **Workbox** service worker for PWA caching
- **Online status detection** hook
- **Sync on reconnect**

---

## 7. MAP UTILITIES (lib/map/)

| File | Purpose |
|------|---------|
| `zone-types.ts` | 21 zone type definitions with colors and labels |
| `line-types.ts` | Line feature types (paths, fences, water lines) |
| `measurement-grid.ts` | Grid generation with subdivision support |
| `zone-grid-calculator.ts` | Map zones to grid cells |
| `snap-to-grid.ts` | Snap-to-grid at zoom 20+ |
| `zoom-enhancements.ts` | Progressive zoom enhancements (18-21) |
| `water-flow-animation.ts` | Water flow visualization |
| `circle-helper.ts` | Circle drawing tool |
| `feature-search.ts` | Case-insensitive feature search |
| `feature-grouping.ts` | Group features by type, layer, or phase |

### Enhanced Zoom Thresholds
- **Zoom 1-18**: Standard satellite + design mode
- **Zoom 18+**: Precision mode with progressive enhancements
- **Zoom 19+**: Design mode emphasized (satellite fades, grid thickens)
- **Zoom 20+**: Fine grid subdivision (50ft→10ft, 25m→5m) + snap-to-grid
- **Zoom 21**: Maximum precision

### Keyboard Shortcuts
- `S` — Toggle snap-to-grid
- `Shift` (hold) — Temporarily disable snap while drawing
- `H` — Show help menu

---

## 8. CODING STANDARDS

### TypeScript
- Strict mode enabled
- Types defined in `lib/db/schema.ts` matching database tables
- Zod for API input validation
- Prefer `interface` over `type` for object shapes

### React Components
- Server Components by default
- `'use client'` only when needed (interactivity, hooks)
- Colocate component-specific types in same file
- Use `cn()` utility for conditional Tailwind classes

### API Routes
- Next.js Route Handlers (app/api)
- Return `Response.json()` for data
- Handle errors with appropriate status codes
- Validate input with Zod before database operations
- Always verify farm ownership before mutations

```typescript
// Standard pattern
export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) return new Response('Unauthorized', { status: 401 });

  const body = await request.json();
  const validated = schema.parse(body);

  // Verify ownership
  const farm = await db.execute({
    sql: 'SELECT * FROM farms WHERE id = ? AND user_id = ?',
    args: [validated.farmId, session.user.id]
  });
  if (farm.rows.length === 0) return Response.json({ error: 'Not found' }, { status: 404 });

  // ... business logic
}
```

### Database Queries
- **Always** use parameterized queries (`args` array)
- **Never** interpolate user input into SQL strings
- Return `rows` from `db.execute()`, handle empty results
- IDs via `crypto.randomUUID()`
- Timestamps as INTEGER (Unix epoch)

### Map Components
- MapLibre instance stored in a ref
- `useEffect` for map initialization and cleanup
- `preserveDrawingBuffer: true` for screenshot capture
- GeoJSON stored as TEXT in database, parsed on read

### Security
- Validate farm ownership before any mutation
- Sanitize GeoJSON input
- Rate limit AI endpoint (20 req/hour/user)
- Never expose API keys to client
- Zod validation on all API inputs

---

## 9. ENVIRONMENT VARIABLES

### Required
```
TURSO_DATABASE_URL=libsql://...
TURSO_AUTH_TOKEN=...
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=http://localhost:3000
OPENROUTER_API_KEY=sk-or-...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Optional (Storage)
```
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=permaculture-studio-snapshots
R2_PUBLIC_URL=...
```

### Feature Flags
```
NEXT_PUBLIC_USE_IMMERSIVE_EDITOR=true|false
NEXT_PUBLIC_USE_REDESIGNED_INFO_SHEET=true|false
```

---

## 10. COMMON COMMANDS

```bash
npm run dev          # Start development server (Next.js)
npm run build        # Run migrations + build for production
npm run migrate      # Run database migrations only
npm run start        # Start production server
npm run lint         # Run ESLint
npm run test         # Run tests with Vitest
```

### Database
```bash
turso db shell permaculture-studio              # Interactive SQL shell
turso db tokens create permaculture-studio      # Generate new auth token
```

### Utilities
```bash
npx tsx scripts/migrate.ts                      # Run migrations
npx tsx scripts/make-admin.ts                   # Assign admin role
npx tsx scripts/seed-guilds.ts                  # Seed guild templates
npx tsx scripts/seed-elite-varieties.ts         # Seed plant varieties
npx tsx scripts/batch-generate-lessons.ts       # Generate lessons via AI
npx shadcn@latest add [component]              # Add shadcn component
```

---

## 11. AI PROMPT GUIDELINES

When generating AI prompts for permaculture analysis:

1. **Always include site context**: acres, climate zone, rainfall, soil types
2. **Reference specific map locations**: Use grid coordinates ("A3", "the southeast corner")
3. **Suggest species with scientific names**: Common Name (*Genus species*)
4. **Mark native status**: [NATIVE], [NATURALIZED], [NON-NATIVE]
5. **Include implementation timeline**: Year 1, Year 2-3, Year 5+
6. **Connect to permaculture principles**: Explain *why* a suggestion follows permaculture ethics
7. **Acknowledge existing plantings**: Don't suggest duplicates
8. **Reference terrain features**: Slope, aspect, drainage, contour patterns
9. **Include guild recommendations**: Suggest companion plants, not isolated species

---

## 12. KNOWN LIMITATIONS

- **OpenRouter free models** may have rate limits; multi-model fallback mitigates this
- **Satellite tiles** stop loading beyond zoom 18 (tiles frozen/reused at higher zooms)
- **Stripe not connected** — Marketplace can't process payments
- **Semantic search** — RAG chunk storage works but no embeddings API connected
- **Real-time collaboration** requires WebSocket infrastructure (not yet built)
- **SSURGO soil data** API integration planned but not built
- **Test coverage is thin** — ~15 test files for 78K lines of code
- **Single developer** — Git history suggests 1-2 active contributors
- **Zero documented real-world deployments** — No farmer pilot data yet
- **AI sketch generation** — 2-stage process exists but gives inconsistent results
- **Grid regeneration** debounced (150ms) to prevent performance issues during rapid zoom

---

## 13. ARCHITECTURE DIAGRAM

```
┌──────────────────────────────────────────────────────────┐
│                     User Browser                          │
│  ┌───────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Map Interface  │  │  AI Chat     │  │  Dashboard   │  │
│  │ (MapLibre GL)  │  │  Panel       │  │  + Gallery   │  │
│  │ + Draw Tools   │  │  + RAG       │  │  + Learning  │  │
│  └───────────────┘  └──────────────┘  └──────────────┘  │
│          ↕ IndexedDB (offline queue)                      │
└──────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────┐
│              Next.js 14 App (Vercel)                      │
│  ┌──────────────────────────────────────────────────┐    │
│  │              App Router (RSC)                      │    │
│  │  • 47 page routes (Server + Client Components)    │    │
│  │  • 143 API routes (serverless functions)           │    │
│  │  • Middleware (auth, edge)                         │    │
│  └──────────────────────────────────────────────────┘    │
│                                                           │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │ AI Pipeline  │  │ RAG System   │  │ Export System   │  │
│  │ • Dual       │  │ • 13 PDFs    │  │ • PDF (PDFKit) │  │
│  │   screenshot │  │ • Chunking   │  │ • KML          │  │
│  │ • Multi-     │  │ • Retrieval  │  │ • Markdown     │  │
│  │   model      │  │              │  │                │  │
│  │ • Caching    │  │              │  │                │  │
│  │ • Rate limit │  │              │  │                │  │
│  └─────────────┘  └──────────────┘  └────────────────┘  │
└──────────────────────────────────────────────────────────┘
      │                │                │              │
      ▼                ▼                ▼              ▼
┌──────────┐  ┌──────────────┐  ┌──────────┐  ┌──────────┐
│ Turso DB │  │  OpenRouter   │  │ Cloudflare│  │  Sentry  │
│ (libSQL) │  │  (AI API)    │  │ R2        │  │ (Errors) │
│ 50+ tbls │  │  Multi-model │  │ (Storage) │  │          │
└──────────┘  └──────────────┘  └──────────┘  └──────────┘
```

---

## 14. KEY FILES REFERENCE

These files are the most important to understand when working on the codebase:

| File | Lines | Purpose |
|------|-------|---------|
| `components/map/farm-map.tsx` | 880+ | Main map component with all integrations |
| `app/api/ai/analyze/route.ts` | 878+ | AI vision analysis pipeline |
| `lib/ai/prompts.ts` | ~200 | Permaculture system prompt |
| `lib/ai/context-compressor.ts` | ~150 | Farm context compression for AI |
| `lib/ai/openrouter.ts` | ~30 | OpenRouter client configuration |
| `lib/db/schema.sql` | 184 | Core database schema |
| `lib/db/schema.ts` | ~200 | TypeScript type definitions |
| `lib/db/index.ts` | ~10 | Database client initialization |
| `lib/map/zone-types.ts` | ~200 | Zone type definitions |
| `lib/map/zoom-enhancements.ts` | ~150 | Enhanced zoom utilities |
| `lib/map/measurement-grid.ts` | ~200 | Grid generation |
| `components/immersive-map/immersive-map-editor.tsx` | — | Immersive editor main component |
| `components/map/feature-list-panel.tsx` | — | Feature manager/navigator |
| `contexts/immersive-map-ui-context.tsx` | — | Immersive editor state management |
| `lib/auth/index.ts` | — | Better Auth configuration |
| `app/(app)/layout.tsx` | — | App shell with sidebar |
| `tailwind.config.ts` | 200+ | Tailwind theme configuration |

---

## 15. TESTING

### Stack
- **Vitest** — Unit and integration tests
- **Testing Library** — Component testing (@testing-library/react)
- **Playwright** — E2E testing (devDependency installed)
- **Happy DOM** — DOM environment for tests

### Test Structure
```
__tests__/
├── api/
│   ├── cart/route.test.ts
│   ├── journal/entries.test.ts
│   └── orders/route.test.ts
├── components/
│   ├── annotations/media-gallery.test.tsx
│   ├── farm/journal-list-panel.test.tsx
│   └── shop/cart-sheet.test.tsx
└── lib/map/
    ├── feature-grouping.test.ts
    └── feature-search.test.ts

test/
├── helpers/
│   ├── mock-db.ts
│   └── mock-session.ts
└── setup.ts

lib/ai/
├── context-compressor.test.ts
├── response-cache.test.ts
└── screenshot-optimizer.test.ts
```

### Running Tests
```bash
npm run test          # Run all tests
npx vitest run        # Single run (no watch)
npx vitest --ui       # Visual UI
```

---

## 16. DEPLOYMENT

### Vercel Configuration
- `vercel.json` with project settings
- Build command: `tsx scripts/migrate.ts && next build` (runs migrations before build)
- `next.config.js` with Sentry integration and webpack configuration
- Environment variables set in Vercel dashboard

### Edge vs Node Runtime
- **Edge**: Middleware, some API routes (auth checks)
- **Node.js**: Database operations, R2 uploads, AI API calls, PDF generation

### Performance
- React Server Components for initial page loads
- Lazy load MapLibre (large library)
- LRU cache for AI responses
- R2 public URLs for screenshots (no proxying)
- Workbox for PWA caching

---

*This document provides comprehensive context for LLM-assisted development on the Permaculture.Studio codebase. Keep it updated as the project evolves.*
