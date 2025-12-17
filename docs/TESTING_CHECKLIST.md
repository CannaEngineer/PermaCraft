# Learning System Testing Checklist

This document provides step-by-step manual testing instructions for the educational system.

## Prerequisites

Before testing, ensure:
- [x] Server is running (`npm run dev`)
- [x] Database has seed data loaded
- [x] You have a user account created (sign up if needed)
- [x] You are logged in

---

## Phase 1: Foundation Features

### 1. Learn Main Page (`/learn`)

**Access:** Navigate to http://localhost:3000/learn

#### User Progress Card (Authenticated Users Only)
- [ ] Progress card displays at top of page
- [ ] Shows current level name (Seedling, Sprout, etc.)
- [ ] Shows numeric level (Level 0, 1, etc.)
- [ ] Displays total XP with progress bar
- [ ] Shows XP needed to next level
- [ ] **Recently Earned Badges section** (if any badges earned):
  - [ ] Shows up to 5 recently earned badges
  - [ ] Each badge has icon and name
  - [ ] Gold gradient background styling
  - [ ] "View all badges →" link works

#### Learning Paths Section
- [ ] All 6 learning paths displayed in grid:
  1. Urban Food Producer
  2. Suburban Homesteader
  3. Rural Regenerator
  4. Small Farm Operator
  5. Agro-Tourism Developer
  6. Permaculture Student
- [ ] Each path shows:
  - [ ] Icon
  - [ ] Name and description
  - [ ] Difficulty badge
  - [ ] Estimated lesson count
- [ ] Clicking path card navigates to path detail page (if implemented)
- [ ] Hover effect on cards works

#### Topics and Badges Tabs
- [ ] Two tabs visible: "Browse by Topic" and "Badges"
- [ ] Default tab is "Topics"
- [ ] Badge count shows on Badges tab (e.g., "3/21")

#### Topics Tab
- [ ] All 10 topics displayed:
  1. Introduction to Permaculture
  2. Zone Education
  3. Native First Approach
  4. Polyculture Design
  5. Systems Thinking
  6. Water Management
  7. Soil Building
  8. Urban Permaculture
  9. Food Forests
  10. Economics & Ethics
- [ ] Each topic card shows icon, name, and description
- [ ] Clicking topic navigates to topic detail page

#### Badges Tab
- [ ] Badge grid displays all 21 badges
- [ ] **Earned badges:**
  - [ ] Gold gradient background (yellow-50 to amber-50)
  - [ ] Colored icon (yellow-600)
  - [ ] Full opacity
  - [ ] Shows tier badge
- [ ] **Locked badges:**
  - [ ] Grayscale filter
  - [ ] Reduced opacity (60%)
  - [ ] Shows "🔒 Locked" text
  - [ ] No tier badge
- [ ] **Hover effects:**
  - [ ] Scale up on hover (scale-105)
  - [ ] Locked badges increase opacity on hover
- [ ] **Click interaction:**
  - [ ] Clicking any badge opens detail dialog
  - [ ] Detail dialog shows:
    - [ ] Large badge icon
    - [ ] Badge name and description
    - [ ] Tier, type, and earned/locked status
    - [ ] "How to unlock" section with criteria
  - [ ] Dialog can be closed

---

### 2. Individual Lesson Page (`/learn/lessons/[slug]`)

**Access:** Navigate to a topic, then click on a lesson

#### Lesson Header
- [ ] Breadcrumb navigation shows: Learn > Topic Name > Lesson Name
- [ ] Lesson title displays prominently
- [ ] Description shows below title
- [ ] **If completed:** Green "Completed ✓" badge shows in top right
- [ ] Metadata shows:
  - [ ] Estimated time (e.g., "15 min")
  - [ ] XP reward (e.g., "20 XP")
  - [ ] Difficulty badge

#### Lesson Content
- [ ] Core content renders as formatted markdown
- [ ] Text is readable with proper typography
- [ ] Paragraphs, headings, lists formatted correctly

#### Knowledge Check (Quiz)
- [ ] If lesson has quiz, "Knowledge Check" section appears
- [ ] Each question displays with options
- [ ] Correct answer highlighted in green background
- [ ] Explanation shows under correct answer

#### Attribution
- [ ] If present, source attribution shows
- [ ] License information displays

#### Lesson Completion
**For authenticated, uncompleted lessons:**
- [ ] "Complete Lesson (+XX XP)" button shows
- [ ] Button is clickable and shows loading state
- [ ] Clicking button:
  - [ ] Toast notification appears with XP earned
  - [ ] If badges earned, celebration modal opens:
    - [ ] Shows "🎉 Badge(s) Earned!" title
    - [ ] Lists all newly earned badges with icons
    - [ ] Gold gradient styling
    - [ ] "Awesome!" button closes modal
  - [ ] Page refreshes showing completed state
  - [ ] Completion button disappears
  - [ ] "Completed ✓" badge appears in header
  - [ ] "Back to Learn" button appears

**For completed lessons:**
- [ ] No completion button shows
- [ ] "Back to Learn" button visible

