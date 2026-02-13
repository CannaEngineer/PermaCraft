# Learn Page Dashboard Redesign

**Date:** 2026-02-13
**Status:** Design Approved - Ready for Implementation

## Overview

Redesign the `/learn` page to provide a focused, state-based experience: when users have no active learning path, present a wizard-style path selection interface; when they have an active path, transform `/learn` into a dedicated dashboard for that path.

## Problem Statement

The current `/learn` page shows all learning paths regardless of whether a user has selected one, creating visual clutter and unclear navigation. Users need a clearer distinction between:
1. Choosing a learning path (decision-making mode)
2. Following their chosen path (learning mode)

## Design Goals

- **Focus:** When following a path, keep users focused on their curriculum without distractions
- **Guidance:** Help new users choose the right path through personalized recommendations
- **Motivation:** Show progress and achievements to encourage continued learning
- **Intentional path switching:** Make switching paths possible but require deliberate action to prevent accidents

## Architecture

### State Machine Approach

The `/learn` page implements three primary states determined by server-side data:

```typescript
async function getLearnPageState(userId: string) {
  const progress = await getUserProgress(userId);
  const activePath = progress?.learning_path_id;

  if (!activePath) {
    return { state: 'wizard', data: { paths: await getAllPaths() } };
  }

  const pathDetails = await getActivePathDetails(userId, activePath);
  const isComplete = pathDetails.completedLessons === pathDetails.totalLessons;

  if (isComplete) {
    return { state: 'celebration', data: pathDetails };
  }

  return { state: 'dashboard', data: pathDetails };
}
```

### State Definitions

**State: `wizard`**
- **Trigger:** User has no active learning path
- **UI:** Multi-step wizard that asks questions and recommends a path
- **Exit:** User selects a path → transitions to `dashboard`

**State: `dashboard`**
- **Trigger:** User has an active path with incomplete lessons
- **UI:** Progress hero, next lesson CTA, curriculum view, earned badges
- **Exit:** User completes final lesson → transitions to `celebration`

**State: `celebration`**
- **Trigger:** User completes all lessons in their path
- **UI:** Full-screen celebration with stats and completion badge
- **Exit:** After 3 seconds, auto-transitions to `wizard` for next path selection

### URL Structure

**Single URL:** `/learn` - no redirects or route changes between states

This creates a simple mental model: "/learn is where I learn" regardless of current state.

## Component Structure

### Page Component

**File:** `app/(app)/learn/page.tsx`

```typescript
// Server component that fetches state and delegates rendering
export default async function LearnPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const pageState = await getLearnPageState(session.user.id);

  return (
    <div className="min-h-screen">
      <LearnPageHeader
        hasActivePath={pageState.state === 'dashboard'}
        pathName={pageState.state === 'dashboard' ? pageState.data.path.name : null}
      />

      {pageState.state === 'wizard' && <PathSelectionWizard paths={pageState.data.paths} />}
      {pageState.state === 'dashboard' && <PathDashboard data={pageState.data} />}
      {pageState.state === 'celebration' && <PathCelebration data={pageState.data} />}
    </div>
  );
}
```

### New Components

#### 1. LearnPageHeader

**Location:** `components/learning/learn-page-header.tsx`
**Type:** Client component (for interactive menu)

**Purpose:** Consistent header across all states with settings menu for path switching

**Props:**
- `hasActivePath: boolean` - Whether user has an active path
- `pathName: string | null` - Name of active path (if any)

**UI Elements:**
- Title: "Choose Your Path" (wizard) or path name (dashboard/celebration)
- Settings icon (three dots) in top-right corner
- Dropdown menu:
  - "Switch Path" (triggers wizard)
  - "View All Topics" (links to `/learn/topics`)
  - "View All Badges" (links to `/learn/badges`)

#### 2. PathSelectionWizard

**Location:** `components/learning/path-selection-wizard.tsx`
**Type:** Client component

**Purpose:** Multi-step wizard that personalizes path recommendations

**Steps:**

1. **Property Size Selection**
   - Question: "How much land do you have?"
   - Options (illustrated cards):
     - Balcony/Patio
     - Small Yard (< 0.5 acre)
     - Suburban Lot (0.5-2 acres)
     - Rural Property (2-20 acres)
     - Farm (20+ acres)

2. **Experience Level**
   - Question: "What's your experience level?"
   - Options:
     - New to Permaculture
     - Some Knowledge
     - Experienced Practitioner

3. **Recommendation**
   - Shows recommended path with large featured card
   - Explanation: "Based on your answers, we recommend..."
   - Primary CTA: "Start This Path"
   - Secondary option: "Browse All Paths" → expands to grid view

**API Integration:**
- GET `/api/learning/wizard-recommendations?land_size=X&experience=Y`
- POST `/api/learning/set-path` with selected path ID

