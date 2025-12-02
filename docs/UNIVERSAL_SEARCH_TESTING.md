# Universal Search System - Testing Guide

**Date:** 2025-12-01
**Status:** Implementation Complete - Ready for Testing

## Overview

The universal search system has been fully implemented across the PermaCraft application. This document provides a comprehensive testing guide for manual QA.

## Implementation Summary

### Components Created
- ✅ **API Endpoint:** `/api/search` with context-aware queries
- ✅ **useSearch Hook:** Debounced search with 400ms delay, request cancellation
- ✅ **SearchResultItem:** Type-specific result rendering with highlighting
- ✅ **SearchResultsDropdown:** Grouped results with keyboard navigation
- ✅ **UniversalSearch:** Main search component with keyboard shortcuts
- ✅ **SearchShortcutHint:** Platform-aware keyboard hint (⌘K / Ctrl+K)

### Integration Points
- ✅ **Sidebar (Global Context):** Search everything from anywhere
- ✅ **Dashboard (My-Farms Context):** Search personal farms, zones, conversations
- ✅ **Gallery (Community Context):** Search public farms and posts

## Testing Checklist

### Prerequisites
- [ ] User account created and logged in
- [ ] At least 2-3 farms created (mix of public and private)
- [ ] Some zones created in farms
- [ ] At least one AI conversation in a farm
- [ ] Gallery has public posts from other users

---

## 1. Global Search (Sidebar)

**Location:** Left sidebar, available on all pages
**Context:** `global` - searches everything

### Basic Functionality
- [ ] Search bar is visible in sidebar
- [ ] Placeholder text: "Search everything..."
- [ ] Keyboard hint shows "⌘ K" (Mac) or "Ctrl K" (Windows/Linux)
- [ ] Typing shows dropdown with results
- [ ] Clear button (X) appears when typing
- [ ] Click outside closes dropdown

### Search Results by Type
- [ ] **Farms:** Shows both owned and public farms
  - [ ] Farm name highlighted in results
  - [ ] Shows owner name and acres
  - [ ] Farm thumbnail appears if available
  - [ ] Click navigates to `/farm/{id}`

- [ ] **Posts:** Shows public posts from community
  - [ ] Content preview highlighted
  - [ ] Shows author name and timestamp
  - [ ] AI insights show Sparkles icon
  - [ ] AI screenshot thumbnail if available
  - [ ] Click navigates to `/farm/{farm_id}/posts/{id}`

- [ ] **Species:** Shows species database entries
  - [ ] Common name highlighted
  - [ ] Shows scientific name (italic) and layer
  - [ ] Click navigates to `/species/{id}`

- [ ] **Zones:** Shows zones from user's farms only
  - [ ] Zone name highlighted
  - [ ] Shows farm name and zone type
  - [ ] Click navigates to `/farm/{farm_id}#zone-{id}`

- [ ] **Users:** Shows all users
  - [ ] User name highlighted
  - [ ] Shows avatar and farm count
  - [ ] Click navigates to `/user/{id}`

- [ ] **AI Conversations:** Shows user's AI conversations
  - [ ] Conversation title highlighted
  - [ ] Shows farm name and date
  - [ ] Click navigates to `/farm/{farm_id}/ai?conversation={id}`

### Keyboard Navigation
- [ ] Press `Cmd/Ctrl + K` focuses search from any page
- [ ] Arrow Down highlights first result
- [ ] Arrow Down moves to next result
- [ ] Arrow Up moves to previous result
- [ ] Arrow Up from first result returns to input (-1)
- [ ] Enter key navigates to highlighted result
- [ ] Escape closes dropdown and unfocuses input
- [ ] Highlighted result has visible background color

### Edge Cases
- [ ] Typing 1-2 characters shows "Start typing to search..."
- [ ] Typing 3+ characters triggers search
- [ ] No results shows "No matches for {query}" with suggestions
- [ ] Loading spinner appears while searching
- [ ] Fast typing (debounce) doesn't trigger multiple searches
- [ ] Special characters in query don't break search (e.g., `?`, `*`, `%`)

---

## 2. My-Farms Search (Dashboard)

**Location:** Dashboard page (`/dashboard`)
**Context:** `my-farms` - searches only user's content

### Basic Functionality
- [ ] Search bar is visible below page header
- [ ] Max width constraint applied (looks good on wide screens)
- [ ] Placeholder text: "Search your farms, zones, and conversations..."
- [ ] Keyboard hint visible on desktop

### Search Results Scope
- [ ] **Farms:** Shows ONLY user's farms
  - [ ] No public farms from other users appear
  - [ ] All owned farms are searchable

- [ ] **Zones:** Shows ONLY zones in user's farms
  - [ ] Zones from other users don't appear

- [ ] **AI Conversations:** Shows ONLY user's conversations
  - [ ] Other users' conversations don't appear

### Verify Context Isolation
- [ ] **Should NOT appear:**
  - [ ] Posts from other users
  - [ ] Species entries
  - [ ] Other users
  - [ ] Public farms from other users

### Navigation
- [ ] Clicking farm result navigates correctly
- [ ] Clicking zone result navigates to farm with zone hash
- [ ] Clicking AI conversation opens conversation

---

## 3. Community Search (Gallery)

**Location:** Gallery page (`/gallery`)
**Context:** `community` - searches only public content

### Basic Functionality
- [ ] Search bar is visible below page header
- [ ] Full width within centered container
- [ ] Placeholder text: "Search public farms and posts..."
- [ ] Keyboard hint visible on desktop

