# Track 2: Drawing & Water System - Testing Checklist

## Part 1: Line/Polyline Drawing

### Line Drawing
- [ ] Click "Draw Line" button activates line drawing mode
- [ ] Click points on map to draw line
- [ ] Double-click or press Enter to finish line
- [ ] Line form appears after drawing
- [ ] Can select line type (swale, flow_path, fence, hedge, contour, custom)
- [ ] Changing line type auto-applies default style
- [ ] Can customize color, width, dash pattern, arrows, opacity
- [ ] Can add optional label
- [ ] "Create Line" saves to database
- [ ] Line appears on map immediately after creation

### Line Rendering
- [ ] Saved lines load correctly on page refresh
- [ ] Line colors display correctly
- [ ] Line widths render accurately
- [ ] Dash patterns (solid, dashed, dotted) work
- [ ] Arrows display on flow_path lines
- [ ] Arrow direction (forward, reverse, both) works
- [ ] Line opacity applies correctly
- [ ] Lines layer below zones for proper stacking

### Line Editing (if implemented)
- [ ] Can click line to select
- [ ] Can edit line properties (color, width, etc.)
- [ ] Can delete line
- [ ] Changes save to database

## Part 2: Water Design Toolkit

### Catchment Calculator
- [ ] Opens when zone is selected
- [ ] Can input annual rainfall (inches)
- [ ] "Calculate Catchment" button works
- [ ] Displays area in square feet and acres
- [ ] Displays estimated annual capture in gallons
- [ ] Shows daily average
- [ ] Saves catchment properties to zone
- [ ] Can link to destination feature (swale, pond)

### Swale Designer
- [ ] Opens for swale-type zones or lines
- [ ] Can input width (feet)
- [ ] Can input depth (feet)
- [ ] Cross-section diagram displays
- [ ] "Calculate Volume" button works
- [ ] Displays length in feet and meters
- [ ] Displays capacity in gallons
- [ ] Displays volume in cubic feet and liters
- [ ] Saves swale properties to zone

### Water Connections
- [ ] Water connection picker loads all zones and lines
- [ ] Can select source feature
- [ ] Can select destination feature
- [ ] Connections save to water_properties
- [ ] Flow paths render with arrows pointing to destination

### Water System Panel
- [ ] Summary tab shows total capture gallons
- [ ] Summary tab shows total swale capacity
- [ ] Feature counts display correctly
- [ ] Catchments tab lists all catchment zones
- [ ] Catchments show annual capture and rainfall
- [ ] Swales tab lists all swale zones
- [ ] Swales show capacity, length, and dimensions
- [ ] Can navigate between tabs

## Part 3: Custom Imagery Upload

### Upload Flow
- [ ] Upload button opens file picker
- [ ] Can select image file (PNG, JPEG, TIFF)
- [ ] Can enter label for imagery
- [ ] Upload initiates with progress indicator
- [ ] Signed URL generated successfully
- [ ] File uploads to R2 bucket
- [ ] Imagery record created in database

### Processing
- [ ] Processing status shows "Pending" initially
- [ ] Status changes to "Processing" when started
- [ ] Progress bar displays during processing
- [ ] Status changes to "Completed" when done
- [ ] Tiles generated successfully
- [ ] Tile URL template saved to database
- [ ] Failed uploads show "Failed" status with error message

### Alignment Tool
- [ ] Alignment tool opens after upload
- [ ] Map displays with satellite base layer
- [ ] 4 corner markers appear
- [ ] Markers are draggable
- [ ] Corner coordinates update in real-time
- [ ] "Save Alignment" button saves corners to database
- [ ] Alignment corners persist on page refresh

### Imagery Display
- [ ] Custom imagery layer selector lists all uploaded imagery
- [ ] Toggle switch shows/hides imagery on map
- [ ] Eye icon indicates visibility status
- [ ] Opacity slider controls imagery transparency (0-100%)
- [ ] Opacity changes reflect on map immediately
- [ ] Multiple imagery layers can be visible simultaneously
- [ ] Imagery layers render within bounds
- [ ] Imagery aligns correctly with satellite layer

### Imagery Layer Management
- [ ] Can reorder imagery layers (if implemented)
- [ ] Can delete imagery layer
- [ ] Deletion removes from database and R2
- [ ] Imagery persists across page refreshes

## Integration Tests

### Track 1 Integration
- [ ] Lines respect design layer filtering
- [ ] Lines assigned to layers filter correctly
- [ ] Can toggle line layers on/off
- [ ] Line layer toggle works with zone/planting toggles

### Water Flow Animation
- [ ] Flow path arrows animate continuously
- [ ] Animation direction matches arrow direction
- [ ] Animation smooth and performant
- [ ] Animation pauses when layer hidden (optional)

## Performance Tests
- [ ] Drawing 10+ lines performs smoothly
- [ ] Rendering 50+ lines doesn't lag
- [ ] Switching between layers is instant
- [ ] Multiple imagery layers don't slow map
- [ ] Page load time under 3 seconds
- [ ] No memory leaks during extended use

## Database Tests
- [ ] Lines persist across page refreshes
- [ ] Water properties persist
- [ ] Catchment calculations persist
- [ ] Swale dimensions persist
- [ ] Custom imagery metadata persists
- [ ] Imagery processing status updates correctly

## Error Handling
- [ ] Failed line creation shows error message
- [ ] Invalid water calculations show warnings
- [ ] Failed imagery upload shows error
- [ ] Network errors handled gracefully
- [ ] Form validation prevents invalid data

## Accessibility
- [ ] All buttons keyboard accessible
- [ ] Form fields have proper labels
- [ ] Color contrast meets WCAG standards
- [ ] Screen reader can navigate controls
- [ ] Focus indicators visible

## Browser Compatibility
- [ ] Chrome/Edge (tested version: _____)
- [ ] Firefox (tested version: _____)
- [ ] Safari (tested version: _____)
- [ ] Mobile Safari (iOS _____)
- [ ] Chrome Mobile (Android _____)

## Notes
- Test on both desktop and mobile devices
- Test with different screen sizes (320px, 768px, 1920px)
- Test with slow network connection (throttled)
- Test with multiple concurrent users (if possible)

---

**Testing completed by:** _______________
**Date:** _______________
**Build/commit:** _______________
