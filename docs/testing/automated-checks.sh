#!/bin/bash
# Automated checks for Compact Music Controller implementation
# Run this before manual testing

echo "========================================="
echo "Compact Music Controller - Automated Checks"
echo "========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASS="${GREEN}✓ PASS${NC}"
FAIL="${RED}✗ FAIL${NC}"
WARN="${YELLOW}⚠ WARN${NC}"

# Counter for results
PASSED=0
FAILED=0
WARNINGS=0

# Check 1: Required component files exist
echo "1. Checking component files..."
if [ -f "components/audio/CompactMusicController.tsx" ]; then
  echo -e "   $PASS CompactMusicController.tsx exists"
  ((PASSED++))
else
  echo -e "   $FAIL CompactMusicController.tsx missing"
  ((FAILED++))
fi

if [ -f "components/audio/MusicPlayerSheet.tsx" ]; then
  echo -e "   $PASS MusicPlayerSheet.tsx exists"
  ((PASSED++))
else
  echo -e "   $FAIL MusicPlayerSheet.tsx missing"
  ((FAILED++))
fi

# Check 2: Verify imports in sidebar
echo ""
echo "2. Checking sidebar integration..."
if grep -q "CompactMusicController" components/shared/sidebar.tsx; then
  echo -e "   $PASS CompactMusicController imported in sidebar"
  ((PASSED++))
else
  echo -e "   $FAIL CompactMusicController not imported"
  ((FAILED++))
fi

if grep -q "MusicPlayerSheet" components/shared/sidebar.tsx; then
  echo -e "   $PASS MusicPlayerSheet imported in sidebar"
  ((PASSED++))
else
  echo -e "   $FAIL MusicPlayerSheet not imported"
  ((FAILED++))
fi

# Check 3: Verify responsive classes
echo ""
echo "3. Checking responsive design classes..."
if grep -q "hidden md:flex" components/audio/CompactMusicController.tsx; then
  echo -e "   $PASS Responsive classes present (hidden md:flex)"
  ((PASSED++))
else
  echo -e "   $WARN Responsive classes may be missing"
  ((WARNINGS++))
fi

# Check 4: Check for ARIA labels
echo ""
echo "4. Checking accessibility attributes..."
aria_count=$(grep -c "aria-label" components/audio/CompactMusicController.tsx)
if [ "$aria_count" -ge 3 ]; then
  echo -e "   $PASS Found $aria_count aria-label attributes"
  ((PASSED++))
else
  echo -e "   $WARN Only $aria_count aria-label attributes found (expected 3+)"
  ((WARNINGS++))
fi

# Check 5: Verify Sheet component usage
echo ""
echo "5. Checking Sheet component integration..."
if grep -q "Sheet" components/audio/MusicPlayerSheet.tsx && \
   grep -q "SheetContent" components/audio/MusicPlayerSheet.tsx && \
   grep -q "SheetTitle" components/audio/MusicPlayerSheet.tsx; then
  echo -e "   $PASS Sheet components properly used"
  ((PASSED++))
else
  echo -e "   $FAIL Sheet components not properly integrated"
  ((FAILED++))
fi

# Check 6: TypeScript compilation
echo ""
echo "6. Running TypeScript compilation..."
npm run build > /tmp/build-output.txt 2>&1
if [ $? -eq 0 ]; then
  echo -e "   $PASS Build successful"
  ((PASSED++))
else
  echo -e "   $FAIL Build failed - check /tmp/build-output.txt"
  ((FAILED++))
fi

# Check 7: Verify AudioProvider hook usage
echo ""
echo "7. Checking audio state integration..."
if grep -q "useAudio" components/audio/CompactMusicController.tsx; then
  echo -e "   $PASS useAudio hook imported"
  ((PASSED++))
else
  echo -e "   $FAIL useAudio hook not found"
  ((FAILED++))
fi

# Check 8: Check for event handlers
echo ""
echo "8. Checking event handlers..."
if grep -q "onOpenPlayer" components/audio/CompactMusicController.tsx && \
   grep -q "onClick" components/audio/CompactMusicController.tsx; then
  echo -e "   $PASS Event handlers present"
  ((PASSED++))
else
  echo -e "   $FAIL Missing event handlers"
  ((FAILED++))
fi

# Check 9: Verify CSS classes for theme support
echo ""
echo "9. Checking theme support..."
if grep -q "dark:" components/audio/CompactMusicController.tsx; then
  echo -e "   $PASS Dark mode classes found"
  ((PASSED++))
else
  echo -e "   $WARN No dark mode classes detected"
  ((WARNINGS++))
fi

# Check 10: File permissions
echo ""
echo "10. Checking file permissions..."
if [ -r "components/audio/CompactMusicController.tsx" ] && \
   [ -r "components/audio/MusicPlayerSheet.tsx" ]; then
  echo -e "   $PASS Files readable"
  ((PASSED++))
else
  echo -e "   $FAIL File permission issues"
  ((FAILED++))
fi

# Summary
echo ""
echo "========================================="
echo "SUMMARY"
echo "========================================="
echo -e "Passed:   ${GREEN}$PASSED${NC}"
echo -e "Failed:   ${RED}$FAILED${NC}"
echo -e "Warnings: ${YELLOW}$WARNINGS${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}All automated checks passed!${NC}"
  echo "Proceed with manual testing checklist."
  exit 0
else
  echo -e "${RED}Some checks failed!${NC}"
  echo "Fix issues before manual testing."
  exit 1
fi
