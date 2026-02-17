# Phase 5: Creator Profiles & Social Features — Finish Checklist

> Everything was coded. This is what's left to actually ship it.

---

## 1. Install Dependencies (if missing)

Nothing new was added — all imports use existing packages (`@aws-sdk/client-s3`, `lucide-react`, shadcn components, etc.). Confirm with:

```bash
npm run build
```

If you see missing module errors, run `npm install`.

---

## 2. Run the Database Migration

**This is the most important step.** Without it, every new query will fail.

```bash
turso db shell permaculture-studio < lib/db/migrations/070_user_profiles.sql
```

What it does:
- Adds 9 columns to `users` table (bio, location, website, cover_image_url, social_links, interests, experience_level, climate_zone, profile_visibility)
- Creates `user_follows` table with indexes
- Adds `post_id` column to `collection_items`

**Verify it worked:**

```bash
turso db shell permaculture-studio "PRAGMA table_info(users);"
turso db shell permaculture-studio "PRAGMA table_info(user_follows);"
turso db shell permaculture-studio "PRAGMA table_info(collection_items);"
```

You should see `bio`, `location`, etc. in the users output, `user_follows` should exist, and `collection_items` should have a `post_id` column.

---

## 3. Build & Fix Any TypeScript Errors

```bash
npm run build
```

npm/node weren't available in the dev environment so the build was never run. Expect possible issues:

### Likely issues and fixes

| Symptom | Fix |
|---|---|
| `PostCard` type mismatch | The `Post` interface in `profile-posts-tab.tsx` has `farm_description` which `PostCard` doesn't expect — this is fine (extra props are ignored), but if strict mode complains, remove `farm_description` from the formatted output |
| `onUpdate` type in `profile-posts-tab.tsx` | The callback receives a `Post` object. If the internal `Post` type differs from PostCard's, cast it: `onUpdate={(updated: any) => ...}` |
| Missing `@aws-sdk/client-s3` | Already in `package.json` (used by `lib/storage/r2.ts`). If not: `npm install @aws-sdk/client-s3` |

---

## 4. Lint

```bash
npm run lint
```

Fix anything it flags. The new code follows existing patterns so it should be clean.

---

## 5. Smoke Test Locally

```bash
npm run dev
```

### Test sequence:

1. **Profile page loads** — Click any author name in a post card → should go to `/profile/{id}` (not 404)
2. **Follow a user** — Click Follow on someone's profile → count updates, button toggles to "Following"
3. **Unfollow** — Click again → reverts
4. **Edit profile** — Go to `/profile/edit` → fill in bio, location, interests → Save → verify fields persist on profile page
5. **Avatar upload** — Upload a profile photo → verify it appears
6. **Cover image** — Upload a cover → verify it renders on profile
7. **Following feed** — Go to `/gallery/following` → should show posts from followed users/farms (empty state if you follow nobody)
8. **Following button in gallery** — The "Following" button should appear next to "Saved" and "Trending" on `/gallery`
9. **Who to Follow** — Should exclude users you already follow and show a Follow button
10. **Collections** — Go to `/gallery/collections` → create a collection → add a post via the "Collect" button on any post → verify it appears in the collection
11. **Sidebar "My Profile" link** — Desktop sidebar should show "My Profile" link
12. **Mobile "View Profile"** — Bottom nav profile sheet should have "View Profile" option
13. **Hover card** — The `UserHoverCard` component exists but isn't wired into PostCard/WhoToFollow/TopContributors yet (see Remaining Work below)

---

## 6. Remaining Work (Not Coded Yet)

### 6a. Wire up UserHoverCard into existing components

The `UserHoverCard` component (`components/profile/user-hover-card.tsx`) was created but NOT integrated into the existing components that show author names. To add it:

**`components/feed/post-card.tsx`** — Wrap the author avatar/name click area:

```tsx
import { UserHoverCard } from '@/components/profile/user-hover-card';

// Find the author avatar section and wrap it:
<UserHoverCard userId={post.author.id}>
  <button onClick={() => router.push(`/profile/${post.author.id}`)}>
    <Avatar>...</Avatar>
  </button>
</UserHoverCard>
```

**`components/feed/top-contributors.tsx`** — Same pattern around the avatar/name links.

**`components/feed/who-to-follow.tsx`** — Already has profile links, just wrap with `UserHoverCard`.

### 6b. Notification type for follows

The `notifications` table has a CHECK constraint: `notification_type IN ('comment', 'reply', 'reaction', 'mention')`. The follow notification currently uses `'mention'` as a workaround. To properly support follow notifications:

1. Create a new migration to recreate the notifications table with `'follow'` in the CHECK constraint (SQLite doesn't support ALTER CHECK), OR
2. Just leave it as `'mention'` type — it works, it just labels follow notifications as mentions in any notification UI

### 6c. Profile visibility edge cases

The profile page respects `profile_visibility` but the hover card fetches from `/api/users/[id]` which also checks visibility. If a profile is private, the hover card will show a loading spinner then nothing. Consider adding a better error state to the hover card.

---

## 7. Deploy

```bash
# Make sure migration ran on production Turso first!
turso db shell permaculture-studio < lib/db/migrations/070_user_profiles.sql

# Then deploy
vercel
```

---

## File Inventory

### 31 New Files

```
lib/db/migrations/070_user_profiles.sql

app/api/users/[id]/route.ts
app/api/users/[id]/follow/route.ts
app/api/users/[id]/posts/route.ts
app/api/users/[id]/farms/route.ts
app/api/users/[id]/followers/route.ts
app/api/users/[id]/following/route.ts
app/api/users/me/route.ts
app/api/users/me/avatar/route.ts
app/api/users/me/cover/route.ts
app/api/feed/following/route.ts
app/api/collections/[id]/route.ts
app/api/collections/[id]/items/route.ts
app/api/collections/mine/route.ts

app/(app)/profile/[id]/page.tsx
app/(app)/profile/edit/page.tsx
app/(app)/gallery/following/page.tsx
app/(app)/gallery/collections/page.tsx
app/(app)/gallery/collections/[id]/page.tsx

components/profile/profile-header.tsx
components/profile/profile-tabs.tsx
components/profile/profile-posts-tab.tsx
components/profile/profile-farms-tab.tsx
components/profile/profile-badges-tab.tsx
components/profile/follow-user-button.tsx
components/profile/profile-edit-form.tsx
components/profile/avatar-upload.tsx
components/profile/interest-selector.tsx
components/profile/user-hover-card.tsx
components/collections/collection-card.tsx
components/collections/create-collection-dialog.tsx
components/collections/add-to-collection-dialog.tsx
```

### 8 Modified Files

```
lib/db/schema.ts                          — UserProfile, UserFollow types
app/(app)/layout.tsx                      — passes userId
app/(app)/app-layout-client.tsx           — accepts/passes userId
app/(app)/gallery/page.tsx                — "Following" button
components/feed/who-to-follow.tsx         — excludes followed, adds FollowUserButton
components/feed/post-actions.tsx          — "Add to Collection" button
components/shared/sidebar.tsx             — "My Profile" link
components/shared/bottom-nav-bar.tsx      — "View Profile" in mobile sheet
app/api/collections/route.ts             — POST handler added
```