#### 3. PathDashboard

**Location:** `components/learning/path-dashboard.tsx`
**Type:** Server component with client sub-components

**Purpose:** Main learning hub showing progress and curriculum

**Layout Sections:**

1. **Hero Section** (gradient background)
   - Path name with icon
   - Stats row: Level badge | XP counter | X/Y lessons complete
   - Progress bar (horizontal, full-width)
   - "Continue Learning" button (large, primary CTA) → next incomplete lesson

2. **Curriculum Section**
   - Heading: "Your Learning Path"
   - Topics organized as cards or accordions
   - Each topic shows:
     - Topic icon and name
     - Progress: X/Y lessons complete
     - Lesson list with completion indicators:
       - ✓ Checkmark for completed
       - ▶ Play icon for next lesson
       - ○ Circle for upcoming lessons
   - Click lesson → navigate to `/learn/lessons/[slug]`

3. **Achievements Section**
   - Heading: "Your Badges"
   - Horizontal scrollable carousel of earned badges
   - Each badge shows icon and name
   - Empty state: "Complete lessons to earn badges!"

**Data Structure:**
```typescript
interface PathDashboardData {
  path: LearningPath;
  totalLessons: number;
  completedLessons: number;
  percentComplete: number;
  nextLesson: Lesson | null;
  curriculumByTopic: {
    topic: Topic;
    lessons: (Lesson & { isCompleted: boolean })[];
  }[];
  earnedBadges: Badge[];
  userProgress: UserProgress;
}
```

#### 4. PathCelebration

**Location:** `components/learning/path-celebration.tsx`
**Type:** Client component

**Purpose:** Celebrate path completion and transition to next path

**UI Elements:**
- Full-screen overlay (backdrop blur)
- Confetti animation (using canvas or library like `react-confetti`)
- Large badge icon (path completion badge)
- Heading: "Path Complete! 🎉"
- Subheading: Path name
- Stats cards (grid layout):
  - X Lessons Completed
  - Y XP Earned
  - Path Mastered
- Auto-transition after 3 seconds to wizard
- Manual advance: "Choose Next Path" button

**Transition Logic:**
```typescript
useEffect(() => {
  const timer = setTimeout(() => {
    // Clear completion state and trigger wizard
    router.refresh();
  }, 3000);

  return () => clearTimeout(timer);
}, []);
```

## Data Flow

### Server-Side Data Fetching

**Primary Function:** `getLearnPageState(userId: string)`

```typescript
async function getLearnPageState(userId: string) {
  // 1. Get user progress
  const progressResult = await db.execute({
    sql: 'SELECT * FROM user_progress WHERE user_id = ?',
    args: [userId]
  });
  const progress = progressResult.rows[0];

  // 2. No path → wizard state
  if (!progress?.learning_path_id) {
    const pathsResult = await db.execute(
      'SELECT * FROM learning_paths ORDER BY difficulty, name'
    );
    return { state: 'wizard', data: { paths: pathsResult.rows } };
  }

  // 3. Has path → fetch complete dashboard data
  const pathDetails = await getActivePathDetails(userId, progress.learning_path_id);

  // 4. Check completion
  const isComplete = pathDetails.completedLessons === pathDetails.totalLessons;

  return isComplete
    ? { state: 'celebration', data: pathDetails }
    : { state: 'dashboard', data: pathDetails };
}
```

**Supporting Function:** `getActivePathDetails(userId: string, pathId: string)`

Fetches comprehensive dashboard data:
- Path information
- All lessons in path grouped by topic
- Completion status for each lesson
- Progress statistics
- Next incomplete lesson
- Earned badges

### API Routes

#### POST `/api/learning/set-path`

**Purpose:** Set or change user's active learning path

**Request Body:**
```json
{
  "learning_path_id": "urban-food-producer"
}
```

**Response:**
```json
{
  "success": true,
  "path": { "id": "...", "name": "..." }
}
```

**Side Effects:**
- Updates `user_progress.learning_path_id`
- Creates `user_progress` record if doesn't exist
- Returns success → client calls `router.refresh()`

#### GET `/api/learning/wizard-recommendations`

**Purpose:** Get personalized path recommendations based on wizard answers

**Query Parameters:**
- `land_size`: "balcony" | "small_yard" | "suburban" | "rural" | "farm"
- `experience`: "beginner" | "intermediate" | "advanced"

**Response:**
```json
{
  "recommended": {
    "path": { /* path object */ },
    "matchScore": 95,
    "reasons": ["Matches your property size", "Suitable for beginners"]
  },
  "alternatives": [
    { "path": { /* ... */ }, "matchScore": 75 }
  ]
}
```