**For unauthenticated users:**
- [ ] "Log in to track progress" button shows
- [ ] Clicking redirects to login page

#### AI Tutor Chat (Authenticated Only)
- [ ] Floating "Ask AI Tutor" button appears in bottom right
- [ ] Clicking button opens chat widget
- [ ] Chat widget shows:
  - [ ] Title: "AI Tutor"
  - [ ] Description with lesson name
  - [ ] Minimize button (chevron down)
  - [ ] Empty state message
- [ ] **Chat interaction:**
  - [ ] Type message in input field
  - [ ] Send button enabled when text entered
  - [ ] Pressing Enter sends message
  - [ ] User message appears right-aligned, blue background
  - [ ] Loading indicator shows (3 bouncing dots)
  - [ ] AI response streams in character by character
  - [ ] AI message appears left-aligned, gray background
  - [ ] Can have multi-turn conversation
  - [ ] Chat scrolls to bottom automatically
- [ ] Minimize button collapses chat to floating button
- [ ] Chat state persists when expanding again

---

### 3. Practice Farms Portfolio (`/learn/practice-farms`)

**Access:** Navigate to http://localhost:3000/learn/practice-farms

#### Empty State (No Practice Farms)
- [ ] Empty state card displays
- [ ] Shows map pin icon
- [ ] Message: "No practice farms yet"
- [ ] Description explains practice farms
- [ ] "Create Your First Practice Farm" button visible
- [ ] Clicking button navigates to `/learn/practice-farms/new`

#### Practice Farms Grid (With Farms)
- [ ] All practice farms display in grid (1-3 columns)
- [ ] Each farm card shows:
  - [ ] Farm name
  - [ ] Associated lesson title (if any) as link
  - [ ] AI grade badge (if submitted)
    - [ ] Green (≥80%), Yellow (≥60%), or Orange (<60%)
  - [ ] Description (if provided)
  - [ ] Creation date
  - [ ] "Reviewed" indicator (if submitted)
  - [ ] "Open" button
  - [ ] "Submit for Review" button (if not submitted)
- [ ] Clicking "Open" navigates to farm detail page
- [ ] Cards have hover shadow effect

#### Header
- [ ] Title: "Practice Farms"
- [ ] Description visible
- [ ] "New Practice Farm" button in top right
- [ ] Clicking button navigates to create page

#### Info Card
- [ ] Info card at bottom explains practice farm system
- [ ] Lists 4 key points about practice farms
- [ ] Blue gradient background

---

### 4. Create Practice Farm (`/learn/practice-farms/new`)

**Access:** Click "New Practice Farm" from portfolio page

#### Form
- [ ] Title: "Create Practice Farm"
- [ ] Description explains purpose
- [ ] **Farm Name field:**
  - [ ] Label: "Farm Name *"
  - [ ] Placeholder text visible
  - [ ] Can type text (max 100 chars)
  - [ ] Required field validation
- [ ] **Description field:**
  - [ ] Label: "Description (Optional)"
  - [ ] Textarea with 4 rows
  - [ ] Character counter shows (0/500)
  - [ ] Counter updates as typing
  - [ ] Can type text (max 500 chars)
- [ ] **Cancel button:**
  - [ ] Goes back to previous page
- [ ] **Create button:**
  - [ ] Shows map pin icon
  - [ ] Text: "Create Practice Farm"
  - [ ] Clicking shows loading state: "Creating..."
  - [ ] On success:
    - [ ] Success toast appears
    - [ ] Redirects to farm detail page

#### Info Card
- [ ] Blue gradient card shows "What happens next?"
- [ ] Lists 4 numbered steps
- [ ] Clear explanation of workflow

---

### 5. Practice Farm Detail (`/learn/practice-farms/[id]`)

**Access:** Click "Open" on any practice farm card

#### Breadcrumb & Header
- [ ] Breadcrumb: Learn > Practice Farms > Farm Name
- [ ] Farm name as title
- [ ] Description shows (if provided)
- [ ] Associated lesson link shows (if applicable)
- [ ] AI grade badge shows in top right (if submitted)
  - [ ] Award icon + score percentage
  - [ ] Color coded: Green/Yellow/Orange

#### Stats Dashboard
- [ ] Three stat cards display:
  1. **Zones:** Shows count (default: 0)
  2. **Plantings:** Shows count (default: 0)
  3. **Created:** Shows formatted date

#### AI Feedback Section (If Submitted)
- [ ] Purple/pink gradient card appears
- [ ] Title: "AI Feedback" with award icon
- [ ] Shows evaluation date
- [ ] **Strengths section:**
  - [ ] Green text: "✓ Strengths"
  - [ ] Bulleted list of strengths
- [ ] **Improvements section** (if any):
  - [ ] Orange text: "→ Areas for Improvement"
  - [ ] Bulleted list of improvements
- [ ] **Suggestions section** (if any):
  - [ ] Blue text: "💡 Specific Suggestions"
  - [ ] Bulleted list of actionable suggestions
