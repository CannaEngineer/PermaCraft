# PermaCraft -- 2026-06-08
## Focus: UI/UX Polish (Sunday)

### 1. Fix public navigation auth actions — replace Eye icon, add Register on mobile
Files: `components/shared/public-top-bar.tsx`, `components/shared/landing-nav.tsx`
What changed: Replaced the misleading Eye icon with a LogIn icon for the sign-in link. Made the login text larger and more visible (text-sm instead of text-xs, normal contrast instead of faded). Added a prominent "Get Started" register button on both desktop and mobile in both the PublicTopBar and LandingNav. Mobile menus previously had no way to register — now both auth actions are clearly visible side by side.
Map/dashboard impact: First-time mobile visitors can now actually register without hunting for a sign-up link. Desktop visitors see clear, standard auth actions instead of a near-invisible "Farmer Login" with a confusing eye icon.

### 2. Eliminate redirect hops from dashboard to canvas
Files: `components/dashboard/farm-hero-card.tsx`, `components/dashboard/activity-timeline.tsx`, `components/dashboard/insights-widget.tsx`, `components/dashboard/eco-ring.tsx`
What changed: All dashboard links that previously pointed to `/farm/{id}` (which then server-redirected owners to `/canvas?farm={id}&section=farm`) now link directly to the canvas URL. This includes "Open Map Editor", "Ask AI", GPS quick actions, activity timeline items, AI insights "View all" link, and the eco-ring "Browse species" link.
Map/dashboard impact: Every click from the dashboard to the map editor is now instant — no unnecessary server round-trip through the farm page redirect. Noticeable snappier navigation for every returning user.

### 3. Add global 404 page
File: `app/not-found.tsx`
What changed: Created a branded 404 page with the Permaculture.Studio leaf icon, a friendly message ("This part of the garden hasn't been planted yet"), and two clear actions: "Back to Home" and "Explore Farms". Previously, users hitting a bad URL saw the raw Next.js default 404 with no branding or navigation.
Map/dashboard impact: Users who mistype a URL or follow a stale link are caught with a helpful page instead of a dead end. The "Explore Farms" CTA gives them a meaningful next step.

## Watch for
- The `/farm/{id}` page still exists and serves public farm views — only owner navigation was changed to go directly to canvas. Public/non-owner visitors still hit `/farm/{id}` correctly.
- GPS quick action links now pass `gps=` parameter via canvas URL — verify the canvas page correctly reads these params from the URL when loading.
- Pre-existing TypeScript errors (missing @types/node, missing module declarations) are environment-level and unrelated to these changes.
