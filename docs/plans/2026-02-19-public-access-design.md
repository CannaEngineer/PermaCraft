# Public Access & Registration CTA Design

**Date:** 2026-02-19
**Branch:** feature/unified-canvas

---

## Goal

Unauthenticated users can browse the blog, plants database, and farm shops freely. The community gallery is gated behind registration. Public pages surface contextual CTAs inviting visitors to register for the features they'd naturally want next.

---

## Access Matrix

| Route | Unauthenticated | Change needed |
|---|---|---|
| `/` | Public landing | None |
| `/learn/blog`, `/learn/blog/[slug]` | Public | Add CTA component |
| `/plants`, `/plants/[id]` | Public | Add CTA component |
| `/shops`, `/shops/[farmId]` | Public | Add CTA component |
| `/gallery` and all sub-routes | Currently open | Add auth redirect |
| `/canvas`, `/learn` paths | Redirects to login | None |

---

## Section 1 — Gallery Gating

Add a session check at the top of every gallery server component. No session → `redirect('/register?from=gallery')`.

**Affected pages:**
- `app/(app)/gallery/page.tsx`
- `app/(app)/gallery/trending/page.tsx`
- `app/(app)/gallery/saved/page.tsx`
- `app/(app)/gallery/following/page.tsx`
- `app/(app)/gallery/collections/page.tsx`
- `app/(app)/gallery/collections/[id]/page.tsx`

Pages that already call `requireAuth()` (saved, following, collections) are already handled — just verify they redirect to `/register?from=gallery` rather than `/login`.

---

## Section 2 — Contextual CTA Component

One shared component: `components/shared/register-cta.tsx`

```tsx
// Props
interface RegisterCTAProps {
  variant: 'blog' | 'plants' | 'shops';
}
```

Renders as a compact card (not a full-page wall). Hidden for authenticated users — the server component passes `isAuthenticated` and only renders the CTA when `false`.

**Copy by variant:**

| Variant | Headline | Body | Button |
|---|---|---|---|
| `blog` | Earn XP for reading | Sign up to track your progress and unlock farm design tools. | Get Started Free |
| `plants` | Build your farm with these plants | Sign up to add plants directly to your farm design. | Get Started Free |
| `shops` | Sell your own produce | Sign up to create your farm shop and reach your community. | Get Started Free |

All buttons link to `/register`.

**Placement:**
- Blog index (`/learn/blog`): card in the right column / sticky sidebar area
- Blog post (`/learn/blog/[slug]`): card at the bottom, after article content
- Plants index (`/plants`): card below the plant grid header
- Plant detail (`/plants/[id]`): card at the bottom of the page
- Shop index (`/shops`): card below the shops grid header
- Shop detail (`/shops/[farmId]`): card at the bottom of the page

---

## Section 3 — Register Page `from` Param

The existing register page (`app/(auth)/register/page.tsx`) reads `?from` from the URL client-side and swaps the headline:

| `from` value | Headline |
|---|---|
| `gallery` | Join to browse community farm designs |
| *(none)* | Existing default copy |

No changes to the form, validation, or post-registration redirect.

---

## Out of Scope

- Teaser/blurred gallery preview
- Email capture for non-registered visitors
- Changes to login flow
- Changes to `/canvas` or `/learn` gating (already correct)
