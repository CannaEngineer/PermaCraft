# Dashboard Redesign — Farm-First Intelligence Hub Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the existing dashboard with a farm-first intelligence hub that puts farms, seasonal awareness, tasks, AI insights, and ecological health front and centre.

**Architecture:** Server component page fetches all farm data; client components handle tab switching, task completion, and dismissible alerts. Uses the **existing `tasks` table** (migration `099_tasks.sql`) — no new table needed. Ecological health score computed from existing `plantings` + `species` data.

**Tech Stack:** Next.js 14 App Router, Turso (libSQL), Tailwind CSS, shadcn/ui, TypeScript

**Spec:** `docs/superpowers/specs/2026-03-16-dashboard-redesign.md`

---

## Chunk 1: Database — additive migration for tasks.source column

### Task 1: Add `source` column to existing `tasks` table

The `tasks` table already exists. We only need to add the `source` column if it's absent. Priority is already an INTEGER (4=urgent, 3=high, 2=medium, 1=low). Status is 'pending' | 'in_progress' | 'completed' | 'skipped'.

**Files:**
- Create: `lib/db/migrations/105_tasks_source.sql`
- Verify: `lib/db/schema.ts` has a Task interface matching real schema

- [ ] **Step 1: Check existing tasks table schema**

```bash
turso db shell permaculture-studio "PRAGMA table_info(tasks);"
```
Look for a `source` column. If it exists, skip Step 2.

- [ ] **Step 2: Write additive migration (only if `source` column is absent)**

```sql
-- lib/db/migrations/105_tasks_source.sql
ALTER TABLE tasks ADD COLUMN source TEXT NOT NULL DEFAULT 'manual';
```

- [ ] **Step 3: Run migration if needed**

```bash
turso db shell permaculture-studio < lib/db/migrations/105_tasks_source.sql
```
Expected: No errors.

- [ ] **Step 4: Verify `Task` interface in `lib/db/schema.ts` includes these fields**

The interface must have at minimum:
```typescript
export interface Task {
  id: string;
  farm_id: string;
  title: string;
  priority: number;      // 4=urgent, 3=high, 2=medium, 1=low
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  due_date: number | null;
  source: string;        // 'manual' | 'seasonal' | 'ai'
  created_at: number;
  updated_at: number;
}
```
Update the interface if fields are missing or mistyped.

- [ ] **Step 5: Commit**

```bash
git add lib/db/migrations/105_tasks_source.sql lib/db/schema.ts
git commit -m "feat: add source column to tasks table, update Task interface"
```

---

## Chunk 2: Data layer — queries and API routes

### Task 2: Dashboard data queries

**Files:**
- Create: `lib/db/queries/dashboard.ts`
- Create: `app/api/farms/[id]/tasks/route.ts` (if not exists, check first)

- [ ] **Step 1: Create `lib/db/queries/dashboard.ts`**

```typescript
import { db } from '@/lib/db';
import { FarmTask } from '@/lib/db/schema';

export interface DashboardFarm {
  id: string;
  name: string;
  description: string | null;
  acres: number | null;
  climate_zone: string | null;
  center_lat: number | null;
  center_lng: number | null;
  updated_at: number;
  planting_count: number;
  eco_health_score: number;
  latest_screenshot: string | null;
}

export async function getDashboardFarms(userId: string): Promise<DashboardFarm[]> {
  const result = await db.execute({
    sql: `
      SELECT
        f.id, f.name, f.description, f.acres, f.climate_zone,
        f.center_lat, f.center_lng, f.updated_at,
        COUNT(DISTINCT p.id) as planting_count,
        (SELECT screenshot_data FROM ai_analyses
         WHERE farm_id = f.id ORDER BY created_at DESC LIMIT 1) as latest_screenshot_json
      FROM farms f
      LEFT JOIN plantings p ON p.farm_id = f.id
      WHERE f.user_id = ?
      GROUP BY f.id
      ORDER BY f.updated_at DESC
    `,
    args: [userId],
  });

  return result.rows.map((row) => {
    let latest_screenshot: string | null = null;
    if (row.latest_screenshot_json) {
      try {
        const parsed = JSON.parse(row.latest_screenshot_json as string);
        latest_screenshot = Array.isArray(parsed) ? parsed[0] : parsed;
      } catch {}
    }
    return {
      id: row.id as string,
      name: row.name as string,
      description: row.description as string | null,
      acres: row.acres as number | null,
      climate_zone: row.climate_zone as string | null,
      center_lat: row.center_lat as number | null,
      center_lng: row.center_lng as number | null,
      updated_at: row.updated_at as number,
      planting_count: row.planting_count as number,
      eco_health_score: 0, // computed separately
      latest_screenshot,
    };
  });
}

export async function getEcoHealthScore(farmId: string): Promise<{ score: number; functions: Record<string, number> }> {
  const FUNCTIONS = [
    'nitrogen_fixer', 'pollinator', 'dynamic_accumulator',
    'wildlife_habitat', 'edible', 'medicinal', 'erosion_control', 'water_management',
  ];

  const result = await db.execute({
    sql: `
      SELECT s.permaculture_functions
      FROM plantings p
      JOIN species s ON s.id = p.species_id
      WHERE p.farm_id = ?
        AND s.permaculture_functions IS NOT NULL
    `,
    args: [farmId],
  });

  const counts: Record<string, number> = {};
  FUNCTIONS.forEach((f) => (counts[f] = 0));

  for (const row of result.rows) {
    try {
      const fns: string[] = JSON.parse(row.permaculture_functions as string);
      fns.forEach((fn) => {
        if (fn in counts) counts[fn]++;
      });
    } catch {}
  }

  const covered = FUNCTIONS.filter((f) => counts[f] > 0).length;
  const score = Math.round((covered / FUNCTIONS.length) * 100);
  return { score, functions: counts };
}

export async function getFarmTasks(farmId: string): Promise<Task[]> {
  const result = await db.execute({
    sql: `
      SELECT * FROM tasks
      WHERE farm_id = ?
        AND status NOT IN ('completed', 'skipped')
      ORDER BY priority DESC, created_at DESC
      LIMIT 20
    `,
    args: [farmId],
  });
  return result.rows as unknown as Task[];
}

export async function getUrgentTaskCount(farmId: string): Promise<number> {
  const result = await db.execute({
    sql: `SELECT COUNT(*) as count FROM tasks WHERE farm_id = ? AND priority = 4 AND status = 'pending'`,
    args: [farmId],
  });
  return (result.rows[0]?.count as number) ?? 0;
}

export async function getRecentAiInsights(farmId: string) {
  const result = await db.execute({
    sql: `
      SELECT id, ai_response, created_at, user_query
      FROM ai_analyses
      WHERE farm_id = ?
      ORDER BY created_at DESC
      LIMIT 5
    `,
    args: [farmId],
  });
  return result.rows;
}

export async function getRecentActivity(farmId: string) {
  const result = await db.execute({
    sql: `
      SELECT 'ai' as type, id, user_query as title, created_at FROM ai_analyses WHERE farm_id = ?
      UNION ALL
      SELECT 'planting' as type, id, name as title, created_at FROM plantings WHERE farm_id = ?
      ORDER BY created_at DESC
      LIMIT 10
    `,
    args: [farmId, farmId],
  });
  return result.rows;
}
```

