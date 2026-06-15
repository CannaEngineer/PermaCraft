# PermaCraft — 2026-06-15
## Focus: UI/UX Polish (Sunday)

### 1. Quick-action buttons meet minimum touch targets
File: `components/immersive-map/bottom-drawer.tsx`
What changed: Increased quick-action buttons from h-8 (32px) to min-h-[44px] h-11 with larger icons (h-4 w-4) and padding (px-4), matching Apple HIG / Material Design 44px minimum. Also bumped cancel-zone-link button to the same standard.
Map/dashboard impact: Mobile users can reliably tap Add Plant, Draw Zone, Drop Pin, and other quick actions without mis-taps. Especially noticeable on phones where the scrollable strip was previously hard to use with larger fingers.

### 2. iOS safe-area inset on bottom drawer
File: `components/immersive-map/bottom-drawer.tsx`
What changed: Added `paddingBottom: env(safe-area-inset-bottom, 0px)` to the fixed bottom drawer so content isn't hidden behind the home indicator on notched iPhones.
Map/dashboard impact: iPhone X+ users can now scroll to the last item in the feature list and quick-action strip without it being obscured by the home indicator bar.

### 3. Feature list panel adapts to container height
File: `components/map/feature-list-panel.tsx`
What changed: Replaced hardcoded `max-h-[400px]` on the feature list `<ul>` with `flex-1 min-h-0` and made the parent container flex-aware. The list now fills whatever space its container provides instead of capping at 400px regardless of screen size.
Map/dashboard impact: On tall screens or when the bottom drawer is expanded to max height, designers see more features without scrolling. On small screens, the list correctly shrinks to fit. No more wasted vertical space.

### 4. Drawing toolbar clarifies auto-save behavior
File: `components/immersive-map/drawing-toolbar.tsx`
What changed: Added "auto-saved" sub-label beneath the "Done" button text, and updated the title tooltip to explicitly state "zones are saved automatically." The button was previously ambiguous — users didn't know if clicking "Done" was required to save their drawn zones.
Map/dashboard impact: Designers understand that their zones persist as they draw them and that "Done" simply exits drawing mode. Reduces anxiety about losing work and eliminates unnecessary "did it save?" double-checking.

### 5. Interaction layer filter explains its purpose
File: `components/map/interaction-layer-filter.tsx`
What changed: Added "tap target" subtitle beneath the collapsed filter label so users understand this control determines which map features respond to touch/click. Also bumped both collapsed and expanded button heights to 44px minimum touch targets.
Map/dashboard impact: Users no longer wonder why tapping a plant sometimes selects the zone underneath. The filter is now self-documenting and easier to tap on mobile.

### 6. Map control panel responsive on narrow phones
File: `components/immersive-map/map-control-panel.tsx`
What changed: Added `max-sm:w-[calc(100vw-2rem)]` so the layers panel fills the available width on phones narrower than 640px instead of being fixed at `w-64` (256px) which could overflow or leave awkward margins.
Map/dashboard impact: On small phones (320px-375px viewport), the layers panel no longer clips against the screen edge or overlaps map controls.

## Watch for
- The `env(safe-area-inset-bottom)` on the bottom drawer may double-up with the `max-md:bottom-14` offset if the UnifiedBottomNav also accounts for safe area. Test on actual notched devices.
- The feature list's `flex-1 min-h-0` relies on all parent containers being proper flex columns. If a parent changes layout, the list could collapse to zero height. The MapBottomDrawer parent (`max-h-[60vh]`) should still constrain it correctly.
- The "tap target" label on the interaction filter is a stopgap. A proper first-use tooltip that explains "This controls which map features respond to your taps" and then disappears would be better long-term.