**Matching Algorithm:**
```typescript
function calculateMatch(path, answers) {
  let score = 0;

  // Land size matching
  if (answers.land_size === 'balcony' && path.slug === 'urban-food-producer') score += 40;
  if (answers.land_size === 'suburban' && path.slug === 'suburban-homesteader') score += 40;
  // ... etc

  // Experience matching
  if (answers.experience === path.difficulty) score += 30;
  if (answers.experience === 'beginner' && path.difficulty === 'beginner') score += 20;

  // Default foundations path for comprehensive learners
  if (path.slug === 'permaculture-student') score += 10;

  return score;
}
```

### State Transitions

All state changes trigger `router.refresh()` to re-fetch server state:

1. **Wizard → Dashboard**
   - User clicks "Start This Path"
   - API call to `/api/learning/set-path`
   - On success: `router.refresh()` → page re-renders as dashboard

2. **Dashboard → Celebration**
   - User completes final lesson in path
   - Lesson completion API updates progress
   - Next visit to `/learn` detects completion → renders celebration

3. **Celebration → Wizard**
   - After 3 seconds (or manual click)
   - Client-side: Clear completion flag
   - `router.refresh()` → wizard renders for new path selection

4. **Any State → Wizard (Path Switching)**
   - User clicks settings menu → "Switch Path"
   - Confirmation dialog: "Switch to a new path? Your progress will be saved."
   - On confirm: Set `learning_path_id` to null
   - `router.refresh()` → wizard renders

## UI/UX Details

### Wizard Flow

**Visual Design:**
- Clean, focused interface
- One question per screen
- Progress indicator: Step X of 3
- Large, illustrated cards for options
- Auto-advance on selection (no "Next" button needed for Q1 & Q2)

**Wizard Navigation:**
- Back button available (except on recommendation step)
- Can exit wizard at any time (if accessed via "Switch Path")
- Breadcrumbs show progress

### Dashboard Layout

**Responsive Behavior:**
- Desktop: Side-by-side curriculum topics
- Tablet: Single column, topics collapsible
- Mobile: Topics start collapsed, stats in 2x2 grid

**Curriculum Organization:**
- Group lessons by topic
- Show topic completion progress
- Visual hierarchy: Next lesson most prominent
- Completed lessons muted but visible (sense of accomplishment)

**Interaction Patterns:**
- Hover on lesson → show description tooltip
- Click lesson → navigate to lesson page
- Click topic → collapse/expand lesson list
- Click badge → show badge detail modal

### Celebration Animation

**Sequence:**
1. Confetti bursts from top (2 seconds)
2. Badge scales in with bounce animation (0.5s delay)
3. Stats cards fade in one by one (0.1s stagger)
4. After 3s: Fade out celebration, fade in wizard

**Early Exit:**
- "Choose Next Path" button always visible
- Clicking skips to wizard immediately

### Settings Menu

**Menu Items:**
- Switch Path (with confirmation dialog)
- View All Topics → `/learn/topics`
- View All Badges → `/learn/badges`

**Confirmation Dialog:**
```
Title: Switch Learning Path?
Message: Your progress in [Current Path] will be saved, and you can return to it anytime.
Actions: [Cancel] [Switch Path]
```

## Error Handling & Edge Cases

### Error States

**Failed to Load Learning Data:**
- Show error boundary component
- Message: "Unable to load your learning page"
- Actions: [Retry] button
- Fallback: Basic "Choose a Path" interface

**API Call Failures:**
- Toast notification: "Failed to [action]. Please try again."
- Keep current UI state until success confirmed
- Add loading spinners to action buttons
- Disable buttons during API calls to prevent double-submission

**No Lessons in Path:**
- Should not occur after path_lessons population
- Graceful fallback: "This path is being updated. Please check back soon."
- Allow path switching via settings menu

### Edge Cases

**User Completes Path on Different Device:**
- Celebration triggers on next `/learn` visit from any device
- Use database state as source of truth (not local storage)

**Switching Paths Mid-Progress:**
- Show confirmation dialog with clear messaging
- Previous progress persists in database
- Can switch back later (progress intact)
- Dashboard immediately shows new path after confirmation

**First-Time Users Without Session:**
- Redirect to `/login` with return URL
- Or show wizard in "preview mode" with signup prompt
- Don't allow path selection without authentication

**Rapid Path Switching:**
- Debounce API calls to prevent race conditions
- Show loading state during transitions
- Optimistic UI updates with rollback on error

### Mobile Responsive Behavior

**Wizard:**
- Cards stack vertically on mobile
- Larger touch targets (min 44px height)
- Full-screen experience (no distractions)

**Dashboard:**
- Stats collapse to 2x2 grid
- Topics start collapsed on mobile
- Sticky "Continue" button at bottom
- Badges carousel with swipe gesture

