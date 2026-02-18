# Issue Tracker Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Triage, fix, and implement all tracked issues across the permaculture platform — from critical P0 bugs through P1 high-impact features, with complex P2 work scoped into future projects.

**Architecture:** Immersive map editor (`components/immersive-map/`) is the primary UI; panel state lives in `ImmersiveMapUIContext`; API routes live in `app/api/`; AI integrations live in `lib/ai/`.

**Tech Stack:** Next.js 14 App Router, MapLibre GL, Turso/libSQL, OpenRouter AI, shadcn/ui, Framer Motion, Tailwind CSS.

---

## SEGMENT 1 — P0 Critical Bugs (Fix First)

> Six broken flows that block core functionality. Work through these in order; each is relatively self-contained.

---

### Task 1: FE-01 — Plant Selection Click Handler Not Firing

**Files:**
- Read: `components/map/species-picker-panel.tsx`
- Read: `components/map/species-picker-compact.tsx`
- Read: `components/immersive-map/immersive-map-editor.tsx`
- Modify: whichever species picker has the broken handler

**Step 1: Reproduce the bug**

Open the immersive editor, click the FAB → "Add Plant", then click any plant. Open DevTools console and record what happens (no event, JS error, or state not updating).

**Step 2: Read the species picker and trace the click handler**

```bash
# Find the click handler
grep -n "onClick\|onSelect\|handleSelect\|handleClick" components/map/species-picker-panel.tsx
grep -n "onClick\|onSelect\|handleSelect\|handleClick" components/map/species-picker-compact.tsx
```

Common failure modes:
- `e.stopPropagation()` somewhere up the tree swallowing the click
- Handler is `undefined` because a prop wasn't passed down
- Handler references stale closure (missing dep in `useCallback`)
- A CSS overlay (`pointer-events-none` or a transparent `z-index` cover) blocking clicks on mobile

**Step 3: Read the immersive editor to trace how the picker is opened and what handler it receives**

Look for the prop passed to `SpeciesPickerPanel` (likely `onSpeciesSelect` or `onSelect`).

**Step 4: Fix the handler**

If the prop is missing, wire it. If it's a `pointer-events` issue, fix the CSS. If it's a stale closure, add the missing `useCallback` dep.

**Step 5: Verify**

- Click plant on desktop → selected, marker placed on map
- Click plant on mobile (375px) → same result
- Console shows no errors

**Step 6: Commit**

```bash
git add components/map/species-picker-panel.tsx  # or whichever file changed
git commit -m "fix(FE-01): wire plant selection click handler in species picker"
```

---

### Task 2: FE-02 — FAB "Add a Plant" Button Does Nothing

**Files:**
- Read: `components/immersive-map/map-fab.tsx`
- Read: `components/immersive-map/immersive-map-editor.tsx`
- Modify: `components/immersive-map/map-fab.tsx` and/or `immersive-map-editor.tsx`

**Step 1: Read map-fab.tsx**

Find the "Add Plant" action definition. It should call a callback prop (e.g. `onAddPlant`).

**Step 2: Read immersive-map-editor.tsx**

Find where `MapFAB` is rendered and whether `onAddPlant` (or equivalent) prop is passed.

Common failure modes:
- Prop not passed → `undefined` callback → silent no-op
- Callback passed but it sets state that opens the picker in a conditional that is never truthy
- `showSpeciesPicker` state is set but the picker is rendered in a branch that's guarded by something else

**Step 3: Trace the expected flow**

The "Add Plant" FAB action and the map submenu's "Add a Plant" should both converge on the same handler. Find what the submenu uses and make the FAB use it too.

**Step 4: Fix**

Wire the missing prop or consolidate both entry points to call the same `openSpeciesPicker()` function.

**Step 5: Verify**

FAB → Add Plant → Species picker opens. Map submenu → Add a Plant → Same picker opens. Both work on mobile and desktop.

**Step 6: Commit**

```bash
git commit -m "fix(FE-02): connect FAB Add Plant button to species picker flow"
```

---

### Task 3: FE-03 — Add-a-Plant Modal Hidden by Header

**Files:**
- Read: `components/immersive-map/collapsible-header.tsx`
- Read: `components/map/species-picker-panel.tsx` (check its wrapper/portal)
- Modify: the modal wrapper or header — fix z-index stacking

**Step 1: Inspect z-index values**

```bash
grep -rn "z-index\|z-[0-9]\|z-50\|z-100\|z-\[" components/immersive-map/ components/map/species-picker-panel.tsx
```

**Step 2: Check if the species picker uses a portal**

If it renders inside a parent with `overflow: hidden` or lower `z-index`, it will be clipped. The fix is either:
- Wrap the picker in a `ReactDOM.createPortal()` to render at `document.body` level, OR
- Increase the picker's z-index above the header's z-index, OR
- Ensure the picker's parent has `position: relative` and correct stacking context

**Step 3: Check the header z-index**

