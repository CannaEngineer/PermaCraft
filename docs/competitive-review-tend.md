# Competitive Review: PermaCraft vs Tend.com

**Date:** 2026-03-07
**Competitor:** Tend (tend.com) — Free Tier Features

---

## Feature-by-Feature Comparison

| # | Tend Feature | PermaCraft Status | Gap | Priority |
|---|-------------|-------------------|-----|----------|
| 1 | No acreage or crop limits | **HAVE** | None — unlimited farms, zones, plantings | — |
| 2 | Advanced crop & production planning | **HAVE** | Crop plans with seasonal scheduling, sow/transplant/harvest dates, yield tracking, harvest logs. `/farm/[id]/plan` | CLOSED |
| 3 | 39,000+ crop & variety templates | **PARTIAL** | ~350 species + `plant_varieties` table with cultivar/hybrid/heirloom support. Community contributions enabled. USDA bulk import next. | MEDIUM |
| 4 | Task & workflow management | **HAVE** | Full task board with types, priorities, due dates, recurrence support, zone/planting linking. `/farm/[id]/tasks` | CLOSED |
| 5 | Greenhouse & field operations | **GAP** | No greenhouse modeling, indoor/outdoor tracking, or operational logs | MEDIUM |
| 6 | Farm map & field layout | **HAVE** | Strong — MapLibre with zones, plantings, lines, layers, measurement grid, snap-to-grid, immersive editor. This is our competitive advantage. | — |
| 7 | Pre-built reports & dashboards | **HAVE** | Farm reports with overview metrics, species diversity charts, layer distribution, permaculture function coverage, harvest logs, health score. `/farm/[id]/reports` | CLOSED |
| 8 | Soil Health Logs | **PARTIAL** | `soil_type` on farms + regional knowledge, but no structured soil test logging (pH, NPK, organic matter over time) | MEDIUM |
| 9 | Notes & Observations with Photos | **PARTIAL** | Annotations with media exist (`/api/farms/[id]/annotations` + media upload), but UX is limited. No observation journal feed. | MEDIUM |
| 10 | Data import tools | **PARTIAL** | Species SQL seed imports exist, but no user-facing CSV/spreadsheet import for plantings, crop plans, or farm data | MEDIUM |
| 11 | Guides, tutorials & help center | **HAVE** | Learning system with lessons, paths, topics, practice farms, badges, AI tutor, contextual hints, blog. This is ahead of Tend. | — |
| 12 | iOS & Android mobile apps | **PARTIAL** | Workbox PWA support in dependencies, responsive design, but no native app store presence | LOW |
| 13 | 24/7 AI Chatbot & Community Support | **HAVE** | AI chat per-farm with vision analysis, conversations, community feed, comments, follows, galleries, collections. Ahead of Tend. | — |

---

## Where We're Ahead of Tend

1. **AI-Powered Design Analysis** — Vision AI analyzes map screenshots and gives permaculture-specific recommendations. Tend's AI is limited to 25 automation credits/month on free tier.
2. **Interactive Map Editor** — Full-featured MapLibre map with zone drawing, measurement grid, snap-to-grid, precision zoom (up to z21), water systems, guild management. Far beyond Tend's static "farm map."
3. **Learning System** — Structured learning paths, lessons, practice farms, badges, AI tutor, contextual hints. Tend has none of this.
4. **Community Platform** — Gallery, collections, following, trending, farm stories, comments, reactions. Social permaculture network.
5. **Permaculture-Native Design** — Zone types, species layers (canopy→root), guild templates, food forest planning, native species prioritization. Tend is generic agriculture.
6. **Growth Simulation** — Timeline slider with sigmoid growth curves. Visualize farm 5-10 years out.
7. **Farm Story Builder** — Narrative storytelling for farm designs with AI generation.
8. **Farm Shop/Marketplace** — Product listings, cart, checkout for farm-direct sales.

---

## Critical Gaps to Close

### 1. Crop & Production Planning System (HIGH PRIORITY)

**What Tend has:** Structured crop planning with planting dates, expected harvests, production schedules.

**What we need:**