- [ ] **Step 2: Check existing `app/api/farms/[id]/tasks/route.ts`**

This file may already exist. Read it and verify it has GET and POST handlers querying the `tasks` table (not `farm_tasks`). If it already covers what's needed, skip to Step 3.

If GET is missing or queries the wrong table, add/fix:
```typescript
// GET: list tasks for farm
const result = await db.execute({
  sql: `SELECT * FROM tasks WHERE farm_id = ? AND status NOT IN ('completed','skipped') ORDER BY priority DESC, created_at DESC LIMIT 50`,
  args: [params.id],
});
return Response.json({ tasks: result.rows });
```

- [ ] **Step 3: Check/create task toggle route `app/api/farms/[id]/tasks/[taskId]/route.ts`**

Check if PATCH handler exists. If not, create:
```typescript
import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { db } from '@/lib/db';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; taskId: string } }
) {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) return new Response('Unauthorized', { status: 401 });

  const { status } = await request.json(); // 'completed' | 'pending' etc.
  await db.execute({
    sql: `UPDATE tasks SET status = ?, completed_at = ?, updated_at = unixepoch()
          WHERE id = ? AND farm_id = ?`,
    args: [
      status,
      status === 'completed' ? Math.floor(Date.now() / 1000) : null,
      params.taskId,
      params.id,
    ],
  });
  return Response.json({ ok: true });
}
```

- [ ] **Step 4: Commit**

```bash
git add lib/db/queries/dashboard.ts app/api/farms/
git commit -m "feat: add dashboard queries and tasks API routes"
```

---

## Chunk 3: Seasonal intelligence utility

### Task 3: Seasonal computation library

**Files:**
- Create: `lib/dashboard/seasonal.ts`

No external API. Uses USDA hardiness zone → approximate frost dates table.

- [ ] **Step 1: Create `lib/dashboard/seasonal.ts`**