```bash
grep -n "z-" components/immersive-map/collapsible-header.tsx
```

**Step 4: Fix**

Apply the correct z-index or portal approach. The modal should be `z-[100]` or higher; if the header is `z-50`, the modal needs `z-[60]` minimum.

Example fix in `species-picker-panel.tsx` wrapper:
```tsx
<div className="fixed inset-0 z-[100] bg-background overflow-auto">
  {/* picker content */}
</div>
```

**Step 5: Verify**

Open Add Plant in immersive mode. Modal is fully visible above header. No header overlap. All content accessible.

**Step 6: Commit**

```bash
git commit -m "fix(FE-03): fix z-index stacking so Add Plant modal renders above header"
```

---

### Task 4: FE-04 — Slide-Up Drawers Not Expanding Fully

**Files:**
- Read: `components/immersive-map/bottom-drawer.tsx`
- Read: `components/map/map-bottom-drawer.tsx`
- Modify: `components/immersive-map/bottom-drawer.tsx`

**Step 1: Read bottom-drawer.tsx carefully**

Note the three height states: `peek` (~120px), `medium` (~45-55vh), `max` (~85-90vh). Look at:
- How `max` height is calculated
- What CSS classes set the drawer container's height
- Whether content inside the drawer has its own height constraint that truncates it

**Step 2: Find the problem**

Common causes:
- `max-height` on the content div is smaller than expected
- `overflow: hidden` somewhere cutting off content
- Framer Motion `drag` constraints preventing full expansion
- Peek state being applied when max state is intended

**Step 3: Test the three states manually**

Try triggering each height state. Identify at which state content gets cut off.

**Step 4: Fix**

If content is cut off at `max` height, ensure:
```tsx
// Content should be scrollable when drawer is at max height
<div
  className="overflow-y-auto"
  style={{ maxHeight: `calc(${drawerHeight} - 40px)` }} // subtract handle height
>
  {children}
</div>
```

If drawer itself isn't reaching its target height, check the Framer Motion `animate` target value.

**Step 5: Verify on multiple screen sizes**

- iPhone SE (375×667): Drawer at max shows all Export/Guild/Water content including bottom buttons
- iPhone 14 (390×844): Same
- Desktop: Same

**Step 6: Commit**

```bash
git commit -m "fix(FE-04): ensure slide-up drawers expand fully with scrollable content"
```

---

### Task 5: AI-01 — Farm Vitals LLM Suggestion Engine Not Working

**Files:**
- Read: `components/farm/farm-vitals.tsx`
- Read: `components/map/map-bottom-drawer.tsx` (Vitals tab)
- Read: `app/api/ai/analyze/route.ts` (or wherever vitals suggestions are fetched)
- Modify: fix the broken piece (component, API route, or prompt)

**Step 1: Find where vitals suggestions are triggered**

```bash
grep -rn "vitals\|suggestion\|farm-vitals" components/farm/ components/map/ --include="*.tsx"
grep -rn "vitals" app/api/ --include="*.ts"
```

**Step 2: Trace the data flow**

- What component renders the suggestion area?
- What API endpoint does it call?
- What does the API response look like?
- Is there an error being swallowed silently?

**Step 3: Check the API route**

Open the route handler. Look for:
- Missing or malformed prompt
- API key not being passed
- Error in OpenRouter call being swallowed
- Response parsing failure

Add a `console.error` or check existing error handling:
```typescript
try {
  const response = await openrouter.chat.completions.create({...});
  // ...
} catch (error) {
  console.error('Vitals LLM error:', error);
  return Response.json({ error: 'LLM failed' }, { status: 500 });
}
```

**Step 4: Check the component**

Does the component:
- Fetch on mount? (needs `useEffect` or RSC fetch)
- Handle loading state?
- Handle error state?
- Render the response correctly?

**Step 5: Fix**

Fix the root cause — likely one of:
- API route isn't being called (wrong URL in fetch)
- API route fails silently (add proper error handling)
- Component doesn't fetch at all on mount (add `useEffect`)
- Response format doesn't match what the component expects

**Step 6: Verify**

Open a farm with plantings. Vitals tab shows loading state, then shows LLM suggestions. Works on mobile and desktop.

**Step 7: Commit**

```bash
git commit -m "fix(AI-01): restore Farm Vitals LLM suggestion engine"
```

---

### Task 6: SC-01 — Shared AI Insights Not Appearing in Community

**Files:**
- Read: wherever "Share Insight" action is defined (likely `components/ai/` or `components/farm/ai-insight-tab.tsx`)
- Read: `app/api/community/feed/route.ts` or `app/api/feed/global/route.ts`
- Read: the POST handler that creates shared posts
- Modify: fix the gap between sharing and community display

**Step 1: Find the share action**

```bash
grep -rn "share\|shareInsight\|Share Insight" components/ --include="*.tsx"
```

**Step 2: Read the share handler**

