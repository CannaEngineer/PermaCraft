# PermaCraft — 2026-04-19
## Focus: UI/UX Polish

### 1. Clean up login page: remove debug panel, add register link
File: `app/(auth)/login/page.tsx`
What changed: Removed the production-exposed "Show login diagnostics" debug panel (checkbox, debug log viewer, /api/auth/debug calls) and replaced the dead-end "Contact us to get started" text with a working link to the register page.
Map/dashboard impact: First-time users arriving at /login can now discover registration without guessing the URL. No debug artifacts distract from the core sign-in flow.

### 2. Fix RegisterCTA: "Sign In" → "Sign Up" with correct link
File: `components/shared/register-cta.tsx`
What changed: Changed the CTA button text from "Sign In to Get Started" to "Sign Up to Get Started" and updated the link target from /login to /register, matching the action the user actually wants to take.
Map/dashboard impact: Unauthenticated users seeing plant/blog/shop CTAs are now routed to account creation, not the login form — reducing friction for new user conversion.

### 3. Replace browser confirm() with shadcn AlertDialog on farm creation
File: `app/(app)/farm/new/page.tsx`
What changed: Replaced the native `confirm()` dialog for area mismatch warnings with a shadcn AlertDialog component. Also improved the boundary-missing error message to be more actionable ("draw your farm boundary on the map below, then try again").
Map/dashboard impact: The farm creation flow now uses the same design language as the rest of the app instead of a jarring browser dialog. Users get clearer labels ("Go Back" / "Continue Anyway") instead of generic OK/Cancel.

### 4. Improve empty states for new farms
Files: `components/map/feature-list-panel.tsx`, `components/map/map-bottom-drawer.tsx`
What changed: Enhanced the FeatureListPanel empty state with visual icons (plant/zone/line) and welcoming copy ("Your design starts here"). Updated the MapBottomDrawer peek bar to show guidance text ("Tap Plant or Zone to start designing") instead of "0 plants | 0 zones" when a farm has no features. Improved the no-search-results state with a search icon and better hint text.
Map/dashboard impact: New farm owners see encouraging, actionable prompts instead of bare zeros — helping them understand exactly what to do next after creating their farm.

## Watch for
- The login page no longer has any debug tooling. If auth debugging is needed in development, consider adding it behind a `NODE_ENV === 'development'` check or a separate /debug route.
- The farm creation AlertDialog references `boundary?.areaAcres` — verify the optional chaining doesn't show "undefined acres" if somehow triggered without a boundary (shouldn't be reachable in normal flow since the dialog only opens when boundary exists).
- The peek bar empty state text assumes both `onAddPlant` and `onDrawZone` callbacks are provided to show the Plant/Zone buttons. If those are absent, the guidance text references buttons that aren't visible.