```typescript
export type Season = 'early_spring' | 'spring' | 'early_summer' | 'summer' | 'late_summer' | 'autumn' | 'winter';

interface FrostInfo {
  lastFrost: { month: number; day: number };   // spring
  firstFrost: { month: number; day: number };  // autumn
}

// USDA zone → approximate frost dates (northern hemisphere)
const FROST_DATES: Record<string, FrostInfo> = {
  '3a': { lastFrost: { month: 5, day: 25 }, firstFrost: { month: 9, day: 10 } },
  '3b': { lastFrost: { month: 5, day: 15 }, firstFrost: { month: 9, day: 20 } },
  '4a': { lastFrost: { month: 5, day: 10 }, firstFrost: { month: 9, day: 25 } },
  '4b': { lastFrost: { month: 5, day: 1 },  firstFrost: { month: 10, day: 1 } },
  '5a': { lastFrost: { month: 4, day: 25 }, firstFrost: { month: 10, day: 10 } },
  '5b': { lastFrost: { month: 4, day: 15 }, firstFrost: { month: 10, day: 20 } },
  '6a': { lastFrost: { month: 4, day: 10 }, firstFrost: { month: 10, day: 25 } },
  '6b': { lastFrost: { month: 4, day: 1 },  firstFrost: { month: 11, day: 1 } },
  '7a': { lastFrost: { month: 3, day: 25 }, firstFrost: { month: 11, day: 10 } },
  '7b': { lastFrost: { month: 3, day: 15 }, firstFrost: { month: 11, day: 20 } },
  '8a': { lastFrost: { month: 3, day: 10 }, firstFrost: { month: 11, day: 25 } },
  '8b': { lastFrost: { month: 2, day: 25 }, firstFrost: { month: 12, day: 1 } },
  '9a': { lastFrost: { month: 2, day: 15 }, firstFrost: { month: 12, day: 10 } },
  '9b': { lastFrost: { month: 1, day: 30 }, firstFrost: { month: 12, day: 20 } },
  '10a': { lastFrost: { month: 1, day: 15 }, firstFrost: { month: 12, day: 31 } },
  '10b': { lastFrost: { month: 1, day: 1 },  firstFrost: { month: 12, day: 31 } },
};

export interface SeasonalContext {
  season: Season;
  seasonLabel: string;
  daysToLastFrost: number | null;   // positive = frost in future, negative = past
  daysToFirstFrost: number | null;
  frostRisk: boolean;               // within 2 days of frost
  hemisphere: 'north' | 'south';
}

export function getSeasonalContext(
  climateZone: string | null,
  centerLat: number | null,
  now = new Date()
): SeasonalContext {
  const hemisphere: 'north' | 'south' = (centerLat ?? 40) >= 0 ? 'north' : 'south';
  const month = now.getMonth() + 1; // 1-12

  const season = getSeason(month, hemisphere);
  const seasonLabel = getSeasonLabel(season, now);

  const zoneKey = climateZone?.toLowerCase().replace('zone ', '').trim() ?? null;
  const frostInfo = zoneKey ? FROST_DATES[zoneKey] ?? null : null;

  let daysToLastFrost: number | null = null;
  let daysToFirstFrost: number | null = null;

  if (frostInfo && hemisphere === 'north') {
    const lastFrostDate = new Date(now.getFullYear(), frostInfo.lastFrost.month - 1, frostInfo.lastFrost.day);
    const firstFrostDate = new Date(now.getFullYear(), frostInfo.firstFrost.month - 1, frostInfo.firstFrost.day);
    daysToLastFrost = Math.round((lastFrostDate.getTime() - now.getTime()) / 86400000);
    daysToFirstFrost = Math.round((firstFrostDate.getTime() - now.getTime()) / 86400000);
  }

  const frostRisk = daysToLastFrost !== null && Math.abs(daysToLastFrost) <= 2
    || daysToFirstFrost !== null && Math.abs(daysToFirstFrost) <= 2;

  return { season, seasonLabel, daysToLastFrost, daysToFirstFrost, frostRisk, hemisphere };
}

function getSeason(month: number, hemisphere: 'north' | 'south'): Season {
  const m = hemisphere === 'north' ? month : ((month + 5) % 12) + 1;
  if (m === 12 || m <= 2) return 'winter';
  if (m === 3) return 'early_spring';
  if (m === 4) return 'spring';
  if (m === 5) return 'early_summer';
  if (m === 6 || m === 7) return 'summer';
  if (m === 8) return 'late_summer';
  return 'autumn';
}

function getSeasonLabel(season: Season, now: Date): string {
  const year = now.getFullYear();
  const labels: Record<Season, string> = {
    early_spring: `Early Spring ${year}`,
    spring: `Spring ${year}`,
    early_summer: `Early Summer ${year}`,
    summer: `Summer ${year}`,
    late_summer: `Late Summer ${year}`,
    autumn: `Autumn ${year}`,
    winter: `Winter ${year}`,
  };
  return labels[season];
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/dashboard/seasonal.ts
git commit -m "feat: add seasonal intelligence utility (frost dates, season labels)"
```

---

## Chunk 4: Dashboard UI components

### Task 4: Farm tab strip components

**Files:**
- Create: `components/dashboard/farm-tab-strip.tsx` (desktop tabs)
- Create: `components/dashboard/farm-icon-strip.tsx` (mobile icon avatars)

- [ ] **Step 1: Create `components/dashboard/farm-tab-strip.tsx`**

```typescript
'use client';
import { cn } from '@/lib/utils';
import { DashboardFarm } from '@/lib/db/queries/dashboard';
import Link from 'next/link';

interface Props {
  farms: DashboardFarm[];
  activeFarmId: string;
  onSelect: (farmId: string) => void;
}

export function FarmTabStrip({ farms, activeFarmId, onSelect }: Props) {
  return (
    <div className="flex items-end gap-2 overflow-x-auto border-b border-border bg-card px-4 pt-2 scrollbar-hide">
      {farms.map((farm) => (
        <button
          key={farm.id}
          onClick={() => onSelect(farm.id)}
          className={cn(
            'group flex-shrink-0 flex items-center gap-2 rounded-t-xl border border-b-0 px-3 py-2 transition-all min-w-[130px]',
            activeFarmId === farm.id
              ? 'border-border bg-background -mb-px'
              : 'border-transparent bg-muted/40 hover:bg-muted/70'
          )}
        >
          {/* Thumbnail */}
          <div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded-md border border-border">
            {farm.latest_screenshot ? (
              <img src={farm.latest_screenshot} alt={farm.name} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-green-900 to-green-700" />
            )}
          </div>
          <div className="min-w-0 text-left">
            <div className={cn('truncate text-xs font-bold', activeFarmId === farm.id ? 'text-foreground' : 'text-muted-foreground')}>
              {farm.name}
            </div>
            <div className="text-[10px] text-muted-foreground">
              {farm.acres ? `${farm.acres}ac · ` : ''}{farm.planting_count} plants
            </div>
          </div>
          {activeFarmId === farm.id && (
            <div className="ml-auto h-1.5 w-1.5 flex-shrink-0 rounded-full bg-green-400" />
          )}
        </button>
      ))}
      <Link
        href="/farm/new"
        className="mb-[-1px] flex-shrink-0 rounded-t-xl border border-dashed border-border px-4 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        + New farm
      </Link>
    </div>
  );
}
```

- [ ] **Step 2: Create `components/dashboard/farm-icon-strip.tsx`**