**Settings Menu:**
- Mobile-friendly dropdown (bottom sheet on iOS-style)
- Large touch targets for menu items
- Clear close button

### Performance Considerations

**Server-Side Rendering:**
- Initial page load server-rendered for fast first paint
- All data fetched in single query pass
- Minimize client-side hydration cost

**Client Components:**
- Only wizard, settings menu, and celebration are client components
- Dashboard curriculum can be server-rendered
- Use React Server Components where possible

**Prefetching:**
- Prefetch next lesson on dashboard hover
- Preload celebration assets when user is near completion
- Lazy load badge images in carousel

**Caching:**
- Cache learning state for 5 minutes
- Avoid mid-session state changes from other devices
- Use SWR or similar for client-side data freshness

## Testing Strategy

### Manual Testing Checklist

**Wizard Flow:**
- [ ] First visit shows wizard
- [ ] All question options are selectable
- [ ] Recommendation matches selected answers
- [ ] "Browse All Paths" expands grid correctly
- [ ] Path selection saves to database
- [ ] Page refreshes and shows dashboard

**Dashboard State:**
- [ ] Progress stats are accurate
- [ ] "Continue" button links to correct next lesson
- [ ] Curriculum shows all topics
- [ ] Lessons have correct completion indicators
- [ ] Earned badges display in carousel
- [ ] Settings menu is accessible

**Path Switching:**
- [ ] Settings → "Switch Path" opens wizard
- [ ] Confirmation dialog appears
- [ ] Selecting new path updates dashboard
- [ ] Previous path progress is preserved

**Celebration Flow:**
- [ ] Triggers after completing final lesson
- [ ] Shows correct completion stats
- [ ] Auto-transitions to wizard after 3 seconds
- [ ] Manual advance button works
- [ ] Confetti animation plays smoothly

**Responsive Design:**
- [ ] Wizard works on mobile (320px width)
- [ ] Dashboard layouts properly on tablet/mobile
- [ ] Settings menu accessible on all screen sizes
- [ ] Touch targets are adequate size

### Integration Points

**Verify:**
- Lesson completion updates dashboard progress immediately
- Badge unlocks appear in achievements section
- XP gains reflect in dashboard stats
- Navigation `/learn` ↔ `/learn/lessons/[slug]` works smoothly
- Sidebar "Learn" link correctly highlights when on `/learn`

### Data Validation

**Database Checks:**
- Verify path lesson counts match populated data
- Ensure progress calculations handle 0 lessons
- Test with multiple users (data isolation)
- Verify celebration triggers only at 100% completion

## Implementation Notes

### File Changes

**New Files:**
- `components/learning/learn-page-header.tsx`
- `components/learning/path-selection-wizard.tsx`
- `components/learning/path-dashboard.tsx`
- `components/learning/path-celebration.tsx`
- `app/api/learning/wizard-recommendations/route.ts`

**Modified Files:**
- `app/(app)/learn/page.tsx` - Complete rewrite with state machine
- `app/api/learning/set-path/route.ts` - Add confirmation handling

**Potentially Removed:**
- Current path selection UI in `components/learning/path-selector.tsx` (replaced by wizard)
- Featured path card logic (replaced by wizard recommendation)

### Dependencies

**Existing:**
- All shadcn/ui components already available
- MapLibre, Better Auth, Turso client in place

**Potential New:**
- `react-confetti` for celebration animation (optional - can use CSS)
- Animation library if needed (or use Framer Motion already in project)

### Migration Strategy

**Launch Approach:**
1. Build all new components in parallel with existing page
2. Feature flag: `NEXT_PUBLIC_USE_NEW_LEARN_PAGE=true`
3. Test thoroughly with flag enabled
4. Switch flag to true for production
5. Monitor for issues, can quickly revert if needed
6. After stable 1-2 weeks, remove old code

**User Impact:**
- Existing users with active paths see new dashboard immediately
- In-progress learning not affected
- Better UX for new users choosing paths

## Success Metrics

**Engagement:**
- Increase in daily active learners (return rate to `/learn`)
- Lesson completion rate within 24h of visiting dashboard
- Path completion rate (users who finish entire path)

**UX Validation:**
- Reduced time from signup to path selection
- Lower path switching rate (users pick right path first time)
- Increased session duration on `/learn` page

**Qualitative:**
- User feedback on focused dashboard experience
- Wizard completion rate (users who complete all 3 steps)
- Celebration visibility (users who see celebration screen)

## Future Enhancements

**Post-MVP Ideas:**
- Daily streak counter on dashboard
- Path recommendations based on completed lessons
- "Resume where you left off" on other devices
- Social features: Share completion badges
- Path switching with progress comparison view
- Custom path creation (advanced users)

---

**Design Status:** ✅ Approved
**Next Step:** Create implementation plan with superpowers:writing-plans skill
