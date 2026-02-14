# Track 4: Advanced Features - Testing Checklist

## Part 1: Guild Builder

### Guild Template Creation
- [ ] Can view pre-seeded guild templates
- [ ] Templates filtered by climate zone
- [ ] Template details display correctly
- [ ] Can create custom guild template
- [ ] Can edit existing custom template
- [ ] Can delete custom template

### AI Guild Suggestions
- [ ] "Get AI Suggestions" button works
- [ ] Loading indicator shows during AI request
- [ ] AI returns valid guild suggestions
- [ ] Suggested companions display correctly
- [ ] Can adjust preferences (native, edible)
- [ ] Preferences affect AI suggestions
- [ ] Can remove individual companions
- [ ] Can save AI-suggested guild as template

### Guild Designer UI
- [ ] Guild name input editable
- [ ] Focal species displays correctly
- [ ] Companion species cards render
- [ ] Spacing information shown (min-max feet, count)
- [ ] Layer badges display
- [ ] Benefit badges display
- [ ] Explanation text readable
- [ ] Drag-to-reorder works (if implemented)

### Guild Placement on Map
- [ ] Can select guild template
- [ ] Click map to place guild center
- [ ] Focal species placed at center
- [ ] Companions placed at correct distances
- [ ] Companion positions respect spacing rules
- [ ] All plantings created in database
- [ ] Guild plantings visible on map immediately
- [ ] Can assign guild plantings to layer/phase

## Part 2: Offline Mode

### Service Worker
- [ ] Service worker registers successfully
- [ ] Service worker activates
- [ ] Static assets cached
- [ ] Map tiles cached
- [ ] API responses cached
- [ ] Cache updates on new deployment

### IndexedDB Storage
- [ ] Farm data saved to IndexedDB
- [ ] Zones saved to IndexedDB
- [ ] Plantings saved to IndexedDB
- [ ] Lines saved to IndexedDB
- [ ] Data persists across page refreshes
- [ ] Can query data from IndexedDB

### Offline Functionality
- [ ] App loads when offline
- [ ] Can view cached farm data offline
- [ ] Can view map tiles offline
- [ ] Can create zone offline
- [ ] Can create planting offline
- [ ] Can create line offline
- [ ] Can edit features offline
- [ ] Can delete features offline
- [ ] Offline indicator appears when disconnected

### Offline Queue
- [ ] Offline changes queued in IndexedDB
- [ ] Queue count displays correctly
- [ ] Queue persists across page refreshes
- [ ] Can view queued changes (if implemented)

### Sync Manager
- [ ] Auto-sync triggered when back online
- [ ] Manual "Sync Now" button works
- [ ] Queued creates sync correctly
- [ ] Queued updates sync correctly
- [ ] Queued deletes sync correctly
- [ ] Sync success toast appears
- [ ] Queue cleared after successful sync
- [ ] Failed syncs show error message
- [ ] Failed changes remain in queue

### Offline Indicator
- [ ] Offline badge shows when disconnected
- [ ] Pending changes count displays
- [ ] Sync button appears when online with pending changes
- [ ] Indicator hides when online with no pending changes
- [ ] Syncing spinner shows during sync
- [ ] Indicator updates after sync

## Integration Tests

### Guild + Map
- [ ] Guild placement respects farm boundaries
- [ ] Guild companions avoid overlapping existing features
- [ ] Guild plantings filterable by layer
- [ ] Guild plantings assignable to phase
- [ ] Can add annotations to guild plantings

### Offline + All Features
- [ ] Can work with zones offline
- [ ] Can work with plantings offline
- [ ] Can work with lines offline
- [ ] Can work with water features offline
- [ ] Can work with custom imagery offline
- [ ] Comments created offline sync correctly
- [ ] Phase assignments offline sync correctly

## Performance Tests
- [ ] AI guild suggestion completes in <10 seconds
- [ ] Guild placement of 10+ companions smooth
- [ ] IndexedDB operations fast (<100ms)
- [ ] Sync of 50+ changes completes in <30 seconds
- [ ] Service worker cache size reasonable (<50MB)

## Error Handling
- [ ] AI suggestion timeout handled gracefully
- [ ] Invalid guild template shows error
- [ ] Offline queue corruption handled
- [ ] Sync conflict resolution works (if implemented)
- [ ] Network error during sync shows message

## Edge Cases
- [ ] Work offline, go online, sync, go offline, make changes, sync again
- [ ] Multiple tabs open with offline changes
- [ ] Service worker update while offline
- [ ] Large offline queue (100+ changes)
- [ ] Sync while user making new offline changes

## Browser Compatibility
- [ ] Service Worker works in Chrome
- [ ] Service Worker works in Firefox
- [ ] Service Worker works in Safari
- [ ] IndexedDB works in all browsers
- [ ] Offline mode works on mobile browsers

---

**Tester Notes:**

**Environment:**
- URL: http://localhost:3000/farm/[id]
- Test Farm ID: _______________
- Browser: _______________
- Date: _______________

**Issues Found:**
(Record any bugs, unexpected behavior, or UX issues here)
