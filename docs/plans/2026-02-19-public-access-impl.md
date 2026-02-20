# Public Access & Registration CTA — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Gate the community gallery behind auth, add contextual registration CTAs to blog/plants/shops pages, and update the register page to show a context-aware headline when redirected from the gallery.

**Architecture:** One shared `RegisterCTA` server component renders a compact card for unauthenticated visitors. Gallery pages add a session check + redirect. Client-component pages (plants index, shops index) get a thin server wrapper so they can receive `isAuthenticated` as a prop. Register page reads `?from` via `useSearchParams`.

**Tech Stack:** Next.js 14 App Router, `lib/auth/session.ts` (`getSession`/`requireAuth`), Tailwind + shadcn/ui, `next/navigation` (`redirect`).

---

### Task 1: Create the `RegisterCTA` server component

**Files:**
- Create: `components/shared/register-cta.tsx`

This is a pure server component (no `'use client'`). It accepts a `variant` prop and renders a compact card with a CTA button pointing to `/register`.

**Step 1: Create the file**

```tsx
// components/shared/register-cta.tsx
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Sprout, BookOpen, Store } from 'lucide-react';

const VARIANTS = {
  blog: {
    icon: BookOpen,
    headline: 'Earn XP for every article you read',
    body: 'Sign up to track your reading progress and unlock farm design tools.',
  },
  plants: {
    icon: Sprout,
    headline: 'Add plants to your farm design',
    body: 'Sign up to build your farm layout with the full plant database.',
  },
  shops: {
    icon: Store,
    headline: 'Sell your own produce',
    body: 'Sign up to create your farm shop and reach your community.',
  },
} as const;

interface RegisterCTAProps {
  variant: keyof typeof VARIANTS;
}

export function RegisterCTA({ variant }: RegisterCTAProps) {
  const { icon: Icon, headline, body } = VARIANTS[variant];

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="pt-6 pb-5 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-primary" />
          <p className="font-semibold text-sm">{headline}</p>
        </div>
        <p className="text-sm text-muted-foreground">{body}</p>
        <Button asChild size="sm" className="w-fit">
          <Link href="/register">Get Started Free</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
```

**Step 2: Verify it compiles**

```bash
npx tsc --noEmit
```
Expected: no errors relating to `register-cta.tsx`.

**Step 3: Commit**

```bash
git add components/shared/register-cta.tsx
git commit -m "feat: add RegisterCTA component with blog/plants/shops variants"
```

---

### Task 2: Gate all gallery pages

**Files:**
- Modify: `app/(app)/gallery/page.tsx`
- Modify: `app/(app)/gallery/trending/page.tsx`
- Modify: `app/(app)/gallery/saved/page.tsx`
- Modify: `app/(app)/gallery/following/page.tsx`
- Modify: `app/(app)/gallery/collections/page.tsx`
- Modify: `app/(app)/gallery/collections/[id]/page.tsx`

**Step 1: Gate `gallery/page.tsx`**

It currently calls `getSession()` at line 305 without redirecting. Add the redirect after the existing session call at the top of the default export:

```typescript
// At the top of the default export function, after existing imports:
import { redirect } from 'next/navigation';

// Inside the page function, right after `const session = await getSession();`:
if (!session) redirect('/register?from=gallery');
```

**Step 2: Gate `gallery/trending/page.tsx`**

Same pattern — it calls `getSession()` without redirecting. Add after the session call:
```typescript
if (!session) redirect('/register?from=gallery');
```

**Step 3: Gate `gallery/saved/page.tsx`**

Currently uses `requireAuth()` which redirects to `/login`. Replace:
```typescript
// Remove:
import { requireAuth } from '@/lib/auth/session';
const session = await requireAuth();

// Add:
import { getSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
const session = await getSession();
if (!session) redirect('/register?from=gallery');
```

**Step 4: Gate `gallery/following/page.tsx`**

Same as saved — replace `requireAuth()` with `getSession()` + manual redirect:
```typescript
import { getSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
const session = await getSession();
if (!session) redirect('/register?from=gallery');
```

**Step 5: Gate `gallery/collections/page.tsx`**

Same pattern — replace `requireAuth()`:
```typescript
import { getSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
const session = await getSession();
if (!session) redirect('/register?from=gallery');
```

**Step 6: Gate `gallery/collections/[id]/page.tsx`**

Already calls `getSession()` at line 16. Add the redirect after it:
```typescript
if (!session) redirect('/register?from=gallery');
```
Also add `import { redirect } from 'next/navigation';` at the top.

**Step 7: Verify**

Run dev server and visit `/gallery` in an incognito/logged-out browser tab. Expected: redirect to `/register?from=gallery`.

**Step 8: Commit**

```bash
git add app/\(app\)/gallery/
git commit -m "feat: redirect unauthenticated users from gallery to register"
```

---

### Task 3: Add CTA to blog pages