What API does it call? What payload does it send? Does it get a success response?

**Step 3: Read the community feed query**

What SQL query populates the community feed? Does it filter by `type = 'ai_insight'`? Is there a missing `post_type` filter that excludes AI insights?

**Step 4: Common fix**

The share might be creating a post with `type = 'ai_insight'` but the community feed query only shows `type = 'post'`. Fix the feed query to include `'ai_insight'` type, or change the share handler to create standard posts with the insight content embedded.

**Step 5: Verify**

Share an AI insight from the farm editor. Navigate to Community feed. The shared insight appears with proper attribution and formatting. Confirmation toast only fires after backend success.

**Step 6: Commit**

```bash
git commit -m "fix(SC-01): ensure shared AI insights appear in community feed"
```

---

## SEGMENT 2 — P1 High-Impact Fixes

> High-impact UX and feature gaps. Implement after all P0s are verified.

---

### Task 7: FE-05 — AI Responses Show Raw Markdown in Community

**Files:**
- Read: `components/feed/post-card.tsx`
- Read: `components/ai/enhanced-chat-panel.tsx`
- Install: `npm install react-markdown` (if not already present)
- Modify: `components/feed/post-card.tsx`

**Step 1: Check if react-markdown is installed**

```bash
grep "react-markdown" package.json
```

**Step 2: Install if missing**

```bash
npm install react-markdown
```

**Step 3: Find where AI response content is rendered in post-card**

Look for `{post.content}` or similar raw text rendering.

**Step 4: Replace raw text with markdown renderer**

```tsx
import ReactMarkdown from 'react-markdown';

// Before:
<p>{post.content}</p>

// After:
<div className="prose prose-sm max-w-none dark:prose-invert">
  <ReactMarkdown>{post.content}</ReactMarkdown>
</div>
```

**Step 5: Add Tailwind typography plugin if not present**

```bash
grep "@tailwindcss/typography" package.json
# If missing:
npm install @tailwindcss/typography
```

Add to `tailwind.config.ts`:
```typescript
plugins: [require('@tailwindcss/typography')],
```

**Step 6: Verify**

AI posts in community feed render with proper headings, bold text, bullet lists. No raw `**text**` visible. XSS-safe (react-markdown sanitizes by default).

**Step 7: Commit**

```bash
git commit -m "fix(FE-05): render AI response markdown in community post cards"
```

---

### Task 8: FE-06 + AI-01 (Mobile) — Farm Vitals Blank on Mobile

> NOTE: If AI-01 (Task 5) fixed the root cause and it now shows on desktop, this task focuses purely on mobile rendering.

**Files:**
- Read: `components/farm/farm-vitals.tsx`
- Read: `components/map/map-bottom-drawer.tsx` (Vitals tab)
- Modify: the component with mobile layout issues

**Step 1: Open DevTools in mobile emulation (375px)**

Look for:
- Component that renders nothing (conditional returns null)
- Content outside viewport (overflow hidden, negative margin)
- Font size 0 or invisible text
- z-index issue causing content to hide behind another element

**Step 2: Check if mobile breakpoint causes any conditional rendering**

```bash
grep -n "mobile\|sm:\|md:\|hidden\|block" components/farm/farm-vitals.tsx
```

**Step 3: Fix**

If content is hidden via CSS class, remove the hiding class. If component returns null on mobile due to a screen-size check, fix the condition or restructure for mobile.

**Step 4: Verify**

Farm Vitals tab on mobile shows: loading spinner while fetching, then rendered suggestions, or error state if fetch fails. Identical content to desktop.

**Step 5: Commit**

```bash
git commit -m "fix(FE-06): show Farm Vitals LLM suggestions on mobile viewports"
```

---

### Task 9: FE-07 — Admin Console Mobile Responsiveness

**Files:**
- Read: `app/(app)/admin/` page files
- Read: `components/admin/*.tsx`
- Modify: admin layout and component files

**Step 1: Identify admin pages**

```bash
ls app/\(app\)/admin/ 2>/dev/null || ls app/admin/ 2>/dev/null
```

**Step 2: Audit each admin page for mobile issues**

Focus on: tables, forms, navigation, sidebars. Check for:
- Fixed-width tables without `overflow-x-auto`
- Multi-column layouts without responsive breakpoints
- Navigation that doesn't collapse on small screens

**Step 3: Apply responsive fixes**

Wrap tables in a scrollable container:
```tsx
<div className="overflow-x-auto">
  <table>...</table>
</div>
```

Convert multi-column admin layouts to single-column on mobile:
```tsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
```

**Step 4: Verify on 375px viewport**

All admin workflows (user management, model settings, content generation) are usable. No horizontal scroll required for primary actions.

**Step 5: Commit**

```bash
git commit -m "fix(FE-07): make admin console responsive for mobile viewports"
```

---

### Task 10: PS-03 — Plant Catalog Tag Clicks Should Filter

