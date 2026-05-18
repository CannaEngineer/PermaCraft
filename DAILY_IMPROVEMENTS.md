# PermaCraft — 2026-05-18
## Focus: UI/UX Polish (Sunday)

### 1. Map empty state onboarding overlay
File: `components/map/farm-map.tsx`
What changed: Added a centered overlay card that appears when a farm has no zones, plantings, or lines. Shows a leaf icon, "Start designing your farm" heading, brief description, and two prominent CTA buttons (Add Plant / Draw Zone).
Map/dashboard impact: First-time users landing on a freshly created farm now see an obvious, inviting starting point instead of a bare map with only a tiny peek bar hint. The overlay disappears automatically once any feature is added.

### 2. Draw Zone button visual hierarchy in immersive editor
File: `components/immersive-map/bottom-drawer.tsx`
What changed: Changed the "Draw Zone" quick-action button from `bg-muted/60` (gray, passive) to `bg-violet-600` (bold violet with hover/active states and shadow). Now visually matches the weight of "Add Plant" (emerald) and "Drop Pin" (blue).
Map/dashboard impact: Zone drawing is a core action but looked disabled compared to its siblings. Now both primary design actions (Plant and Zone) have equal visual prominence, reducing the chance a user overlooks zone drawing.

### 3. Dashboard hero card no-screenshot call-to-action
File: `components/dashboard/farm-hero-card.tsx`
What changed: Replaced passive "No snapshot yet" text with a clickable link that says "Open map to capture a snapshot" and navigates to the farm editor on click. Added hover states for discoverability.
Map/dashboard impact: Users with new farms now understand what to do about the empty preview area instead of seeing a static placeholder. Clicking it takes them directly to the map where snapshots are generated.

### 4. Compact classic editor header for mobile
File: `app/(app)/farm/[id]/farm-editor-client.tsx`
What changed: Collapsed the two-tier header (identity row + actions row) into a single row on mobile. Farm name uses `text-base` instead of `text-2xl`, all action buttons are 32px height and icon-only on small screens. Unsaved status moved to a slim 11px bar beneath when present, keeping the header minimal.
Map/dashboard impact: Reclaims ~40px of vertical space on mobile screens, giving the map more room. The map is the primary workspace and every pixel matters on small devices.

### 5. Bottom drawer empty state polish
File: `components/map/map-bottom-drawer.tsx`
What changed: Added a pulsing green dot indicator and changed wording from "Tap Plant or Zone to start designing" to "Ready to design — use Plant or Zone" with bolder text for the action words.
Map/dashboard impact: The peek bar empty state is now more eye-catching with the animated dot and clearer actionable language.

## Watch for
- The map empty state overlay uses `z-[15]` to sit above the map but below drawers/toolbars — verify it doesn't block map controls if any future controls are added at that z-level
- The overlay conditionally hides during all drawing, planting, and species picker modes — ensure no edge case where it lingers after canceling a mode
- The compact header removes the farm description on mobile — if users rely on seeing it, this could be a regression (description was already `line-clamp-1` and hidden on narrow screens anyway)
