# PermaCraft — 2026-05-25
## Focus: UI/UX Polish (Sunday)

### 1. Fix duplicate "Farmer Login" links in landing footer
File: `app/page.tsx`
What changed: The footer "For Farmers" section showed two identical "Farmer Login" links when not signed in, and a confusing "Dashboard" + "Farmer Login" pair when signed in. Now shows contextually appropriate links: signed-in users see Dashboard/Farm Editor/Create New Farm; visitors see Farmer Login/Create Account.
Map/dashboard impact: Visitors no longer see redundant links. Signed-in farmers get useful shortcuts to the editor and farm creation.

### 2. Improve dashboard empty state for first-time users
File: `components/dashboard/dashboard-client-v2.tsx`
What changed: The empty state previously showed just "Your land awaits" with a single button. Now includes three onboarding cards explaining the core workflow: Draw your land, Get AI guidance, Watch it grow. Each card has an icon, title, and concise description.
Map/dashboard impact: First-time users understand what the platform offers before creating their first farm, reducing drop-off at this critical moment.

### 3. Add brand identity to auth pages
File: `app/(auth)/layout.tsx`
What changed: Login and register pages now show the Permaculture.Studio logo and name above the form, plus a tagline below. Previously they were generic card forms with no brand connection.
Map/dashboard impact: First impression for new users feels connected to the permaculture mission rather than a generic SaaS login.

### 4. Auto-show drawing instructions for new users
Files: `components/map/boundary-drawer.tsx`, `app/(app)/farm/new/page.tsx`
What changed: The boundary drawing help panel now shows automatically on first visit (remembered via localStorage after dismissal). The farm creation page's boundary section description was updated from generic "Draw the boundary" to actionable "Search for your address, then click points around your property to trace its outline. Double-click to finish."
Map/dashboard impact: First-time users are guided through the most critical and potentially confusing step — drawing their property boundary — without needing to discover a hidden help button.

## Watch for
- The boundary drawer localStorage key `boundary-drawer-help-dismissed` will persist across farms — if a user creates multiple farms, they won't see the help again. This is intentional (they already know how) but worth monitoring if user feedback suggests otherwise.
- The auth layout adds a Leaf icon import from lucide-react (server component) — verify no hydration issues in production.