**Files:**
- Read: wherever the plant catalog is rendered (likely `app/(app)/species/` or similar)
- Read: `components/species/species-card.tsx`
- Read: `components/species/species-filter-sidebar.tsx`
- Modify: species card and/or catalog page

**Step 1: Find the tag elements in species-card**

```bash
grep -n "tag\|Tag\|badge\|Badge" components/species/species-card.tsx
```

**Step 2: Check if tags have onClick handlers**

Tags likely render as `<span>` or `<Badge>` without any click handler. The fix is to add `onClick` that calls the parent's filter handler.

**Step 3: Read how filters work in the filter sidebar**

The filter sidebar likely maintains state via URL params or React state. Tags should trigger the same filter mechanism.

**Step 4: Add onClick to tags in species-card**

```tsx
interface SpeciesCardProps {
  species: Species;
  onTagClick?: (tag: string) => void;
}

// In the tag rendering:
<Badge
  key={tag}
  className="cursor-pointer hover:bg-primary/20"
  onClick={() => onTagClick?.(tag)}
>
  {tag}
</Badge>
```

**Step 5: Wire onTagClick in the parent catalog page**

The catalog page passes a handler that adds the tag to active filters.

**Step 6: Show active filter state**

When a tag is clicked, it should appear as an active filter chip (visible in the filter sidebar or an active-filters bar above results).

**Step 7: Verify**

Click a tag on a species card → catalog filters to that tag → active filter shows → deselecting the filter restores full results.

**Step 8: Commit**

```bash
git commit -m "fix(PS-03): make plant catalog tag clicks apply filters"
```

---

### Task 11: PS-04 — Add-a-Plant Matching System

**Files:**
- Read: `components/map/species-picker-panel.tsx`
- Read: `app/api/species/route.ts`
- Read: `app/(app)/farm/[id]/page.tsx` (how farm context reaches the picker)
- Modify: species picker and/or API route

**Step 1: Check what context the species picker currently receives**

Does it receive `farmId`, `hardiness_zone`, `goals`, or similar props?

**Step 2: Read the species API route**

Does `/api/species` accept query params for filtering by zone, layer, or conditions? If not, add them.

**Step 3: Pass farm context to the picker**

In `immersive-map-editor.tsx`, when opening the species picker, pass:
- `farmId`
- `hardinessZone` (from farm data)
- `farmGoals` (from farm data)

**Step 4: Use context in the picker's search/filter**

```typescript
// In species-picker-panel.tsx fetch:
const params = new URLSearchParams({
  zone: hardinessZone,
  ...(searchQuery && { q: searchQuery }),
});
const response = await fetch(`/api/species?${params}`);
```

**Step 5: Update the API route to filter by zone**

```typescript
// In app/api/species/route.ts:
const zone = searchParams.get('zone');
const query = zone
  ? 'SELECT * FROM species WHERE hardiness_zone_min <= ? AND hardiness_zone_max >= ?'
  : 'SELECT * FROM species';
const args = zone ? [zoneNumber, zoneNumber] : [];
```

**Step 6: Verify**

Open Add Plant on a farm in Zone 6b. Results show Zone 6b-appropriate plants first. Farm context (zone, goals) visibly influences results.

**Step 7: Commit**

```bash
git commit -m "fix(PS-04): pass farm context to species picker for contextual matching"
```

---

### Task 12: PS-01 — Guild System Farm-Based Default Recommendations

**Files:**
- Read: `components/guilds/guild-designer.tsx`
- Read: `app/api/guilds/suggest/route.ts`
- Modify: guild designer and suggest API

**Step 1: Read guild-designer.tsx**

Find what triggers the recommendation fetch and what state drives "no plant selected" scenario.

**Step 2: Read the suggest API**

What input does it expect? Does it have a `farmId` or `existingPlantings` parameter?

**Step 3: Implement farm-based fallback**

In `guild-designer.tsx`, when no plant is selected:
```typescript
// Fetch farm's existing plantings
const plantings = await fetch(`/api/farms/${farmId}/plantings`).then(r => r.json());
if (plantings.length > 0) {
  // Use the most recently added planting as the base
  setBasePlant(plantings[plantings.length - 1].species_id);
}
```

**Step 4: Update suggest API to accept existing plantings**

```typescript
// POST /api/guilds/suggest
// Body: { basePlantId?: string, existingPlantingIds?: string[] }
```

**Step 5: Show which plant recommendations are based on**

```tsx
{basePlant && (
  <p className="text-sm text-muted-foreground">
    Based on your {basePlant.common_name} planting
  </p>
)}
```

**Step 6: Graceful fallback if no plantings**

Show a prompt: "Add your first plant to get guild recommendations" with a CTA to open the species picker.

**Step 7: Verify**

Open Guild Designer with no selection → shows recommendations from farm's existing plantings with attribution. No plantings on farm → shows onboarding message.

**Step 8: Commit**