```
New tables:
- crop_plans (id, farm_id, season, year, status)
- crop_plan_items (id, crop_plan_id, species_id, zone_id, planned_sow_date, planned_transplant_date, planned_harvest_date, quantity, unit, expected_yield, actual_yield, notes)
- harvest_logs (id, farm_id, planting_id, harvest_date, quantity, unit, quality_rating, notes)
```

**Implementation:**
- New `/app/(app)/farm/[id]/plan/page.tsx` — Calendar/Gantt view of crop plan
- Planting calendar component with drag-to-schedule
- Harvest tracking with yield comparisons
- AI-powered planting date suggestions based on climate zone
- Season-over-season comparison reports

**Effort:** ~2-3 weeks

---

### 2. Species & Variety Database Expansion (HIGH PRIORITY)

**What Tend has:** 39,000+ crops and varieties preloaded.

**What we need:**
- Expand from ~350 to 5,000+ species as a first milestone
- Add variety/cultivar support to the species table
- Allow community contributions with moderation

```sql
-- Add to species table
ALTER TABLE species ADD COLUMN parent_species_id TEXT REFERENCES species(id);
ALTER TABLE species ADD COLUMN variety_name TEXT;
ALTER TABLE species ADD COLUMN days_to_maturity INTEGER;
ALTER TABLE species ADD COLUMN planting_depth_inches REAL;
ALTER TABLE species ADD COLUMN spacing_inches REAL;
ALTER TABLE species ADD COLUMN companion_species TEXT; -- JSON array of species_ids
ALTER TABLE species ADD COLUMN antagonist_species TEXT; -- JSON array of species_ids
```

**Implementation:**
- Bulk import from USDA PLANTS database (public domain, ~40,000 species)
- Variety/cultivar as child records of base species
- Enhanced species picker with variety selection
- Community species submission + admin moderation workflow

**Effort:** ~1-2 weeks for schema + import, ongoing for community curation

---

### 3. Task & Workflow Management (HIGH PRIORITY)

**What Tend has:** Task assignment, workflow management, scheduling.

**What we need:**

```sql
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  farm_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT, -- 'planting', 'watering', 'harvesting', 'maintenance', 'observation', 'custom'
  status TEXT DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'skipped'
  priority INTEGER DEFAULT 3,
  due_date INTEGER,
  completed_at INTEGER,
  assigned_to TEXT, -- user_id for collaborator farms
  related_planting_id TEXT,
  related_zone_id TEXT,
  recurrence TEXT, -- JSON: {pattern: 'weekly', interval: 1, end_date: ...}
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE
);
```

**Implementation:**
- New `/app/(app)/farm/[id]/tasks/page.tsx` — Task board (kanban or list view)
- Dashboard widget showing upcoming tasks
- AI-generated task suggestions based on season + plantings
- Push notifications for due tasks (via PWA)
- Recurring task support (water weekly, fertilize monthly)
- Link tasks to specific plantings/zones on the map

**Effort:** ~2 weeks

---

### 4. Reports & Dashboards (HIGH PRIORITY)

**What Tend has:** Pre-built reports and dashboards.

**What we need:**
- Farm overview dashboard with key metrics
- Seasonal planting report
- Harvest yield report
- Species diversity report
- Zone utilization report
- PDF export (we already have pdfkit in deps!)

**Implementation:**
- New `/app/(app)/farm/[id]/reports/page.tsx` — Report hub
- Chart components using d3-scale (already in deps)
- PDF generation via existing pdfkit dependency
- Scheduled email summaries (Phase 2)

**Effort:** ~1-2 weeks

---

### 5. Soil Health Logs (MEDIUM PRIORITY)

**What Tend has:** Soil health logging.

**What we need:**

```sql
CREATE TABLE soil_logs (
  id TEXT PRIMARY KEY,
  farm_id TEXT NOT NULL,
  zone_id TEXT,
  test_date INTEGER NOT NULL,
  ph REAL,
  nitrogen_ppm REAL,
  phosphorus_ppm REAL,
  potassium_ppm REAL,
  organic_matter_pct REAL,
  moisture_pct REAL,
  texture TEXT, -- 'clay', 'loam', 'sand', 'silt', etc.
  notes TEXT,
  photo_url TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE,
  FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE SET NULL
);
```

