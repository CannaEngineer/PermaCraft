# PermaCraft -- 2026-06-01
## Focus: UI/UX Polish (Sunday)

### 1. Fix "I'm a Grower" landing nav link destination
File: `components/shared/landing-nav.tsx`
What changed: The "I'm a Grower" button now links to `/register` instead of `/login`. The "Farmer Login" link already handles returning users; "I'm a Grower" should onboard new ones.
Map/dashboard impact: First-time growers clicking the CTA now land on the registration page instead of being confused by a login form with no account.

### 2. Add password visibility toggles to auth pages
Files: `app/(auth)/login/page.tsx`, `app/(auth)/register/page.tsx`
What changed: Added eye/eye-off toggle buttons inside the password input fields so users can reveal what they typed. Uses `tabIndex={-1}` to keep Tab focus on the input, not the toggle.
Map/dashboard impact: Reduces failed login attempts from typos, especially on mobile where password entry is error-prone. Faster path from landing to the map editor.

### 3. Add loading spinners to auth form buttons
Files: `app/(auth)/login/page.tsx`, `app/(auth)/register/page.tsx`
What changed: Submit buttons now show a spinning `Loader2` icon alongside the loading text ("Signing in..." / "Creating account...") instead of just changing the label. Gives clear visual feedback that the request is in flight.
Map/dashboard impact: Users no longer double-click or wonder if the button worked. Smoother transition into the app.

### 4. Collapse GPS quick actions on dashboard hero card
File: `components/dashboard/farm-hero-card.tsx`
What changed: The 5 GPS action buttons (Plant by GPS, Drop Pin, Take Photo, Soil Test, Walk Zone) are now hidden behind a "Field tools" toggle. The primary CTAs ("Open Map Editor" and "Ask AI") get clear visual priority. GPS actions expand on click with a fade-in animation.
Map/dashboard impact: Dashboard hero card is less visually overwhelming, especially for new users who haven't used GPS field tools yet. The two most important actions (map editor and AI) stand out immediately.

## Watch for
- Register page currently redirects to `/canvas` after signup -- if a new user has no farms, they see the empty canvas state with a walkthrough. This works but could be improved by directing to `/farm/new` for a more guided first experience.
- The register name placeholder was changed from "John Doe" to "Your name" for inclusivity.
- Pre-existing TypeScript errors in admin pages and test files are unrelated to these changes.