```bash
git commit -m "fix(PS-01): guild system recommends companions from farm plantings when none selected"
```

---

### Task 13: PS-02 — Context-Aware Plant Catalog Recommendations

**Files:**
- Read: wherever the plant catalog page lives
- Read: `app/api/species/route.ts`
- Create: a "Recommended for You" section in the catalog

**Step 1: Find the catalog page**

```bash
find app -name "*.tsx" | xargs grep -l "species\|catalog\|plant.*catalog" 2>/dev/null | head -5
```

**Step 2: Add a recommended section at the top of the catalog**

This section fetches species ranked by relevance to the current farm:
- Farm's hardiness zone
- Farm's goals (food production, timber, fiber, etc.)

**Step 3: Create the recommended fetch**

```typescript
// In the catalog page (server component or client useEffect):
const farmContext = await fetch(`/api/farms/${farmId}`).then(r => r.json());
const recommended = await fetch(
  `/api/species?zone=${farmContext.hardiness_zone}&goals=${farmContext.goals.join(',')}&limit=6`
).then(r => r.json());
```

**Step 4: Render a "Recommended for You" section**

```tsx
<section>
  <h2 className="text-lg font-semibold mb-3">
    Recommended for Zone {farmContext.hardiness_zone}
  </h2>
  <p className="text-sm text-muted-foreground mb-4">
    Based on your {farmContext.goals.join(', ')} goals
  </p>
  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
    {recommended.map(species => <SpeciesCard key={species.id} species={species} />)}
  </div>
</section>
```

**Step 5: Update recommendations when farm changes**

If user has multiple farms, recommendations refresh when switching farms.

**Step 6: Verify**

Catalog shows a "Recommended for Zone 6b" section above the full list. Switching farms updates the zone in the recommendations label. Goals are reflected in the reasoning shown.

**Step 7: Commit**

```bash
git commit -m "feat(PS-02): add context-aware plant recommendations to catalog"
```

---

### Task 14: SC-02 — Photo Upload System for Community Posts

**Files:**
- Read: `components/farm/photo-post-tab.tsx`
- Read: `app/api/upload/photo/route.ts`
- Read: `components/immersive-map/photo-upload-dialog.tsx`
- Modify: whichever component/route has the broken upload

**Step 1: Identify the failure point**

Test photo upload and check:
- Does the file get sent to the API? (Check Network tab)
- Does the API return an error? (Check response)
- Does the file reach storage (R2)?
- Does the post save with the photo URL?

**Step 2: Read the upload route**

```bash
cat app/api/upload/photo/route.ts
```

Common issues:
- Missing `Content-Type: multipart/form-data` boundary
- R2 credentials not configured
- Response URL not being saved to the post

**Step 3: Fix the upload flow**