**Implementation:**
- Soil test entry form with common lab result fields
- Trend charts showing pH, NPK over time per zone
- AI recommendations based on soil data + planting goals
- Integration with AI analysis (include soil data in context)

**Effort:** ~1 week

---

### 6. Greenhouse & Field Operations (MEDIUM PRIORITY)

**What Tend has:** Greenhouse and field operations tracking.

**What we need:**
- Zone type additions: `greenhouse`, `cold_frame`, `high_tunnel`, `indoor`
- Environment tracking (temperature, humidity for controlled environments)
- Operational log: irrigation events, fertilization, pest management

```sql
CREATE TABLE operation_logs (
  id TEXT PRIMARY KEY,
  farm_id TEXT NOT NULL,
  zone_id TEXT,
  planting_id TEXT,
  operation_type TEXT NOT NULL, -- 'irrigation', 'fertilization', 'pest_management', 'pruning', 'mulching', 'cover_crop'
  description TEXT,
  products_used TEXT, -- JSON [{name, quantity, unit}]
  weather_conditions TEXT,
  logged_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE
);
```

**Effort:** ~1-2 weeks

---

### 7. Enhanced Notes & Observations (MEDIUM PRIORITY)

**What we have:** Annotations API with media upload exists but is under-developed.

**What we need:**
- Journal-style observation feed (we already have `/api/journal/entries`)
- Photo gallery per farm with date/location tagging
- Weather conditions auto-capture at observation time
- Observation templates (pest sighting, growth measurement, bloom tracking)

**Effort:** ~1 week (mostly UI polish on existing backend)

---

### 8. Data Import Tools (MEDIUM PRIORITY)

**What Tend has:** Data import tools.

**What we need:**
- CSV import for plantings (species, location, date)
- CSV import for crop plans
- Import from other platforms (optional/later)
- Bulk species upload for custom/regional varieties
- Export: CSV, GeoJSON, PDF (PDF export exists for farm plans)

**Effort:** ~1 week

---

### 9. Mobile App Store Presence (LOW PRIORITY)

**What we have:** PWA dependencies (workbox), responsive design.

**What we need:**
- Complete PWA manifest with offline support
- App store listing via PWA (Google Play accepts TWAs)
- Offline mode for field use (IndexedDB sync — we already have `idb` in deps)

**Effort:** ~2 weeks for full offline + store listing

---

## Implementation Roadmap

### Sprint 1 (Weeks 1-2): Foundation
- [ ] Task management system (schema + API + basic UI)
- [ ] Soil health logs (schema + API + entry form)
- [ ] Species database expansion (USDA import + variety support)

### Sprint 2 (Weeks 3-4): Planning & Reporting
- [ ] Crop planning calendar (schema + API + calendar UI)
- [ ] Farm dashboard with key metrics
- [ ] Basic reports (planting report, diversity report)

### Sprint 3 (Weeks 5-6): Operations & Polish
- [ ] Operation logging (irrigation, fertilization, pest management)
- [ ] Enhanced observations UI (journal feed, templates)
- [ ] Data import/export (CSV plantings, crop plans)
- [ ] Greenhouse zone types

### Sprint 4 (Week 7-8): Mobile & Advanced
- [ ] PWA offline mode completion
- [ ] PDF report generation
- [ ] AI-generated task suggestions
- [ ] Harvest tracking with yield comparison

---

## Strategic Advantage Summary

Tend is a **generic farm management** tool. PermaCraft is a **permaculture design platform**. Our moat:

| Our Advantage | Their Advantage |
|--------------|----------------|
| AI vision analysis of farm designs | 39K crop database |
| Interactive map editor with precision tools | Task & workflow management |
| Growth simulation & time machine | Production planning & scheduling |
| Learning system & practice farms | Reports & dashboards |
| Community gallery & farm stories | Data import tools |
| Guild/companion planting intelligence | Soil health logging |
| Permaculture-native design philosophy | Greenhouse operations |

**Bottom line:** We need operational/management features to complement our strong design/AI/community platform. The features above would make PermaCraft a complete end-to-end permaculture platform — from design through implementation through ongoing management — which Tend cannot match on the design side.
