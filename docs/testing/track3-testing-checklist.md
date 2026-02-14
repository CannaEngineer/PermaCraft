# Track 3: Collaboration & Presentation - Testing Checklist

## Part 1: Comments System

### Comment Creation
- [ ] Can add general farm comment
- [ ] Can add feature-specific comment (zone, planting, line)
- [ ] Rich text formatting works (bold, italic, lists)
- [ ] Comment appears immediately after posting
- [ ] Comment saved to database
- [ ] User name/email displays on comment

### Comment Replies
- [ ] Click "Reply" shows reply editor
- [ ] Can submit reply
- [ ] Reply appears nested under parent
- [ ] Can reply to replies (multi-level threading)
- [ ] Reply count displays on parent comment (if implemented)

### Comment Management
- [ ] Can mark comment as resolved
- [ ] Resolved badge appears on comment
- [ ] Can delete own comments
- [ ] Cannot delete other users' comments
- [ ] Deleting comment also deletes replies
- [ ] Comment timestamps display correctly ("5 minutes ago", etc.)

### Collaborator Permissions
- [ ] Owner can add comments
- [ ] Editor can add comments
- [ ] Commenter can add comments
- [ ] Viewer can view but not add comments
- [ ] Unauthorized users get 403 error

### Feature Integration
- [ ] Click zone on map shows zone comments
- [ ] Click planting on map shows planting comments
- [ ] Click line on map shows line comments
- [ ] Comment panel updates when switching features
- [ ] General comments accessible from farm settings

## Part 2: Phasing System

### Phase Creation
- [ ] Can create new phase
- [ ] Can set phase name (required)
- [ ] Can set phase description (optional)
- [ ] Can set start date (optional)
- [ ] Can set end date (optional)
- [ ] Can choose phase color
- [ ] Phase appears in phase list immediately

### Phase Management
- [ ] Can edit existing phase
- [ ] Can delete phase
- [ ] Deleting phase unassigns features
- [ ] Phases display in correct order
- [ ] Can reorder phases (if drag-drop implemented)
- [ ] Phase color displays correctly

### Feature Assignment
- [ ] Can assign zone to phase
- [ ] Can assign planting to phase
- [ ] Can assign line to phase
- [ ] Can unassign feature from phase
- [ ] Feature displays phase indicator (color dot, badge)
- [ ] Filter by phase works on map (if implemented)

### Phase Timeline
- [ ] Start/end dates display correctly
- [ ] Date format readable (e.g., "Jan 2024")
- [ ] Phases sorted by start date (if implemented)
- [ ] Visual timeline representation (if implemented)

## Part 3: Export System

### PNG Export
- [ ] "Export as PNG" button works
- [ ] Map captures at 1920x1080
- [ ] PNG file downloads
- [ ] Filename includes farm name and timestamp
- [ ] Image quality good (no blur, artifacts)
- [ ] All visible layers included
- [ ] Annotations/labels visible (if implemented)

### PDF Export
- [ ] "Export as PDF" button works
- [ ] PDF includes map image
- [ ] PDF includes zones list (if checked)
- [ ] PDF includes plantings list (if checked)
- [ ] PDF includes phases list (if checked)
- [ ] PDF formatted correctly (margins, headings)
- [ ] PDF filename includes farm name and timestamp
- [ ] PDF opens in viewer correctly

### Export Options
- [ ] Can toggle zones inclusion
- [ ] Can toggle plantings inclusion
- [ ] Can toggle phases inclusion
- [ ] Unchecked sections excluded from PDF
- [ ] Export progress indicator shows during generation
- [ ] Export success toast appears

### Export Quality
- [ ] Map image in PDF clear and legible
- [ ] Text in PDF readable
- [ ] Zone/planting/phase data accurate
- [ ] PDF file size reasonable (<5MB for typical farm)
- [ ] PDF compatible with Adobe Reader, Preview, Chrome

## Integration Tests

### Comments + Features
- [ ] Comments persist across page refreshes
- [ ] Comments load when clicking different features
- [ ] Resolved comments hidden by default
- [ ] Can show resolved comments (if implemented)
- [ ] Comment count badge on features (if implemented)

### Phases + Map
- [ ] Phase colors display on assigned features
- [ ] Phase filter works (show only Phase 1, etc.)
- [ ] Unassigned features still visible
- [ ] Phase legend displays (if implemented)
- [ ] Timeline slider filters by phase (if implemented)

### Export + All Features
- [ ] PDF includes phased features correctly
- [ ] PDF shows phase assignments
- [ ] PDF export works with custom imagery layers
- [ ] PNG export captures water features
- [ ] Export works with design layer filtering

## Performance Tests
- [ ] Loading 50+ comments performs smoothly
- [ ] Nested replies (5+ levels) render correctly
- [ ] 10+ phases display without lag
- [ ] PDF generation completes in <10 seconds
- [ ] PNG export immediate (<2 seconds)

## Error Handling
- [ ] Empty comment submission blocked
- [ ] Invalid phase dates show error
- [ ] Export failure shows clear error message
- [ ] Permission denied shows proper message
- [ ] Network error gracefully handled

## Browser Compatibility
- [ ] All features work in Chrome
- [ ] All features work in Firefox
- [ ] All features work in Safari
- [ ] All features work in Edge
- [ ] Mobile browser support (if applicable)

---

## Tester Notes

**Environment:**
- URL: http://localhost:3000/farm/[id]
- Test Farm ID: _______________
- Browser: _______________
- Date: _______________

**Issues Found:**
(Record any bugs, unexpected behavior, or UX issues here)

---

## Known Limitations (Track 3)

1. **Comments System:**
   - Requires farm_collaborators record to add comments (permission check)
   - No real-time updates (requires page refresh)
   - No mention/tagging functionality
   - No comment editing after creation

2. **Phasing System:**
   - Drag-drop reordering not implemented (UI placeholder only)
   - Lines table from Track 2 not yet merged (phase_id added but no lines to assign)
   - No visual phase indicators on map features yet
   - No phase-based filtering on map yet

3. **Export System:**
   - PNG export captures canvas only (no UI overlays)
   - PDF generation on server (may timeout on slow connections)
   - No batch export functionality
   - No export history/versioning

4. **Integration:**
   - Comments drawer must be manually opened (no automatic trigger on feature click)
   - No direct link from map feature to comments
   - No comment notifications
   - Export panel not integrated into immersive editor UI yet