### Search Results Scope
- [ ] **Farms:** Shows ONLY public farms
  - [ ] Private farms don't appear
  - [ ] Shows farms from all users (if public)

- [ ] **Posts:** Shows ONLY published posts from public farms
  - [ ] Draft posts don't appear
  - [ ] Posts from private farms don't appear
  - [ ] Shows posts from all users

### Verify Context Isolation
- [ ] **Should NOT appear:**
  - [ ] User's private farms
  - [ ] Unpublished posts
  - [ ] Zones
  - [ ] Users
  - [ ] Species
  - [ ] AI conversations

### Privacy Verification
- [ ] Create a private farm → search for it in gallery → should NOT appear
- [ ] Create a post in private farm → should NOT appear
- [ ] Create a post in public farm but don't publish → should NOT appear

---

## 4. Text Highlighting

Test that matched query text is properly highlighted in results:

- [ ] Search "green" → "**Green** Acres Farm" shows bolded
- [ ] Search "swale" → "Built a **swale** system" shows bolded
- [ ] Search "willow" → "**Willow** (Salix species)" shows bolded
- [ ] Case-insensitive: "SWALE" matches "swale"
- [ ] Partial matches work: "farm" matches "**Farm**house Garden"

---

## 5. Performance & UX

### Debouncing
- [ ] Type "test" quickly → only one API call after stopping
- [ ] Pause 400ms → search executes
- [ ] Resume typing → previous request cancelled, new search starts

### Loading States
- [ ] Loading spinner appears during search
- [ ] Spinner replaces search icon (not side-by-side)
- [ ] No "flash" of loading for fast queries
- [ ] Clear button hidden while loading

### Error Handling
- [ ] Network error shows "Search failed. Please try again."
- [ ] Error message has red/warning styling
- [ ] Retry by clearing and typing again works
- [ ] No console errors during normal operation

### Mobile Responsive
- [ ] Search bar full width on mobile
- [ ] Dropdown full width on mobile
- [ ] Keyboard hint hidden on mobile
- [ ] Touch targets at least 44px height
- [ ] Results readable on small screens
- [ ] Keyboard doesn't cover dropdown

---

## 6. Security Testing

### SQL Injection Prevention
- [ ] Search for `' OR '1'='1` → no SQL error
- [ ] Search for `%` → doesn't return all results
- [ ] Search for `_` → doesn't act as wildcard

### XSS Prevention
- [ ] Search for `<script>alert('xss')</script>` → no alert fires
- [ ] Results with `<` or `>` are escaped
- [ ] No raw HTML rendered in results

### Permission Testing
- [ ] Logged out user redirected to login (API returns 401)
- [ ] User A can't see User B's private farms
- [ ] User A can't see User B's zones/conversations
- [ ] Public farms visible to all users

---

## 7. Keyboard Shortcut Hint

### Platform Detection
- [ ] Mac shows "⌘ K"
- [ ] Windows shows "Ctrl K"
- [ ] Linux shows "Ctrl K"

### Visibility
- [ ] Hint visible when input is empty
- [ ] Hint hidden when typing
- [ ] Hint hidden when loading
- [ ] Hint returns when input cleared
- [ ] Hint hidden on mobile (< 768px)

---

## 8. Browser Compatibility

Test in multiple browsers:

### Chrome
- [ ] All features work
- [ ] Keyboard shortcuts work
- [ ] No console errors

### Firefox
- [ ] All features work
- [ ] Keyboard shortcuts work
- [ ] No console errors

### Safari
- [ ] All features work
- [ ] ⌘K shortcut works
- [ ] No console errors

### Edge
- [ ] All features work
- [ ] Ctrl+K shortcut works
- [ ] No console errors

---

## 9. Accessibility Testing

### Keyboard Navigation
- [ ] Can navigate entire search with keyboard only
- [ ] Tab moves between focusable elements
- [ ] Focus visible at all times
- [ ] Escape works consistently

### Screen Reader
- [ ] Search input has proper label
- [ ] Results announced when appearing
- [ ] Highlighted result announced
- [ ] Clear button has aria-label
- [ ] role="combobox" and role="listbox" present
- [ ] aria-expanded changes with dropdown state

### Contrast
- [ ] Text meets WCAG AA contrast ratios
- [ ] Highlighted results clearly visible
- [ ] Muted text still readable

---

## 10. Known Limitations

Document any known issues or limitations:

1. **Species Search:** Species data needs to be seeded in database first
2. **User Search:** May need user profile pages to be created for navigation
3. **AI Conversation Navigation:** Requires AI conversation UI to be implemented
4. **Full-Text Search:** Currently uses SQLite LIKE, could be upgraded to FTS

---

## Testing Notes

**Tester Name:** _______________
**Date:** _______________
**Environment:** _______________

### Issues Found

| Issue # | Severity | Description | Steps to Reproduce | Status |
|---------|----------|-------------|-------------------|--------|
| | | | | |
| | | | | |

### Recommendations

1.
2.
3.

---

## Success Criteria

All tasks marked ✅ when:
- [ ] All basic functionality working
- [ ] All three contexts (global, my-farms, community) work correctly
- [ ] Keyboard navigation smooth and intuitive
- [ ] No security vulnerabilities found
- [ ] Performance acceptable (< 500ms response)
- [ ] Mobile experience good
- [ ] No critical or high-severity bugs

**Status:** [ ] PASS / [ ] FAIL

---

*Generated from implementation completed 2025-12-01*
