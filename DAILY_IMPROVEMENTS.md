# PermaCraft — 2026-04-20
## Focus: UI/UX Polish

### 1. Login page: Add register link, hide debug panel
File: `app/(auth)/login/page.tsx`
What changed: Replaced the dead-end "Contact us to get started" text with a proper link to `/register`. Hid the "Show login diagnostics" debug panel behind a `NODE_ENV === 'development'` check so it only appears during local development.
Map/dashboard impact: New users can now actually find the registration page from the login screen. Production users no longer see a confusing debug toggle that serves no purpose for them.

### 2. Farm creation: Replace native confirm() with AlertDialog
File: `app/(app)/farm/new/page.tsx`
What changed: Replaced the browser-native `confirm()` dialog for boundary size mismatch with a proper shadcn/ui `AlertDialog`. The dialog shows the same information (drawn boundary vs entered acreage) but with styled "Go Back" and "Continue Anyway" buttons that match the app's visual language.
Map/dashboard impact: Designers no longer see a jarring, unstyled browser popup when their drawn boundary differs from the entered acreage. The interaction feels consistent with the rest of the app.

### 3. Farm creation: Add success toast
File: `app/(app)/farm/new/page.tsx`
What changed: After a farm is successfully created, a toast notification confirms the action with the farm name before redirecting to the map editor. Previously the page silently redirected with no feedback.
Map/dashboard impact: Designers get clear confirmation that their farm was created, especially useful on slower connections where the redirect may take a moment.

## Watch for
- The debug panel is still rendered in the DOM when `IS_DEV` is false (the `DebugPanel` component returns null if `visible` is false), so no debug logs will ever accumulate in production — but the state variables remain. This is harmless but could be cleaned up if login page is refactored.
- The AlertDialog `onOpenChange` handler closes the dialog on backdrop click or Escape, which is good UX. The `submitFarm()` function is called directly from the "Continue Anyway" action — verify that the dialog fully closes before navigation occurs (Radix handles this correctly).