**Files:**
- Modify: `app/(app)/learn/blog/page.tsx`
- Modify: `app/(app)/learn/blog/[slug]/page.tsx`

Both are server components that already import `db`. Neither currently calls `getSession()`.

**Step 1: Update `blog/page.tsx`**

Add to the top of the file:
```typescript
import { getSession } from '@/lib/auth/session';
import { RegisterCTA } from '@/components/shared/register-cta';
```

Inside `BlogPage()`, after the existing db queries and before `return`:
```typescript
const session = await getSession();
const isAuthenticated = !!session;
```

In the JSX, find the right column / stats area (around line 80). Add the CTA below the stats grid, only when unauthenticated:
```tsx
{!isAuthenticated && (
  <div className="mt-6">
    <RegisterCTA variant="blog" />
  </div>
)}
```

**Step 2: Update `blog/[slug]/page.tsx`**

It already calls `getSession()` at line 43. Add the import:
```typescript
import { RegisterCTA } from '@/components/shared/register-cta';
```

At the end of the JSX (after the article content, before the closing `</div>`), add:
```tsx
{!userId && (
  <div className="mt-10 max-w-2xl mx-auto">
    <RegisterCTA variant="blog" />
  </div>
)}
```
(`userId` is already defined as `session?.user?.id` — falsy when not logged in.)

**Step 3: Verify**

Visit `/learn/blog` and a blog post while logged out. CTA card should appear. Log in — CTA should not appear.

**Step 4: Commit**

```bash
git add app/\(app\)/learn/blog/
git commit -m "feat: add blog RegisterCTA for unauthenticated visitors"
```

---

### Task 4: Wrap plants index page + add CTA

The plants index (`app/(app)/plants/page.tsx`) is `'use client'` so it can't call `getSession()` directly. Solution: move the client component, make the page file a server wrapper.

**Files:**
- Create: `app/(app)/plants/plants-client.tsx` (move existing component here)
- Modify: `app/(app)/plants/page.tsx` (replace with server wrapper)

**Step 1: Create `plants-client.tsx`**

Copy the entire contents of `app/(app)/plants/page.tsx` into the new file. Change the export name:
```tsx
// app/(app)/plants/plants-client.tsx
'use client';
// ... (all existing imports unchanged) ...

interface PlantsClientProps {
  isAuthenticated: boolean;
}

export function PlantsClient({ isAuthenticated }: PlantsClientProps) {
  // ... all existing component logic unchanged ...

  return (
    // ... existing JSX ...
    // At the bottom of the main content area, add:
    // {!isAuthenticated && <RegisterCTA variant="plants" />}
  );
}
```

Add the CTA import at the top of `plants-client.tsx`:
```typescript
import { RegisterCTA } from '@/components/shared/register-cta';
```

Add the CTA in the JSX — place it after the species grid/list, inside the return:
```tsx
{!isAuthenticated && (
  <div className="mt-8">
    <RegisterCTA variant="plants" />
  </div>
)}
```

**Step 2: Replace `plants/page.tsx` with server wrapper**

```tsx
// app/(app)/plants/page.tsx
import { getSession } from '@/lib/auth/session';
import { PlantsClient } from './plants-client';

export default async function PlantsPage() {
  const session = await getSession();
  return <PlantsClient isAuthenticated={!!session} />;
}
```

**Step 3: Add CTA to plant detail page**

`app/(app)/plants/[id]/page.tsx` is a server component. Add:
```typescript
import { getSession } from '@/lib/auth/session';
import { RegisterCTA } from '@/components/shared/register-cta';
```

Inside `generateMetadata` there's already a db call. In the main page function, add after any existing logic:
```typescript
const session = await getSession();
```

At the end of the JSX return:
```tsx
{!session && (
  <div className="mt-10">
    <RegisterCTA variant="plants" />
  </div>
)}
```

**Step 4: Verify**

Visit `/plants` and a plant detail page while logged out. CTA should appear. Log in — gone.

**Step 5: Commit**

```bash
git add app/\(app\)/plants/
git commit -m "feat: add plants RegisterCTA for unauthenticated visitors"
```

---

### Task 5: Wrap shops index page + add CTA to shop detail

Same pattern as plants — the shops index is `'use client'`.

**Files:**
- Create: `app/(app)/shops/shops-client.tsx`
- Modify: `app/(app)/shops/page.tsx`
- Modify: `app/(app)/shops/[farmId]/page.tsx`

**Step 1: Create `shops-client.tsx`**

Copy the current `app/(app)/shops/page.tsx` contents. Rename:
```tsx
// app/(app)/shops/shops-client.tsx
'use client';
// ... all existing imports ...
import { RegisterCTA } from '@/components/shared/register-cta';

interface ShopsClientProps {
  isAuthenticated: boolean;
}

export function ShopsClient({ isAuthenticated }: ShopsClientProps) {
  // ... all existing state/logic unchanged ...

  return (
    // ... existing JSX ...
    // Add after the shops grid, inside return:
    // {!isAuthenticated && <RegisterCTA variant="shops" />}
  );
}
```