- [ ] **Principle Scores:**
  - [ ] Title: "Principle Scores"
  - [ ] Grid layout (2 columns)
  - [ ] Each principle shows:
    - [ ] Formatted name (e.g., "Zone Logic")
    - [ ] Percentage score
    - [ ] Progress bar
    - [ ] Color coded: Green/Yellow/Orange

#### Editor Placeholder
- [ ] Card titled "Farm Editor"
- [ ] Map pin icon
- [ ] "Map Editor Coming Soon" message
- [ ] Lists 4 planned features

#### Action Buttons
- [ ] "Back to Practice Farms" button (left)
- [ ] "Submit for AI Review" button (right, if not submitted)
- [ ] **Submit button click:**
  - [ ] Confirmation dialog opens
  - [ ] Dialog explains evaluation criteria
  - [ ] Lists 4 principle areas
  - [ ] Shows XP reward range (100-500 XP)
  - [ ] Cancel button closes dialog
  - [ ] "Submit for Review" button confirms
  - [ ] On submit:
    - [ ] Loading state shows
    - [ ] Success toast with score and XP
    - [ ] Page refreshes
    - [ ] Feedback section now visible
    - [ ] Submit button disappears

---

## Phase 2: AI Integration Features

### 6. AI Tutor (Tested in Lesson Page Above)
- [x] See "AI Tutor Chat" section in Lesson Page tests

### 7. AI Lesson Personalization API

**Manual Test via Browser Console or Postman:**

```javascript
// In browser console on a lesson page:
fetch('/api/learning/lessons/intro-permaculture-01/personalize')
  .then(r => r.json())
  .then(console.log)
```

**Expected:**
- [ ] Returns JSON with lesson and personalization data
- [ ] `personalization.callouts` array has 2-3 items
- [ ] Each callout has: placement, type, title, content
- [ ] Content is personalized to user context

### 8. Contextual Hints System

**Note:** Requires integration into farm editor. Test API manually:

```javascript
// Test fetching hint
fetch('/api/learning/contextual-hints?trigger=first_zone')
  .then(r => r.json())
  .then(console.log)

// Test dismissing hint (replace HINT_ID with actual ID)
fetch('/api/learning/contextual-hints', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ hint_id: 'HINT_ID' })
}).then(r => r.json()).then(console.log)
```

**Expected:**
- [ ] First call returns hint with lesson info (or null if dismissed)
- [ ] Dismissing returns `{success: true}`
- [ ] Second fetch returns null (hint dismissed)

---

## Automated Tests

### Run Automated API Test Script

```bash
# Make sure server is running first
npm run dev

# In another terminal:
npx tsx scripts/test-learning-system.ts
```

**Expected Output:**
- [ ] All tests pass (green checkmarks)
- [ ] Summary shows: "Passed: 10, Failed: 0"
- [ ] Tests complete in reasonable time (<5 seconds total)

**Tests Covered:**
1. GET /api/learning/paths
2. GET /api/learning/topics
3. GET /api/learning/badges (unauthenticated)
4. GET /api/learning/lessons/[slug]
5. POST /api/learning/practice-farms (create)
6. GET /api/learning/practice-farms/[id]
7. POST /api/learning/practice-farms/[id]/zones (add zone)
8. DELETE /api/learning/practice-farms/[id]
9. GET /api/learning/contextual-hints
10. GET /api/learning/progress

---

## Common Issues & Troubleshooting

### Issue: "Authentication required" errors
**Solution:** Log in at http://localhost:3000/login first

### Issue: "No badges/lessons found"
**Solution:** Run seed scripts to populate database:
```bash
npx tsx lib/db/seed-learning.ts
```

### Issue: AI features not working
**Solution:** Check that OPENROUTER_API_KEY is set in .env.local

### Issue: Practice farm submit fails
**Solution:** Ensure practice farm has at least some zones or plantings (though it can work with empty farms)

### Issue: Toast notifications don't appear
**Solution:** Check browser console for errors, ensure Toaster component is in layout

---

## Test Coverage Summary

✅ **Phase 1 - Foundation**
- Learning paths display
- Topics display
- Lessons rendering
- Lesson completion with XP
- Badge system (21 badges)
- Badge celebration modal
- Badge detail dialog
- Progress tracking
- Recently earned badges

✅ **Phase 2 - AI Integration**
- AI Tutor chat (streaming responses)
- AI practice farm grading
- Practice farm CRUD
- Practice farm portfolio
- AI lesson personalization API
- Contextual hints API

---

## Notes

- **XP System:** Completing lessons awards 10-50 XP, submitting practice farms awards 100-500 XP
- **Levels:** Every 100 XP = 1 level. Level names: Seedling, Sprout, Sapling, Tree, Grove, Forest
- **Badges:** 15 Tier 1 (foundation), 6 Tier 3 (path completion). Tier 2 badges coming in Phase 3
- **Practice Farm Grading:** Evaluates zone logic, native diversity, polyculture, and systems thinking
- **AI Models:** Using `meta-llama/llama-3.2-90b-vision-instruct:free` from OpenRouter

---

**Created:** 2025-12-15
**Last Updated:** 2025-12-15
**Version:** 1.0
