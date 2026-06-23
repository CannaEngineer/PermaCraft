# PermaCraft — 2026-06-23
## Focus: Map Core (Monday)

### 1. Add farm ownership verification to line PATCH/DELETE
File: `app/api/farms/[id]/lines/[lineId]/route.ts`
What changed: Both PATCH and DELETE now verify the authenticated user owns the farm before allowing modifications, using a JOIN to the farms table.
Map/dashboard impact: Previously any authenticated user who knew a line ID could modify or delete lines on any farm. Now line mutations are properly scoped to the farm owner, preventing unauthorized edits to other designers' work.

### 2. Make zone deletion atomic with db.batch()
File: `app/api/farms/[id]/zones/[zoneId]/route.ts`
What changed: Replaced two sequential db.execute() calls (unlink plantings, then delete zone) with a single db.batch() transaction that also updates the farm's updated_at timestamp.
Map/dashboard impact: If the zone DELETE query previously failed after the planting UPDATE, plantings would be orphaned with zone_id = NULL and no way to restore the association. Now the entire operation succeeds or fails as a unit.

### 3. Add updated_at timestamp to planting PATCH
File: `app/api/farms/[id]/plantings/[plantingId]/route.ts`
What changed: Planting updates now set `updated_at = unixepoch()` on the planting row and also update the parent farm's `updated_at` timestamp, both in a single batch transaction.
Map/dashboard impact: Dashboard "last modified" timestamps and any client-side caching that depends on updated_at now accurately reflect when plantings were last changed.

### 4. Consistent JSON parsing in line API responses
Files: `app/api/farms/[id]/lines/route.ts`, `app/api/farms/[id]/lines/[lineId]/route.ts`
What changed: Line POST and PATCH responses now parse style and layer_ids JSON before returning, matching the GET response format.
Map/dashboard impact: The client previously received raw JSON strings from POST/PATCH but parsed objects from GET, which could cause rendering bugs when a newly created or updated line's style wasn't applied until the next page load.

## Watch for
- The lines GET handler silently swallows corrupted JSON for style/layer_ids — if corruption is happening, errors only appear in server logs, not to the user. Consider surfacing a warning if this ever fires on real data.
- The zones batch POST route deletes ALL zones then re-inserts — if the client sends a partial zone list (e.g., due to a network timeout truncating the request body), zones could be lost. The Zod validation catches malformed bodies but can't detect a truncated-but-valid array.