Add CTA at the bottom of the shops grid in the JSX:
```tsx
{!isAuthenticated && (
  <div className="mt-8">
    <RegisterCTA variant="shops" />
  </div>
)}
```

**Step 2: Replace `shops/page.tsx` with server wrapper**

```tsx
// app/(app)/shops/page.tsx
import { getSession } from '@/lib/auth/session';
import { ShopsClient } from './shops-client';

export default async function ShopsPage() {
  const session = await getSession();
  return <ShopsClient isAuthenticated={!!session} />;
}
```

**Step 3: Add CTA to shop detail page**

`app/(app)/shops/[farmId]/page.tsx` is a server component. Add:
```typescript
import { getSession } from '@/lib/auth/session';
import { RegisterCTA } from '@/components/shared/register-cta';
```

Inside the default export, add after existing logic:
```typescript
const session = await getSession();
```

At the end of the JSX:
```tsx
{!session && (
  <div className="mt-10">
    <RegisterCTA variant="shops" />
  </div>
)}
```

**Step 4: Verify**

Visit `/shops` and an individual shop while logged out. CTA should appear.

**Step 5: Commit**

```bash
git add app/\(app\)/shops/
git commit -m "feat: add shops RegisterCTA for unauthenticated visitors"
```

---

### Task 6: Update register page `from` param + remove guest gallery link

**Files:**
- Modify: `app/(auth)/register/page.tsx`

The register page is `'use client'`. It needs to:
1. Read `?from` via `useSearchParams`
2. Show a contextual headline when `from=gallery`
3. Remove the "Browse Gallery as Guest" button (gallery is now gated)

**Step 1: Add `useSearchParams` and contextual headline**

Add to imports:
```typescript
import { useSearchParams } from 'next/navigation';
```

Inside `RegisterPage()`, before the return:
```typescript
const searchParams = useSearchParams();
const from = searchParams.get('from');

const headline =
  from === 'gallery'
    ? 'Join to browse community farm designs'
    : 'Create Account';

const subheadline =
  from === 'gallery'
    ? 'See what other permaculture designers are building.'
    : 'Enter your details to get started';
```

**Step 2: Use the contextual copy in the JSX**

Replace the existing `CardTitle` and `CardDescription`:
```tsx
<CardTitle className="text-3xl font-serif font-bold">
  {headline}
</CardTitle>
<CardDescription>{subheadline}</CardDescription>
```

**Step 3: Remove the "Browse Gallery as Guest" button**

Delete these lines (around line 116–125):
```tsx
<Link href="/gallery" className="w-full">
  <Button
    type="button"
    variant="outline"
    className="w-full"
    size="lg"
  >
    Browse Gallery as Guest
  </Button>
</Link>
```

**Step 4: Wrap in Suspense (required for `useSearchParams` in Next.js)**

`useSearchParams()` requires the component to be wrapped in `<Suspense>`. The register page layout at `app/(auth)/layout.tsx` should already handle this, but if not, wrap the page export:

Check `app/(auth)/layout.tsx`. If it doesn't have a `<Suspense>` wrapper, update `register/page.tsx` to export a wrapper:
```tsx
import { Suspense } from 'react';

function RegisterPageInner() {
  // ... all existing code ...
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterPageInner />
    </Suspense>
  );
}
```

**Step 5: Verify**

1. Visit `/register` — should show "Create Account" headline
2. Visit `/register?from=gallery` — should show "Join to browse community farm designs"
3. Confirm "Browse Gallery as Guest" button is gone

**Step 6: Commit**

```bash
git add app/\(auth\)/register/page.tsx
git commit -m "feat: contextual headline on register page + remove guest gallery link"
```

---

### Task 7: Push and verify end-to-end

**Step 1: Run type check**

```bash
npx tsc --noEmit
```
Expected: no errors.

**Step 2: Manual end-to-end walkthrough (logged out)**

| Action | Expected result |
|---|---|
| Visit `/gallery` | Redirect to `/register?from=gallery` with "Join to browse community farm designs" headline |
| Visit `/gallery/trending` | Same redirect |
| Visit `/learn/blog` | Blog visible, RegisterCTA card present |
| Visit a blog post | Post readable, RegisterCTA at bottom |
| Visit `/plants` | Plants grid visible, RegisterCTA at bottom |
| Visit a plant detail | Plant page visible, RegisterCTA at bottom |
| Visit `/shops` | Shops visible, RegisterCTA at bottom |
| Visit a shop | Shop visible, RegisterCTA at bottom |

**Step 3: Verify logged-in users see no CTAs**

Log in, repeat the public page visits. No CTA cards should appear anywhere.

**Step 4: Push**

```bash
git push origin feature/unified-canvas
```