Ensure the upload handler:
1. Receives the multipart form data correctly
2. Uploads to R2 (or logs error clearly if R2 isn't configured)
3. Returns the public URL
4. The component saves this URL to the post

**Step 4: Handle upload progress and errors**

```tsx
const [uploading, setUploading] = useState(false);
const [error, setError] = useState<string | null>(null);

const handleUpload = async (file: File) => {
  setUploading(true);
  setError(null);
  try {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch('/api/upload/photo', { method: 'POST', body: formData });
    if (!response.ok) throw new Error('Upload failed');
    const { url } = await response.json();
    setPhotoUrl(url);
  } catch (err) {
    setError('Photo upload failed. Please try again.');
  } finally {
    setUploading(false);
  }
};
```

**Step 5: Verify**

Upload a JPEG, PNG, and WebP file in a community post. Progress indicator shows. Photo appears in the post after upload. Error state shown on failure.

**Step 6: Commit**

```bash
git commit -m "fix(SC-02): restore photo upload system for community posts"
```

---

### Task 15: DE-01 — User/Designer Role Separation

**Files:**
- Read: `lib/auth/` auth configuration
- Read: `app/api/admin/users/[id]/role/route.ts`
- Read: `lib/db/` schema
- Modify: schema (add column), auth config, and UI role displays

**Step 1: Check existing role field**

```bash
grep -rn "role\|designer\|user_type" lib/db/ lib/auth/
```

The DB likely has a `role` column on `users`. Confirm its values (e.g. `'user'`, `'admin'`).

**Step 2: Add 'designer' role without breaking existing data**

> IMPORTANT: Per project rules — never break the DB or delete information, only add columns.

If needed, add a migration that adds a `designer_since` timestamp column to `users` (NULL = not a designer). This is additive-only.

```sql
ALTER TABLE users ADD COLUMN designer_since INTEGER;  -- Unix timestamp, NULL = not designer
```

**Step 3: Update auth to surface the role**

Ensure `session.user` includes the role/designer status:
```typescript
// In lib/auth/ session callback or wherever user session is built
const isDesigner = !!user.designer_since;
return { ...session, user: { ...session.user, isDesigner } };
```

**Step 4: Add role badge to user profile UI**

```tsx
{session.user.isDesigner && (
  <Badge variant="secondary">Designer</Badge>
)}
```

**Step 5: Conditionally show designer-only features**

```tsx
{isDesigner && <DesignerGalleryTab />}
{isDesigner && <ShareDesignButton />}
```

**Step 6: Backend enforcement**

In API routes for designer-only actions:
```typescript
if (!session.user.isDesigner) {
  return new Response('Forbidden', { status: 403 });
}
```

**Step 7: Allow users to request designer status**

Add a "Become a Designer" button in profile settings that:
- Shows requirements (e.g., 3 published designs)
- Sends request to admin or auto-promotes (decide with product team)

**Step 8: Verify**

Standard user: no designer UI. Designer: sees gallery tab, share controls, designer badge. Role is enforced on both frontend and backend.

**Step 9: Commit**

```bash
git commit -m "feat(DE-01): implement user/designer role separation with DB migration"
```

---

### Task 16: DE-02 — Design Sharing with Access Controls

**Files:**
- Read: `lib/db/` schema (check for existing sharing/collaborators tables)
- Modify: DB schema (new `farm_shares` table if not exists — additive only)
- Create: `app/api/farms/[id]/shares/route.ts`
- Create: `components/farm/share-design-dialog.tsx`

**Step 1: Check existing schema for sharing**

```bash
grep -rn "collaborator\|share\|permission" lib/db/
```

There's likely a `farm_collaborators` table. Check its structure.

**Step 2: Add permission levels to collaborators table**

If the table exists but lacks permission levels, add a column (never drop existing):
```sql
ALTER TABLE farm_collaborators ADD COLUMN permission TEXT DEFAULT 'view';
-- permission values: 'view', 'edit', 'full'
```

**Step 3: Create API routes for sharing**

```typescript
// app/api/farms/[id]/shares/route.ts

// GET - list who has access
// POST - invite user { userId, permission }
// PUT - change permission { shareId, permission }
// DELETE - revoke access { shareId }
```

**Step 4: Create share dialog component**

```tsx
// components/farm/share-design-dialog.tsx
// - Search for user by email/username
// - Select permission level (View, Edit, Full Control)
// - List existing shares with ability to change/revoke
```

**Step 5: Enforce permissions in farm API routes**

In `app/api/farms/[id]/` routes:
```typescript
const share = await getSharePermission(farmId, session.user.id);
if (!share && farm.user_id !== session.user.id) {
  return new Response('Forbidden', { status: 403 });
}
if (share?.permission === 'view' && request.method !== 'GET') {
  return new Response('Forbidden', { status: 403 });
}
```

**Step 6: Show shared farms in recipient dashboard**

```typescript
// In dashboard query:
const ownFarms = await db.execute({ sql: 'SELECT * FROM farms WHERE user_id = ?', args: [userId] });
const sharedFarms = await db.execute({
  sql: `SELECT f.*, fc.permission FROM farms f
        JOIN farm_collaborators fc ON f.id = fc.farm_id
        WHERE fc.user_id = ?`,
  args: [userId]
});
```

**Step 7: Verify**

Owner shares farm as View-only → recipient sees it in their dashboard but cannot edit. Owner shares as Edit → recipient can edit but cannot delete. Full Control → recipient can delete. Owner can revoke at any time.

**Step 8: Commit**

```bash
git commit -m "feat(DE-02): implement design sharing with view/edit/full-control permissions"
```

---

## SEGMENT 3 — Future Projects (P2 Complex Work)

> These are scoped but complex. Each is a mini-project. Tackle after Segments 1 & 2 are complete and stable.

---

### Future Project A: FE-08 — Public Landing Page Redesign

**Scope:** Build a conversion-focused marketing homepage at `/` (unauthenticated route).

**Key Sections:**
1. **Hero** — Full-width, bold headline ("Design Your Permaculture Farm with AI"), satellite map background, CTA ("Start for Free" → /register)
2. **Features** — 3-column grid: Map-based design, AI recommendations, Community sharing
3. **Demo** — Embedded/animated screenshot of the map editor in action
4. **Social proof** — Community stats, farm count, user quotes
5. **Pricing preview** — Free tier vs Designer tier (stub for now)
6. **CTA footer** — Repeat the "Start for Free" action

**Files to create/modify:**
- `app/(marketing)/page.tsx` — New public route (or modify `app/page.tsx`)
- `components/marketing/hero-section.tsx`
- `components/marketing/features-grid.tsx`
- `components/marketing/demo-preview.tsx`
- `components/marketing/stats-bar.tsx`

**Acceptance criteria:**
- Hero visible above fold on all screen sizes
- Page score ≥ 90 in Lighthouse performance
- Clear primary CTA
- No generic template feel — custom illustrations or real screenshots

**Estimated effort:** 2-3 days

---

### Future Project B: FE-09 — Dashboard FAB Multi-Action Expansion

**Scope:** Expand `components/dashboard/dashboard-fab.tsx` from single-action to multi-action speed dial.

**Actions to add:**
1. New Farm (existing)
2. Create a Post → `/community/new-post` or opens CreatePostDialog
3. Share an Image → opens photo upload flow

**Files to modify:**
- `components/dashboard/dashboard-fab.tsx` — Swap to speed-dial variant using `components/ui/fab.tsx`

**Acceptance criteria:**
- FAB shows expand icon, tapping reveals 3 sub-actions with labels
- Tapping outside collapses FAB
- Each action navigates/opens the correct flow

**Estimated effort:** 2-4 hours

---

### Future Project C: PS-05 — Add-a-Plant as Mini Catalog

**Scope:** Transform the species picker (currently a search input) into a browsable mini-catalog within the modal.

**Tabs/Sections:**
1. **Search** — Current search functionality
2. **Browse** — Category tiles (Trees, Shrubs, Groundcovers, Vines, etc.)
3. **Recommended** — Farm context-aware picks (from PS-02 implementation)
4. **Recent** — Last 10 plants added to this farm

**Files to modify:**
- `components/map/species-picker-panel.tsx` — Add tabbed navigation

**Acceptance criteria:**
- Modal has tabbed interface
- Browsing by category works without search
- Recommendations visible and clickable
- Recent plants section shows farm's history
- Compact layout suitable for modal (no horizontal scroll)

**Estimated effort:** 1-2 days

---

### Future Project D: AI-02 — Phase-Based Planning Document Generation

**Scope:** Generate a structured planning document for any selected implementation phase using the farm's design data.

**Document sections:**
- Plant list (with quantities, spacing, suppliers)
- Material list (tools, amendments, infrastructure)
- Scope of work (tasks, estimated person-hours)
- Timeline (seasonal scheduling)

**Architecture:**
1. User clicks "Generate Plan" on a phase
2. Server fetches all plantings/zones assigned to that phase
3. Sends structured prompt to OpenRouter vision model
4. Streams response back to client
5. Renders as formatted document with export to PDF option

**Files to create:**
- `app/api/farms/[id]/phases/[phaseId]/plan/route.ts`
- `components/phasing/phase-plan-generator.tsx`
- `components/phasing/phase-plan-document.tsx`
- `lib/ai/phase-plan-prompter.ts`

**Acceptance criteria:**
- Each phase can generate a plan document
- Document has all 4 sections populated from real design data
- PDF export works (use `@react-pdf/renderer` or browser print)
- Generation takes < 30 seconds with streaming progress

**Estimated effort:** 3-5 days

---

### Future Project E: AI-03 — Implementation Timeline Feature

**Scope:** Visual timeline showing when each phase's plantings, construction, and maintenance activities should happen.

**Architecture:**
- Timeline uses a Gantt-like visualization (horizontal scrollable)
- AI generates initial suggestions from design context
- Users can drag to adjust dates
- Categories: Plantings, Infrastructure, Maintenance, Harvest

**Files to create:**
- `components/phasing/implementation-timeline.tsx`
- `app/api/farms/[id]/timeline/route.ts` (GET/POST timeline data)
- DB migration: `timeline_items` table (additive)

**DB columns for `timeline_items`:**
```sql
CREATE TABLE timeline_items (
  id TEXT PRIMARY KEY,
  farm_id TEXT NOT NULL,
  phase_id TEXT,
  category TEXT NOT NULL, -- 'planting', 'construction', 'maintenance', 'harvest'
  title TEXT NOT NULL,
  description TEXT,
  start_date INTEGER, -- Unix timestamp
  end_date INTEGER,
  created_at INTEGER DEFAULT (unixepoch())
);
```

**Acceptance criteria:**
- Visual Gantt-style timeline in the farm editor
- AI can pre-populate from existing phase data
- Manual adjustments persist to DB
- Export as image or PDF

**Estimated effort:** 5-7 days

---

### Future Project F: AI-04 — Soil Data Integration for Designers

**Scope:** Let designers input soil data per zone and have it influence plant recommendations.

**Phase 1 (manual entry):**
- Form fields on zone detail: pH, organic matter %, texture (sandy/loam/clay), drainage
- Soil data stored per zone in DB
- Plant recommendations filtered/ranked by soil compatibility

**Phase 2 (API integration — future):**
- SSURGO soil API or similar
- Auto-populate from GPS coordinates

**Files to create:**
- `components/map/zone-soil-form.tsx`
- `app/api/farms/[id]/zones/[zoneId]/soil/route.ts`
- DB migration: `zone_soil_data` table (additive)

**DB table:**
```sql
CREATE TABLE zone_soil_data (
  id TEXT PRIMARY KEY,
  zone_id TEXT NOT NULL UNIQUE,
  ph REAL,
  organic_matter_pct REAL,
  texture TEXT, -- 'sandy', 'loam', 'clay', 'silt', 'clay-loam', etc.
  drainage TEXT, -- 'poor', 'moderate', 'well', 'excessive'
  notes TEXT,
  updated_at INTEGER DEFAULT (unixepoch())
);
```

**Acceptance criteria:**
- Zone detail panel has soil data section
- Soil data persists and loads on return visits
- Plant recommendations visibly reflect soil conditions
- Phase 2 API integration is clearly documented as a follow-up

**Estimated effort:** 3-4 days

---

### Future Project G: DE-03 — Designer Gallery & Profiles

**Scope:** Public-facing designer portfolio pages browsable by all users.

**Architecture:**
- `/designers` — Browsable gallery of designer profiles
- `/designers/[username]` — Individual designer profile page
- Designer controls which of their farms are portfolio-visible

**Files to create:**
- `app/(app)/designers/page.tsx`
- `app/(app)/designers/[username]/page.tsx`
- `components/designers/designer-profile-card.tsx`
- `components/designers/portfolio-grid.tsx`
- `app/api/designers/route.ts`
- `app/api/designers/[username]/route.ts`

**DB:** Add `portfolio_visible` boolean column to `farms` table (additive).

**Acceptance criteria:**
- `/designers` shows a searchable grid of designer profiles
- Individual profile shows bio, portfolio farms (with map thumbnails)
- Designers control visibility per farm
- Contact/inquiry mechanism (could be as simple as an email link)

**Estimated effort:** 4-6 days

---

### Future Project H: GM-01 — User Acquisition Strategy

**Scope:** Strategic/operational initiative, not purely code. Requires product + community team involvement.

**Action plan:**
1. Create a free-tier experience that delivers standalone value (basic map + catalog, no AI)
2. Identify and join target communities: r/permaculture, r/homesteading, r/foodforest, local permaculture Facebook groups, Permies.com forums
3. Develop a "value-first" post template introducing the platform (not spam — genuine share with free access link)
4. Build a referral tracking system (add `ref` param to registration URL, store in `users.referred_by`)
5. Create a shareable "farm snapshot" URL for public farms to drive organic discovery

**Code items:**
- Add `referred_by TEXT` column to `users` table (additive migration)
- Add referral tracking in `/register` handler
- Build a `/share/[farmId]` public read-only snapshot page

**Estimated effort:** 1 week (mix of strategy + code)

---

### Future Project I: GM-02 — Pricing & Monetization Model

**Scope:** Define tiers, implement billing infrastructure.

**Proposed tiers:**
| Tier | Price | Includes |
|------|-------|----------|
| Free | $0 | 1 farm, basic map, catalog browse, community read |
| Grower | $9/mo | 5 farms, AI suggestions (50/mo), community posting |
| Designer | $29/mo | Unlimited farms, unlimited AI, portfolio page, sharing controls |

**Implementation order:**
1. Define tier limits and enforce them (gate AI calls behind tier check)
2. Add `subscription_tier` column to `users` table
3. Integrate Stripe (billing portal, webhook for subscription events)
4. Build upgrade flow in settings page
5. Gate features with a `usePlanGate()` hook

**Files to create:**
- `lib/billing/stripe.ts`
- `app/api/billing/` route handlers (checkout, portal, webhook)
- `hooks/use-plan-gate.ts`

**Estimated effort:** 1-2 weeks

---

## Execution Order Summary

```
SEGMENT 1 (do now, P0):
  Task 1: FE-01 — Plant click handler
  Task 2: FE-02 — FAB Add Plant button
  Task 3: FE-03 — Modal z-index fix
  Task 4: FE-04 — Drawer height fix
  Task 5: AI-01 — Farm Vitals LLM
  Task 6: SC-01 — Shared insights in community

SEGMENT 2 (do next, P1):
  Task 7:  FE-05 — Markdown rendering
  Task 8:  FE-06 — Vitals mobile fix
  Task 9:  FE-07 — Admin mobile layout
  Task 10: PS-03 — Tag filter clicks
  Task 11: PS-04 — Add-a-Plant context matching
  Task 12: PS-01 — Guild farm-based defaults
  Task 13: PS-02 — Catalog recommendations
  Task 14: SC-02 — Photo upload fix
  Task 15: DE-01 — Designer role separation
  Task 16: DE-02 — Design sharing permissions

FUTURE PROJECTS (plan then execute):
  Project A: FE-08 — Landing page redesign
  Project B: FE-09 — Dashboard FAB expansion
  Project C: PS-05 — Mini catalog in Add-a-Plant
  Project D: AI-02 — Phase planning doc generation
  Project E: AI-03 — Implementation timeline
  Project F: AI-04 — Soil data integration
  Project G: DE-03 — Designer gallery/profiles
  Project H: GM-01 — User acquisition
  Project I: GM-02 — Pricing model
```

---

*Plan written: 2026-02-16*
*Next step: Execute Segment 1 tasks, verify each before proceeding to Segment 2.*