```typescript
'use client';
import { cn } from '@/lib/utils';
import { DashboardFarm } from '@/lib/db/queries/dashboard';
import Link from 'next/link';

interface Props {
  farms: DashboardFarm[];
  activeFarmId: string;
  onSelect: (farmId: string) => void;
}

export function FarmIconStrip({ farms, activeFarmId, onSelect }: Props) {
  return (
    <div className="flex items-end gap-4 overflow-x-auto border-b border-border bg-card px-4 scrollbar-hide">
      {farms.map((farm) => (
        <button
          key={farm.id}
          onClick={() => onSelect(farm.id)}
          className="flex flex-col items-center gap-1 py-2 flex-shrink-0"
        >
          <div className={cn(
            'h-11 w-11 overflow-hidden rounded-xl border-2 transition-all',
            activeFarmId === farm.id ? 'border-green-400' : 'border-border'
          )}>
            {farm.latest_screenshot ? (
              <img src={farm.latest_screenshot} alt={farm.name} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-green-900 to-green-700" />
            )}
          </div>
          <span className={cn(
            'max-w-[56px] truncate text-[10px] font-semibold',
            activeFarmId === farm.id ? 'text-foreground' : 'text-muted-foreground'
          )}>
            {farm.name}
          </span>
          {activeFarmId === farm.id && (
            <div className="h-0.5 w-full rounded-full bg-green-400" />
          )}
        </button>
      ))}
      <Link href="/farm/new" className="flex flex-col items-center gap-1 py-2 flex-shrink-0">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-dashed border-border text-lg text-muted-foreground">
          +
        </div>
        <span className="text-[10px] text-muted-foreground">Add farm</span>
      </Link>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/farm-tab-strip.tsx components/dashboard/farm-icon-strip.tsx
git commit -m "feat: add farm tab strip and mobile icon strip components"
```

### Task 5: Farm hero bar

**Files:**
- Create: `components/dashboard/farm-hero-bar.tsx`

- [ ] **Step 1: Create component**

```typescript
import { DashboardFarm } from '@/lib/db/queries/dashboard';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

const FUNCTION_LABELS: Record<string, { label: string; color: string }> = {
  nitrogen_fixer: { label: 'N-fixers', color: 'bg-green-900/60 text-green-300 border-green-800' },
  pollinator: { label: 'Pollinators', color: 'bg-yellow-900/60 text-yellow-300 border-yellow-800' },
  dynamic_accumulator: { label: 'Accumulators', color: 'bg-purple-900/60 text-purple-300 border-purple-800' },
  wildlife_habitat: { label: 'Wildlife', color: 'bg-emerald-900/60 text-emerald-300 border-emerald-800' },
  edible: { label: 'Edibles', color: 'bg-orange-900/60 text-orange-300 border-orange-800' },
  medicinal: { label: 'Medicinal', color: 'bg-red-900/60 text-red-300 border-red-800' },
  erosion_control: { label: 'Erosion ctrl', color: 'bg-amber-900/60 text-amber-300 border-amber-800' },
  water_management: { label: 'Water mgmt', color: 'bg-blue-900/60 text-blue-300 border-blue-800' },
};

interface Props {
  farm: DashboardFarm;
  ecoFunctions: Record<string, number>;
}

export function FarmHeroBar({ farm, ecoFunctions }: Props) {
  const lastEdited = formatDistanceToNow(new Date(farm.updated_at * 1000), { addSuffix: true });

  return (
    <div className="flex items-center justify-between gap-4 border-b border-border bg-background/80 px-4 py-3">
      <div className="min-w-0">
        <div className="flex items-baseline gap-2">
          <h2 className="text-base font-bold text-foreground">{farm.name}</h2>
          <span className="text-xs text-muted-foreground">
            {farm.acres ? `${farm.acres}ac · ` : ''}{farm.climate_zone ?? ''} · edited {lastEdited}
          </span>
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {Object.entries(FUNCTION_LABELS).map(([key, { label, color }]) => {
            const count = ecoFunctions[key] ?? 0;
            const isGap = count === 0;
            return (
              <span
                key={key}
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                  isGap
                    ? 'border-amber-800/60 bg-amber-950/40 text-amber-400/70'
                    : color
                }`}
              >
                {isGap ? '⚠ ' : ''}{label} {count > 0 ? count : '—'}
              </span>
            );
          })}
        </div>
      </div>
      <Link
        href={`/farm/${farm.id}`}
        className="flex-shrink-0 rounded-xl border border-green-700 bg-green-900/60 px-4 py-2 text-xs font-bold text-green-200 hover:bg-green-800/60 transition-colors"
      >
        🗺️ Open Map Editor →
      </Link>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/dashboard/farm-hero-bar.tsx
git commit -m "feat: add farm hero bar with ecological function pills"
```

### Task 6: Intelligence cards

**Files:**
- Create: `components/dashboard/intel/seasonal-card.tsx`
- Create: `components/dashboard/intel/tasks-card.tsx`
- Create: `components/dashboard/intel/ai-insights-card.tsx`
- Create: `components/dashboard/intel/eco-health-card.tsx`
- Create: `components/dashboard/intel/intelligence-row.tsx`

- [ ] **Step 1: Create `components/dashboard/intel/seasonal-card.tsx`**

```typescript
import { SeasonalContext } from '@/lib/dashboard/seasonal';

interface Props {
  seasonal: SeasonalContext;
  plantingNames?: string[];
}

