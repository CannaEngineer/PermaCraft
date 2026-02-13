# Immersive Editor Rollout Checklist

## Pre-Deployment

- [x] All TypeScript errors resolved
- [x] Production build successful
- [ ] Manual testing completed
- [ ] Mobile testing completed (375px, 768px, 1024px widths)
- [ ] Dark mode verified
- [ ] Screenshot capture tested
- [ ] AI analysis tested
- [ ] All animations smooth (60fps)
- [ ] No console errors in production build

## Phase 1: Development

- [ ] Feature flag set to `false` in production
- [ ] Deploy to staging environment
- [ ] Team testing for 2 days
- [ ] Collect feedback, fix bugs

## Phase 2: Beta Testing

- [ ] Enable for 10% of users via A/B test
- [ ] Monitor error rates (Sentry)
- [ ] Track engagement metrics
- [ ] Collect user feedback
- [ ] Fix critical bugs within 24h

## Phase 3: Gradual Rollout

- [ ] Day 1: 25% of users
- [ ] Day 2: 50% of users
- [ ] Day 3: 75% of users
- [ ] Day 4: 100% of users

## Phase 4: Cleanup

- [ ] Monitor for 1 week at 100%
- [ ] Remove `FarmEditorClient` (if no issues)
- [ ] Remove feature flag
- [ ] Update documentation
- [ ] Mark rollout complete

## Rollback Plan

If critical issues occur:

1. Set `NEXT_PUBLIC_USE_IMMERSIVE_EDITOR=false`
2. Deploy immediately
3. Investigate issue in development
4. Fix and re-test before re-enabling

## Testing Checklist

### Desktop (1920x1080)
- [ ] Header auto-collapses when panning map
- [ ] Header expands on hover or click
- [ ] Map control panel shows layers, grid, options, help
- [ ] Control panel minimizes to FAB
- [ ] Drawing toolbar appears when entering draw mode
- [ ] Drawing toolbar disappears when clicking Done
- [ ] Bottom drawer slides up when selecting zone
- [ ] Bottom drawer can be dragged to resize
- [ ] Bottom drawer dismisses on backdrop click
- [ ] Chat overlay opens with backdrop blur
- [ ] Chat overlay closes with ESC key or backdrop click
- [ ] AI screenshot capture works
- [ ] AI analysis returns response
- [ ] Save functionality works
- [ ] Goals wizard opens and closes
- [ ] Keyboard shortcuts work (C for chat, H for header)

### Mobile (375x667)
- [ ] Header slides off-screen when collapsed
- [ ] Drawer snap points work correctly
- [ ] Touch gestures responsive
- [ ] Chat overlay full-screen
- [ ] All buttons accessible
- [ ] No horizontal scroll

### Dark Mode
- [ ] Glassmorphism effects visible
- [ ] Text contrast sufficient
- [ ] All panels readable

## Performance Metrics

Track these metrics pre/post rollout:

- Time to interactive (TTI)
- First contentful paint (FCP)
- Largest contentful paint (LCP)
- Cumulative layout shift (CLS)
- User engagement (time on page)
- AI analysis usage
- Error rates

## Known Limitations

- OpenRouter free models may have rate limits
- MapLibre terrain/elevation requires additional tile source setup
- Real-time collaboration requires WebSocket infrastructure (Phase 2+)
