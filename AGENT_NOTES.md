# AGENT_NOTES.md — PermaTour AI Implementation Notes

## Deviations from Spec

### 1. Email Integration
**Spec:** Send a post-visit summary email when a visitor shares or opts in.
**Decision:** No email service is configured in this project (confirmed by codebase audit — no nodemailer, resend, sendgrid, or similar packages installed). The share endpoint logs the email request and notes that email sending is not yet configured. When an email provider is added to the project, implement `sendTourSummaryEmail()` in `app/api/tour/shares/route.ts`.

### 2. Charting Library
**Spec:** Use whatever charting library is already in the project.
**Decision:** No charting library exists in the project (only `d3-scale` for the timeline visualization). The analytics dashboard uses simple stat cards and an HTML table for recent sessions, as specified for the fallback case.

### 3. QR Scanner Implementation
**Spec:** Use `jsqr` for QR scanning.
**Decision:** Implemented as specified. Uses `jsqr` with `getUserMedia` for the rear camera. The scanner matches QR URLs against the pattern `/tour/[slug]/poi/[poiId]` to extract the POI ID.

### 4. Admin Route Protection
**Spec:** Admin routes use existing auth.
**Decision:** Tour admin routes are accessible to both site admins (`isAdmin()`) AND farm owners (verified via `farms.user_id`). This is consistent with the project's pattern where farm owners manage their own farm data. The `/admin/tour/` layout additionally checks that the user owns at least one farm.

### 5. Walking Directions
**Spec:** Use OSRM public API at `router.project-osrm.org`.
**Decision:** Implemented as specified. The `/api/tour/directions` endpoint proxies requests to the OSRM public API with the `foot` profile and returns GeoJSON geometry, distance, duration, and turn-by-turn steps.

### 6. Rate Limiting
**Spec:** All visitor-facing API routes are public but rate-limited.
**Decision:** Implemented in-memory rate limiting per IP address using a simple Map. For production, this should be replaced with Redis or Vercel Edge Config for distributed rate limiting across multiple instances.

### 7. Build Verification
**Spec:** Run `npm run build` for a clean production build.
**Decision:** TypeScript compilation (`tsc --noEmit`) passes with zero new errors. The `npm run build` fails due to a pre-existing environment issue: Google Fonts (Inter, Lora) cannot be fetched in this sandboxed environment. This is not caused by PermaTour code.

## Files Created

### Database
- `lib/db/migrations/110_tour_system.sql` — 6 new tables
- `lib/db/schema.ts` — Added tour-related TypeScript interfaces

### Library
- `lib/tour/utils.ts` — Utility functions (slug generation, QR IDs, haversine distance, rate limiting, POI categories)
- `lib/tour/queries.ts` — All database query functions for tour tables

### Visitor-Facing API Routes (Public)
- `app/api/tour/sessions/route.ts` — Create anonymous sessions
- `app/api/tour/events/route.ts` — Batch event ingestion
- `app/api/tour/farms/[slug]/route.ts` — Public farm tour data
- `app/api/tour/pois/[id]/route.ts` — Single POI detail
- `app/api/tour/pois/[id]/comments/route.ts` — Fetch/submit comments
- `app/api/tour/ai/chat/route.ts` — Streaming AI chatbot
- `app/api/tour/ai/plant-id/route.ts` — Vision-based plant identification
- `app/api/tour/directions/route.ts` — OSRM walking directions
- `app/api/tour/shares/route.ts` — Share event recording

### Admin API Routes (Authenticated)
- `app/api/admin/tour/config/route.ts` — Tour config CRUD
- `app/api/admin/tour/pois/route.ts` — POI list/create
- `app/api/admin/tour/pois/[id]/route.ts` — POI read/update/delete
- `app/api/admin/tour/routes/route.ts` — Route list/create
- `app/api/admin/tour/routes/[id]/route.ts` — Route update/delete
- `app/api/admin/tour/comments/[id]/route.ts` — Comment moderation
- `app/api/admin/tour/analytics/route.ts` — Visitor analytics

### Visitor Pages
- `app/tour/[farmSlug]/layout.tsx` — Tour layout
- `app/tour/[farmSlug]/page.tsx` — Landing page
- `app/tour/[farmSlug]/map/page.tsx` — GPS map page
- `app/tour/[farmSlug]/poi/[poiId]/page.tsx` — POI detail
- `app/tour/[farmSlug]/complete/page.tsx` — Tour completion

### Admin Pages
- `app/(app)/admin/tour/layout.tsx` — Admin tour layout
- `app/(app)/admin/tour/page.tsx` — Overview
- `app/(app)/admin/tour/pois/page.tsx` — POI management
- `app/(app)/admin/tour/pois/[id]/page.tsx` — POI editor
- `app/(app)/admin/tour/routes/page.tsx` — Route builder
- `app/(app)/admin/tour/analytics/page.tsx` — Analytics dashboard

### Components
- `components/tour/tour-landing-client.tsx` — Tour landing with route selection
- `components/tour/tour-map-client.tsx` — Full-screen GPS map with POI markers
- `components/tour/tour-poi-client.tsx` — POI detail with comments
- `components/tour/tour-complete-client.tsx` — Post-tour summary + share
- `components/tour/tour-chat.tsx` — AI chatbot overlay (streaming)
- `components/tour/tour-plant-id-scanner.tsx` — Camera plant ID
- `components/tour/tour-qr-scanner.tsx` — QR code scanner
- `components/tour/admin/tour-admin-overview.tsx` — Config + stats
- `components/tour/admin/tour-admin-pois.tsx` — POI list management
- `components/tour/admin/tour-admin-poi-editor.tsx` — POI editor with map + QR
- `components/tour/admin/tour-admin-routes.tsx` — Route builder
- `components/tour/admin/tour-admin-analytics.tsx` — Analytics dashboard

## Packages Added
- `qrcode` + `@types/qrcode` — QR code generation for POI print views
- `jsqr` — Client-side QR code scanning from camera feed