export function SeasonalCard({ seasonal, plantingNames = [] }: Props) {
  const { seasonLabel, daysToLastFrost, daysToFirstFrost, frostRisk } = seasonal;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <span>🌸</span>
        <span className="text-xs font-bold text-foreground">Season</span>
      </div>
      <div className="p-3 space-y-2">
        <div className="text-xs font-semibold text-green-400">{seasonLabel}</div>
        {frostRisk && (
          <div className="rounded-md bg-amber-950/60 border border-amber-800/60 px-2 py-1 text-[10px] text-amber-300">
            ⚠ Frost risk — {Math.abs(daysToLastFrost ?? 0)} day(s)
          </div>
        )}
        {daysToLastFrost !== null && daysToLastFrost > 0 && (
          <div className="text-[10px] text-muted-foreground">Last frost: {daysToLastFrost}d away</div>
        )}
        {daysToLastFrost !== null && daysToLastFrost <= 0 && (
          <div className="text-[10px] text-green-400 font-medium">✓ Past last frost</div>
        )}
        {daysToFirstFrost !== null && daysToFirstFrost > 0 && daysToFirstFrost < 60 && (
          <div className="text-[10px] text-amber-400">First frost: {daysToFirstFrost}d away</div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `components/dashboard/intel/tasks-card.tsx`**

Note: `priority` is an INTEGER (4=urgent, 3=high, 2=medium, 1=low). `status` is a string enum.

```typescript
'use client';
import { useState } from 'react';
import { Task } from '@/lib/db/schema';
import { cn } from '@/lib/utils';

interface Props {
  tasks: Task[];
  farmId: string;
}

type Tab = 'today' | 'week' | 'season';

function priorityBadge(priority: number) {
  if (priority === 4) return <span className="rounded bg-amber-950/60 px-1 py-0.5 text-[8px] font-bold text-amber-400">Urgent</span>;
  if (priority === 3) return <span className="rounded bg-blue-950/60 px-1 py-0.5 text-[8px] font-bold text-blue-400">Today</span>;
  return null;
}

export function TasksCard({ tasks, farmId }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('today');
  const [localTasks, setLocalTasks] = useState(tasks);

  const now = Math.floor(Date.now() / 1000);
  const dayEnd = now + 86400;
  const weekEnd = now + 7 * 86400;

  const filtered = localTasks.filter((t) => {
    if (activeTab === 'today') return !t.due_date || t.due_date <= dayEnd || t.priority >= 3;
    if (activeTab === 'week') return !t.due_date || t.due_date <= weekEnd;
    return true;
  }).slice(0, 5);

  async function handleToggle(task: Task) {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    setLocalTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, status: newStatus } : t));
    await fetch(`/api/farms/${farmId}/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <span>✅</span>
        <span className="text-xs font-bold text-foreground">Tasks</span>
      </div>
      <div className="flex border-b border-border">
        {(['today', 'week', 'season'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'flex-1 py-1.5 text-[10px] font-semibold uppercase tracking-wide transition-colors',
              activeTab === tab ? 'text-green-400 border-b-2 border-green-400' : 'text-muted-foreground'
            )}
          >
            {tab}
          </button>
        ))}
      </div>
      <div className="p-2 space-y-0.5">
        {filtered.length === 0 && (
          <div className="py-3 text-center text-[10px] text-muted-foreground">No tasks — enjoy the day 🌱</div>
        )}
        {filtered.map((task) => {
          const done = task.status === 'completed';
          return (
            <button
              key={task.id}
              onClick={() => handleToggle(task)}
              className="flex w-full items-center gap-2 rounded-md px-1 py-1.5 text-left hover:bg-muted/30 transition-colors"
            >
              <div className={cn(
                'h-3.5 w-3.5 flex-shrink-0 rounded-sm border transition-all',
                done ? 'border-green-700 bg-green-800' : 'border-border'
              )}>
                {done ? <span className="block text-center text-[8px] text-green-300 leading-none pt-px">✓</span> : null}
              </div>
              <span className={cn('flex-1 text-[10px]', done ? 'line-through text-muted-foreground' : 'text-foreground')}>
                {task.title}
              </span>
              {!done && priorityBadge(task.priority)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create `components/dashboard/intel/ai-insights-card.tsx`**

```typescript
interface Insight {
  id: string;
  ai_response: string;
  created_at: number;
  user_query: string;
}

interface Props {
  insights: Insight[];
  farmId: string;
}

function categoriseInsight(response: string): 'gap' | 'opportunity' | 'insight' {
  const lower = response.toLowerCase();
  if (lower.includes('missing') || lower.includes('lack') || lower.includes('no ') || lower.includes('without')) return 'gap';
  if (lower.includes('add') || lower.includes('consider') || lower.includes('would benefit') || lower.includes('could')) return 'opportunity';
  return 'insight';
}

const CATEGORY_STYLES = {
  gap: { label: '⚠ Gap', border: 'border-l-amber-500', type: 'text-amber-400' },
  opportunity: { label: '💡 Opportunity', border: 'border-l-teal-500', type: 'text-teal-400' },
  insight: { label: '✓ Insight', border: 'border-l-green-500', type: 'text-green-400' },
};

export function AiInsightsCard({ insights, farmId }: Props) {
  const parsed = insights.slice(0, 3).map((i) => {
    const snippet = i.ai_response.slice(0, 120).replace(/\n/g, ' ');
    const category = categoriseInsight(i.ai_response);
    return { ...i, snippet, category };
  });

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <span>🤖</span>
        <span className="text-xs font-bold text-foreground">AI Insights</span>
      </div>
      <div className="p-2 space-y-1.5">
        {parsed.length === 0 && (
          <div className="py-3 text-center text-[10px] text-muted-foreground">No analyses yet — open the map and ask AI</div>
        )}
        {parsed.map((item) => {
          const style = CATEGORY_STYLES[item.category];
          return (
            <div key={item.id} className={`rounded-md bg-muted/30 border-l-2 ${style.border} p-2`}>
              <div className={`text-[9px] font-bold uppercase tracking-wide mb-1 ${style.type}`}>{style.label}</div>
              <div className="text-[10px] text-foreground/80 leading-relaxed line-clamp-2">{item.snippet}…</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create `components/dashboard/intel/eco-health-card.tsx`**

```typescript
const FUNCTION_META: Record<string, { label: string; color: string }> = {
  nitrogen_fixer: { label: 'Nitrogen', color: '#4caf50' },
  pollinator: { label: 'Pollinators', color: '#ffc107' },
  dynamic_accumulator: { label: 'Accum.', color: '#9c27b0' },
  wildlife_habitat: { label: 'Wildlife', color: '#00bcd4' },
  edible: { label: 'Edibles', color: '#ff9800' },
  medicinal: { label: 'Medicinal', color: '#f44336' },
  erosion_control: { label: 'Erosion', color: '#795548' },
  water_management: { label: 'Water', color: '#2196f3' },
};

interface Props {
  score: number;
  functions: Record<string, number>;
}

export function EcoHealthCard({ score, functions }: Props) {
  const missing = Object.entries(functions).filter(([, v]) => v === 0).length;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <span>🌍</span>
        <span className="text-xs font-bold text-foreground">Eco Health</span>
      </div>
      <div className="p-3">
        <div className="mb-1 text-2xl font-black text-green-400 leading-none">
          {score}<span className="text-xs font-normal text-muted-foreground">/100</span>
        </div>
        <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-green-700 to-green-400 transition-all"
            style={{ width: `${score}%` }}
          />
        </div>
        <div className="grid grid-cols-2 gap-x-2 gap-y-1">
          {Object.entries(FUNCTION_META).map(([key, { label, color }]) => {
            const count = functions[key] ?? 0;
            return (
              <div key={key} className="flex items-center gap-1.5">
                <div
                  className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: count > 0 ? color : '#2d3d2a' }}
                />
                <span className={`text-[9px] flex-1 truncate ${count > 0 ? 'text-muted-foreground' : 'text-muted-foreground/40'}`}>
                  {label}
                </span>
                <span className={`text-[9px] font-semibold ${count > 0 ? 'text-foreground' : 'text-muted-foreground/30'}`}>
                  {count}
                </span>
              </div>
            );
          })}
        </div>
        {missing > 0 && (
          <div className="mt-2 rounded-md bg-teal-950/40 border border-teal-800/40 px-2 py-1.5 text-[9px] text-teal-400">
            💡 Add {missing} more function{missing > 1 ? 's' : ''} to improve your score
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create `components/dashboard/intel/intelligence-row.tsx`**

```typescript
import { SeasonalCard } from './seasonal-card';
import { TasksCard } from './tasks-card';
import { AiInsightsCard } from './ai-insights-card';
import { EcoHealthCard } from './eco-health-card';
import { SeasonalContext } from '@/lib/dashboard/seasonal';
import { Task } from '@/lib/db/schema';

interface Props {
  seasonal: SeasonalContext;
  tasks: Task[];
  insights: any[];
  ecoScore: number;
  ecoFunctions: Record<string, number>;
  farmId: string;
}

export function IntelligenceRow({ seasonal, tasks, insights, ecoScore, ecoFunctions, farmId }: Props) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Today's Intelligence</h3>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SeasonalCard seasonal={seasonal} />
        <TasksCard tasks={tasks} farmId={farmId} />
        <AiInsightsCard insights={insights} farmId={farmId} />
        <EcoHealthCard score={ecoScore} functions={ecoFunctions} />
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add components/dashboard/intel/
git commit -m "feat: add intelligence row cards (seasonal, tasks, AI insights, eco health)"
```

### Task 7: Alert banner component

**Files:**
- Create: `components/dashboard/alert-banner.tsx`

- [ ] **Step 1: Create component**

```typescript
'use client';
import { useState } from 'react';
import { SeasonalContext } from '@/lib/dashboard/seasonal';

interface Props {
  seasonal: SeasonalContext;
  urgentTaskCount?: number;
}

export function AlertBanner({ seasonal, urgentTaskCount = 0 }: Props) {
  const [dismissed, setDismissed] = useState(false);

  const alerts: { icon: string; title: string; sub: string }[] = [];

  if (seasonal.frostRisk && seasonal.daysToLastFrost !== null) {
    const days = Math.abs(seasonal.daysToLastFrost);
    alerts.push({
      icon: '🌡️',
      title: `Frost risk — ${days === 0 ? 'tonight' : `in ${days} day${days !== 1 ? 's' : ''}`}`,
      sub: 'Cover frost-sensitive plantings before dark',
    });
  }

  if (urgentTaskCount > 0) {
    alerts.push({
      icon: '⚡',
      title: `${urgentTaskCount} urgent task${urgentTaskCount > 1 ? 's' : ''} need attention`,
      sub: 'Tap Tasks to view and complete them',
    });
  }

  if (alerts.length === 0 || dismissed) return null;

  return (
    <div className="space-y-2">
      {alerts.map((alert, i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl border border-amber-800/60 bg-amber-950/40 px-4 py-3">
          <span className="text-xl">{alert.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-amber-300">{alert.title}</div>
            <div className="text-xs text-amber-400/70">{alert.sub}</div>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="flex-shrink-0 text-amber-600 hover:text-amber-400 transition-colors text-lg leading-none"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/dashboard/alert-banner.tsx
git commit -m "feat: add dismissible alert banner for frost and urgent tasks"
```

---

## Chunk 5: Dashboard page — wiring it all together

### Task 8: Activity and progress panels

**Files:**
- Create: `components/dashboard/activity-panel.tsx`
- Create: `components/dashboard/progress-panel.tsx`

- [ ] **Step 1: Create `components/dashboard/activity-panel.tsx`**

```typescript
import { formatDistanceToNow } from 'date-fns';

interface ActivityItem {
  type: string;
  id: string;
  title: string;
  created_at: number;
}

const ICONS: Record<string, string> = {
  ai: '🤖',
  planting: '🌱',
  zone: '🗺️',
};

interface Props {
  items: ActivityItem[];
}

export function ActivityPanel({ items }: Props) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <h3 className="text-xs font-bold text-foreground">Recent Activity</h3>
      </div>
      <div className="divide-y divide-border">
        {items.length === 0 && (
          <div className="py-6 text-center text-xs text-muted-foreground">No activity yet — open your farm and start planting</div>
        )}
        {items.map((item) => (
          <div key={item.id} className="flex items-start gap-3 px-4 py-2.5">
            <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md bg-muted text-sm">
              {ICONS[item.type] ?? '📝'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs text-foreground/80">{item.title}</div>
            </div>
            <div className="flex-shrink-0 text-[10px] text-muted-foreground whitespace-nowrap">
              {formatDistanceToNow(new Date(item.created_at * 1000), { addSuffix: true })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `components/dashboard/progress-panel.tsx`**

Reuse the existing `LearningProgress` component if it fits — check `components/dashboard/learning-progress.tsx` first. If it does what's needed, just re-export it. If not, create a slim wrapper:

```typescript
import { LearningProgress } from './learning-progress';

interface Props {
  userId: string;
}

export function ProgressPanel({ userId }: Props) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="border-b border-border px-4 py-2.5">
        <h3 className="text-xs font-bold text-foreground">Your Progress</h3>
      </div>
      <div className="p-3">
        <LearningProgress userId={userId} />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/activity-panel.tsx components/dashboard/progress-panel.tsx
git commit -m "feat: add activity and progress panels"
```

### Task 9: Main dashboard client component

**Files:**
- Create: `components/dashboard/dashboard-client-v2.tsx`
- Modify: `app/(app)/dashboard/page.tsx`

This is the stateful client wrapper that manages active farm tab switching.

- [ ] **Step 1: Create `components/dashboard/dashboard-client-v2.tsx`**

```typescript
'use client';
import { useState } from 'react';
import { DashboardFarm } from '@/lib/db/queries/dashboard';
import { FarmTabStrip } from './farm-tab-strip';
import { FarmIconStrip } from './farm-icon-strip';
import { FarmHeroBar } from './farm-hero-bar';
import { AlertBanner } from './alert-banner';
import { IntelligenceRow } from './intel/intelligence-row';
import { ActivityPanel } from './activity-panel';
import { ProgressPanel } from './progress-panel';
import { SeasonalContext } from '@/lib/dashboard/seasonal';
import { Task } from '@/lib/db/schema';

interface FarmData {
  farm: DashboardFarm;
  ecoScore: number;
  ecoFunctions: Record<string, number>;
  tasks: Task[];
  insights: any[];
  activity: any[];
  seasonal: SeasonalContext;
}

interface Props {
  farms: DashboardFarm[];
  farmData: Record<string, FarmData>;
  userId: string;
}

export function DashboardClientV2({ farms, farmData, userId }: Props) {
  const [activeFarmId, setActiveFarmId] = useState(farms[0]?.id ?? '');
  const active = farmData[activeFarmId];

  if (farms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="text-5xl mb-4">🌱</div>
        <h2 className="text-xl font-bold mb-2">Welcome to Permaculture.Studio</h2>
        <p className="text-muted-foreground mb-6 max-w-sm">Create your first farm to get started with map-based permaculture design.</p>
        <a href="/farm/new" className="rounded-xl bg-green-800 hover:bg-green-700 text-green-100 font-bold px-6 py-3 transition-colors">
          Create your first farm →
        </a>
      </div>
    );
  }

  const urgentCount = active?.tasks.filter((t) => t.priority === 4 && t.status === 'pending').length ?? 0;

  return (
    <div className="flex flex-col">
      {/* Farm strip — desktop tabs, mobile icons */}
      <div className="hidden md:block">
        <FarmTabStrip farms={farms} activeFarmId={activeFarmId} onSelect={setActiveFarmId} />
      </div>
      <div className="block md:hidden">
        <FarmIconStrip farms={farms} activeFarmId={activeFarmId} onSelect={setActiveFarmId} />
      </div>

      {active && (
        <>
          {/* Farm hero */}
          <FarmHeroBar farm={active.farm} ecoFunctions={active.ecoFunctions} />

          {/* Content */}
          <div className="flex flex-col gap-4 p-4">
            {/* Alerts */}
            <AlertBanner seasonal={active.seasonal} urgentTaskCount={urgentCount} />

            {/* Intelligence row */}
            <IntelligenceRow
              seasonal={active.seasonal}
              tasks={active.tasks}
              insights={active.insights}
              ecoScore={active.ecoScore}
              ecoFunctions={active.ecoFunctions}
              farmId={activeFarmId}
            />

            {/* Lower panels */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <ActivityPanel items={active.activity as any} />
              <ProgressPanel userId={userId} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Update `app/(app)/dashboard/page.tsx`**

Replace the page body with calls to the new queries and new client component. Keep the existing imports/auth pattern.

Key structure:
```typescript
// 1. Auth check (existing pattern)
const session = await requireAuth();

// 2. Fetch farms
const farms = await getDashboardFarms(session.user.id);

// 3. For each farm, fetch eco health, tasks, insights, activity, seasonal
const farmData: Record<string, FarmData> = {};
await Promise.all(
  farms.map(async (farm) => {
    const [ecoResult, tasks, insights, activity] = await Promise.all([
      getEcoHealthScore(farm.id),
      getFarmTasks(farm.id),
      getRecentAiInsights(farm.id),
      getRecentActivity(farm.id),
    ]);
    const seasonal = getSeasonalContext(farm.climate_zone, farm.center_lat);
    farmData[farm.id] = {
      farm: { ...farm, eco_health_score: ecoResult.score },
      ecoScore: ecoResult.score,
      ecoFunctions: ecoResult.functions,
      tasks,
      insights,
      activity,
      seasonal,
    };
  })
);

// 4. Render
return (
  <div className="min-h-screen">
    {/* Top greeting bar */}
    <div className="flex items-center justify-between border-b border-border px-4 py-3">
      <div>
        <h1 className="text-sm font-bold">{greeting}, {session.user.name?.split(' ')[0]} 🌤</h1>
        <p className="text-xs text-muted-foreground">{dateString} · {seasonLabel}</p>
      </div>
      <div className="flex items-center gap-2">
        {/* search input */}
        <Link href="/farm/new">...</Link>
      </div>
    </div>
    <DashboardClientV2 farms={farms} farmData={farmData} userId={session.user.id} />
  </div>
);
```

- [ ] **Step 3: Verify build passes**

```bash
npm run build 2>&1 | tail -20
```
Expected: No type errors.

- [ ] **Step 4: Commit**

```bash
git add components/dashboard/dashboard-client-v2.tsx app/(app)/dashboard/page.tsx
git commit -m "feat: wire up farm-first dashboard with intelligence hub"
```

---

## Chunk 6: Polish, skeleton states, and cleanup

### Task 10: Skeleton loading states

**Files:**
- Create: `components/dashboard/intel/intelligence-row-skeleton.tsx`
- Modify: `app/(app)/dashboard/loading.tsx` (create if missing)

- [ ] **Step 1: Create intelligence row skeleton**

```typescript
export function IntelligenceRowSkeleton() {
  return (
    <div>
      <div className="mb-2 h-3 w-32 animate-pulse rounded bg-muted" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-40 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `app/(app)/dashboard/loading.tsx`**

```typescript
import { IntelligenceRowSkeleton } from '@/components/dashboard/intel/intelligence-row-skeleton';

export default function DashboardLoading() {
  return (
    <div className="flex flex-col">
      {/* Tab strip skeleton */}
      <div className="flex gap-2 border-b border-border bg-card px-4 py-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-12 w-32 animate-pulse rounded-t-xl bg-muted" />
        ))}
      </div>
      {/* Hero skeleton */}
      <div className="border-b border-border px-4 py-3">
        <div className="h-5 w-48 animate-pulse rounded bg-muted mb-2" />
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-5 w-20 animate-pulse rounded-full bg-muted" />
          ))}
        </div>
      </div>
      <div className="p-4">
        <IntelligenceRowSkeleton />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Remove old dashboard components that are replaced**

Check which of these are no longer used and delete them if safe:
- `components/dashboard/quick-actions.tsx` — replaced by farm hero CTA + tab strip
- `components/dashboard/dashboard-fab.tsx` — check if still used elsewhere before deleting

```bash
# Check usage before deleting
grep -r "quick-actions\|QuickActions" app/ components/ --include="*.tsx" -l
grep -r "dashboard-fab\|DashboardFab" app/ components/ --include="*.tsx" -l
```

Only delete if no other usages found.

- [ ] **Step 4: Final build check**

```bash
npm run build
```
Expected: Clean build, no type errors.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: add skeleton states and complete dashboard redesign

- Farm-first layout with tab strip (desktop) and icon strip (mobile)
- Farm hero bar with ecological function pills
- Intelligence row: seasonal, tasks, AI insights, eco health
- Dismissible alert banners for frost and urgent tasks
- Activity and progress panels
- Skeleton loading states
- New farm_tasks table and API routes"
```

---

## Summary of New Files

| File | Purpose |
|------|---------|
| `lib/db/migrations/105_tasks_source.sql` | Additive: add `source` column to existing `tasks` table |
| `lib/db/queries/dashboard.ts` | All dashboard data queries |
| `lib/dashboard/seasonal.ts` | Seasonal intelligence (frost, season label) |
| `components/dashboard/farm-tab-strip.tsx` | Desktop farm tabs |
| `components/dashboard/farm-icon-strip.tsx` | Mobile farm icon switcher |
| `components/dashboard/farm-hero-bar.tsx` | Active farm summary + CTA |
| `components/dashboard/alert-banner.tsx` | Frost/urgent dismissible alerts |
| `components/dashboard/intel/seasonal-card.tsx` | Season + frost card |
| `components/dashboard/intel/tasks-card.tsx` | Tasks card with toggle |
| `components/dashboard/intel/ai-insights-card.tsx` | AI insights card |
| `components/dashboard/intel/eco-health-card.tsx` | Eco health score card |
| `components/dashboard/intel/intelligence-row.tsx` | 4-card intelligence row |
| `components/dashboard/activity-panel.tsx` | Recent activity feed |
| `components/dashboard/progress-panel.tsx` | Learning progress wrapper |
| `components/dashboard/dashboard-client-v2.tsx` | Main client state manager |
| `components/dashboard/intel/intelligence-row-skeleton.tsx` | Loading skeleton |
| `app/(app)/dashboard/loading.tsx` | Next.js loading UI |

## Modified Files

| File | Change |
|------|--------|
| `lib/db/schema.ts` | Add FarmTask interface |
| `app/(app)/dashboard/page.tsx` | Replace with new data fetching + DashboardClientV2 |
| `app/api/farms/[id]/tasks/route.ts` | Add GET/POST handlers |
| `app/api/farms/[id]/tasks/[taskId]/route.ts` | Add PATCH/DELETE handlers |
