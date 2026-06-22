# PermaCraft — 2026-06-22
## Focus: UI/UX Polish (Sunday)

### 1. Bottom Drawer Touch Targets Fixed
File: `components/immersive-map/bottom-drawer.tsx`
What changed: Increased tab touch targets from ~24px to 44px minimum (`min-h-[44px]` + `py-2.5`), and quick-action chips from 32px to 44px (`h-11` + `touch-manipulation`).
Map/dashboard impact: Mobile users can now reliably tap Design/Plan/Story tabs and primary action buttons (Add Plant, Draw Zone, etc.) without mis-taps. Follows the project's own design system requirement of 44px minimum targets.

### 2. Keyboard Shortcuts Help Overlay
File: `components/shared/keyboard-shortcuts-overlay.tsx` (new)
What changed: Added a discoverable keyboard shortcuts overlay, triggered by pressing `?` or `/`. Shows all navigation keys (1-6), map shortcuts (C=chat, S=snap), and general shortcuts. Also added a subtle "Keys" button at the bottom of the desktop nav rail for mouse-only users.
Map/dashboard impact: First-time users can now discover that keyboard shortcuts exist. Previously, the only shortcut reference was a tiny icon buried inside the Layers control panel — effectively invisible.

### 3. Welcome Tour Replay
File: `components/shared/unified-bottom-nav.tsx`
What changed: Added a "Replay Welcome Tour" button to the mobile profile menu. Clears the `onboarding-complete` localStorage flag and navigates to `/canvas` to restart the 4-step walkthrough.
Map/dashboard impact: Users who accidentally skipped or dismissed the welcome tour can now replay it. Previously, the tour was permanently gone after first dismissal with no way to restart.

### 4. Save State Wired to Map Header
File: `components/canvas/unified-canvas.tsx`
What changed: Passed the `saveState` prop to `ThinHeader` (which already had the UI for it but was never receiving data). Now shows "Saving..." spinner during auto-save, green "Saved" checkmark on completion, and "Offline" indicator on error.
Map/dashboard impact: Designers now see real-time save feedback in the map header bar — previously the save state was only visible in the CommandBar top bar, which is less prominent on mobile when the map fills the screen.

## Watch for
- The keyboard shortcuts overlay uses `window.dispatchEvent(new KeyboardEvent(...))` from the nav rail button — this works in all modern browsers but is a synthetic event dispatch pattern. If any event listeners do `e.isTrusted` checks, the button trigger won't work. The direct `?` key press always works.
- Touch target changes increase the vertical space used by the bottom drawer header and quick-action strip by ~20px total. On very small screens (iPhone SE / 320px width), verify the drawer content area still has sufficient scroll space at `medium` height.
- The "Replay Tour" button does a full page navigation (`window.location.href`) rather than a client-side route. This is intentional to ensure clean state reset, but it means a brief flash of white during navigation.
