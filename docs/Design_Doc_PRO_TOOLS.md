# permaculture.studio — Design Document
## Professional Designer Experience: Feature Roadmap

**Date:** February 13, 2026  
**Purpose:** Gap analysis and development direction for enabling professional permaculture design work within the platform  
**Context:** Preparing the application for a paid collaboration where William Padilla-Brown (MycoSymbiotics) will design a 25-acre property directly inside permaculture.studio as the flagship project

---

## Where We Stand

The current build has real substance. Seven base map layers, 20 zone types, polygon/circle/point drawing, a species planting system with community database, time machine growth simulation, adaptive grid with measurement, snap-to-grid precision, and a full immersive editor with glassmorphism UI. That's more than most permaculture tools offer.

What's missing is the layer between "drawing shapes on a map" and "doing professional design work." A designer doesn't just draw — they explain decisions, layer systems independently, model water movement, collaborate with the landowner, and deliver a phased implementation plan. That's the gap, and none of it requires rearchitecting what exists. It's all additive.

---

## Feature Status at a Glance

| Feature | Status | Assessment |
|---------|--------|------------|
| Base Map Layers (7 sources) | ✅ Shipped | Solid. Needs custom imagery upload. |
| Zone Drawing (polygon, circle, point) | ✅ Shipped | Needs freehand line/polyline for paths, swales, flow. |
| Zone Types (20 categories) | ✅ Shipped | Needs custom user-defined types and water sub-types. |
| Grid & Measurement System | ✅ Shipped | Needs live distance/area readout during drawing. |
| Planting System & Species DB | ✅ Shipped | Needs guild support, inoculation fields, sourcing links. |
| Time Machine (growth sim) | ✅ Shipped | Needs extension to implementation phasing. |
| 3D Terrain & Topo | ✅ Shipped | Needs water flow overlay derived from elevation. |
| Immersive Editor | ✅ Shipped | Strong foundation for the design experience. |
| **Rich Annotations** | ❌ Missing | **CRITICAL.** Where the teaching and rationale live. |
| **Design Layer Toggle** | ❌ Missing | **CRITICAL.** Must toggle systems independently. |
| **Water Design Tools** | ❌ Missing | **CRITICAL.** Flow arrows, catchment calc, watershed. |
| **Custom Imagery Upload** | ❌ Missing | **HIGH.** Designer needs current drone imagery as base. |
| **Line / Polyline Drawing** | ❌ Missing | **HIGH.** Swales, flow paths, fences, contour lines. |
| Collaboration & Comments | ❌ Missing | Important. Designer + landowner on same project. |
| Implementation Phasing | ❌ Missing | Important. Tag elements by phase, filter by milestone. |
| Export & Presentation Mode | ❌ Missing | Needed. PDF export, grant reports, walkthrough mode. |
| Guild Builder | ❌ Missing | Nice to have. Visual companion planting design. |
| Offline Field Mode | ❌ Missing | Nice to have. Service worker for on-site use. |

---

## Priority Build Order

Features are ordered by when they're needed in the collaboration timeline.

### Must Ship Before the On-Site Day

These five features are what separate "mapping tool" from "design tool." Without them, William is fighting the platform instead of designing in it.

| # | Feature | Deadline |
|---|---------|----------|
| 1 | Rich Annotations | Before on-site |
| 2 | Design Layer Toggle | Before on-site |
| 3 | Water Design Toolkit | Before on-site |
| 4 | Custom Imagery Upload | Before on-site |
| 5 | Line / Polyline Drawing | Before on-site |

### Must Ship Before Design Delivery

These make the collaboration and phased planning work smoothly.

| # | Feature | Deadline |
|---|---------|----------|
| 6 | Collaboration & Comments | Before design delivery |
| 7 | Implementation Phasing | Before design delivery |

### Must Ship Before Platform Launch

These make the design presentable and exportable.

| # | Feature | Deadline |
|---|---------|----------|
| 8 | Export & Presentation Mode | Before launch |

### Post-Launch

| # | Feature |
|---|---------|
| 9 | Guild Builder |
| 10 | Offline Field Mode |

---

## Feature Specifications

### 1. Rich Annotations

**Priority:** CRITICAL — Ship before on-site day  
**Why:** This is the single most important missing feature. It's what turns a map into a teaching tool and a design into content. Without it, William's design rationale lives in his head or in a separate document — disconnected from the spatial context that gives it meaning.

**What it needs to do:**

Every drawn element on the map — zones, plantings, lines, points — needs an expandable detail panel with structured fields:

- **Design Rationale** — a dedicated, first-class field that asks the designer *why* this element is where it is. Not buried in a generic notes field. This is the educational content engine for the platform. When a user on permaculture.studio clicks on "The Chestnut Grove," the first thing they should see is William's explanation of why it's sited there.
- **Rich text notes** — the designer needs to write detailed plans, not just one-line labels. Support for basic formatting (bold, headers, lists) at minimum.
- **Media attachments** — upload photos and short video clips directly to a zone or planting. Soil profile photos, existing conditions, reference images. These should render inline in the annotation panel and become content on the platform.
- **External links** — reference research papers, supplier pages, or other platform content.
- **Flexible tags** — cross-referencing tags like "mycorrhizal," "phase-1," "grant-deliverable." These should be user-created, not from a fixed list.

**Direction:**

The existing detail panels (bottom drawer, planting popup) are the right interaction pattern — expand on them rather than inventing a new paradigm. The data model needs to support structured annotation fields on whatever entities represent zones and plantings. Media uploads need storage and association with specific map elements. Think about how annotations render in both the editor context (for William) and the public/read-only context (for platform users exploring the design).

---

### 2. Design Layer Toggle

**Priority:** CRITICAL — Ship before on-site day  
**Why:** Designers think in systems. When William is working on water, he needs to see *just* the water system on top of topography without nursery plantings cluttering the view. When he's working on the nursery layout, he needs to hide water features and see planting spacing clearly. The current base map layer switching handles tile sources — this is about user-created groupings of design elements.

**What it needs to do:**

- Allow the designer to create named layer groups: "Water Systems," "Nursery," "Food Forest," "Infrastructure," "Annotations," and any custom layer they want.
- Every drawn element gets assigned to one or more layers at creation time.
- A layer panel with visibility toggles — show/hide entire system layers independently.
- Layer reordering to control what draws on top of what.
- A quick "solo" mode — click a layer to show *only* that layer, click again to restore all.
- Persist layer assignments and visibility state with the project.

**Direction:**

This is distinct from the base map layer switching that already exists. Base layers are tile sources (satellite, topo, street). Design layers are user groupings of the features they've drawn. The rendering engine already uses property-based expressions for zone styling — extend that pattern to filter by layer assignment. Provide sensible defaults (Water, Plantings, Structures, Zones, Annotations) but let designers create their own.

---

### 3. Water Design Toolkit

**Priority:** CRITICAL — Ship before on-site day  
**Why:** Water is half of the grant budget. The existing water zone types (Water Body, Water Flow, Swale, Pond) are colored polygons — they don't actually model water behavior. William needs tools that help him *design* water systems, not just label areas blue.

**What it needs to do:**

**Flow Direction Arrows**
- Draw a line (polyline) that renders with arrowheads showing water movement direction.
- Support for different line styles: solid for surface flow, dashed for underground/piped.
- Ability to attach notes or flow rate estimates to each flow line.

**Catchment Area Calculator**
- When a catchment zone polygon is drawn, automatically calculate and display its area.
- Allow the designer to input local average annual rainfall and compute estimated water capture volume (area × rainfall = gallons/liters).
- Associate the catchment with a destination (which cistern, pond, or swale receives this water).

**Swale Line Tool**
- A drawing mode aware of topographic contours — when the topo layer is active, suggest or snap swale placement along contour lines.
- Display length and approximate volume capacity based on typical cross-section dimensions the designer can specify.
- Connect swales to overflow destinations (another swale, a pond, a drainage path).

**Water Flow Overlay (stretch goal)**
- Derive a water flow visualization from elevation data: show where water naturally accumulates and drains across the property.
- Render as a semi-transparent overlay that works on any base map.
- This is computationally heavier — could be pre-computed from publicly available elevation data (USGS, etc.) when a farm boundary is set.

**Direction:**

The flow arrows and swale lines depend on polyline drawing (Feature #5) being in place. Build them together. The catchment calculator is a multiplication problem once you have polygon area calculation working. The water flow overlay is the stretch goal — it requires DEM processing, which could be done server-side or pre-computed. Don't let the stretch goal block the core water tools.

---

### 4. Custom Imagery Upload

**Priority:** HIGH — Ship before on-site day  
**Why:** William needs to design on Daniel's actual property as it looks *right now*, not on satellite imagery that might be a year old and missing recent changes. Daniel has drone footage and can produce orthomosaic imagery. The platform needs to accept this as a design base layer.

**What it needs to do:**

- Upload an image and position it on the map. The simplest version is manual corner-pinning: the user drags the image's four corners to align with the map. Georeferenced formats (GeoTIFF with embedded coordinates) are a bonus but not required for MVP.
- Render the uploaded image as a layer beneath all drawn features.
- Opacity slider so the designer can fade between drone imagery and satellite/topo.
- Support multiple uploads per project for seasonal comparisons or coverage of different areas.
- Image storage needs to be durable — this is project data, not temporary.

**Direction:**

The mapping library likely supports adding image sources with coordinate bounds — use that capability. For MVP, manual alignment (drag corners) is sufficient and avoids the complexity of parsing geospatial image formats. Store images in whatever object storage the platform uses and persist the coordinate bounds with the project. Consider file size limits and loading performance — drone orthomosaics can be very large, so tiling or resolution management may be needed.

---

### 5. Line / Polyline Drawing

**Priority:** HIGH — Ship before on-site day  
**Why:** Not everything on a permaculture site is a closed polygon. Many critical design elements are linear: swale lines, water flow paths, fence lines, hedge rows, access paths, contour references, sight lines, wind direction indicators. The current drawing tools (polygon, circle, point) can't represent these.

**What it needs to do:**

- A polyline drawing mode: click to add vertices, double-click to finish *without closing the shape*. Same interaction pattern as polygon drawing, just open-ended.
- Line style options: solid, dashed, dotted. Different styles carry different meaning (surface vs. underground, existing vs. proposed).
- Directional arrows: one-way or two-way arrowheads to show flow or movement.
- Width and color options.
- Assignment to a design layer and zone type, same as polygons.
- Full annotation support (same as Feature #1) — notes, rationale, media on each line.

**Direction:**

The mapping library natively supports LineString geometry. This is likely a matter of adding a "line" drawing mode to the existing drawing toolbar and a line rendering layer with styling options. Arrow rendering can be done with symbol markers placed along the line at intervals or at endpoints. This feature is a prerequisite for the water toolkit (Feature #3), so build it first or in parallel.

---

### 6. Collaboration & Comments

**Priority:** IMPORTANT — Ship before design delivery  
**Why:** William and Daniel need to work on the same project without exporting screenshots or describing locations over email. The designer draws, the landowner reacts with local knowledge ("this area floods in spring," "there's a well here you can't see from aerial"). That feedback loop needs to happen inside the tool.

**What it needs to do:**

- **Shared project access** — invite a collaborator by email. At minimum two roles: Designer (full edit access) and Landowner (can view everything, add comments and annotations, but doesn't rearrange the design).
- **Map-pinned comments** — click anywhere on the map to drop a comment pin with text. Support threaded replies. Mark as resolved when addressed.
- **Activity feed** — a simple log of changes: "William added 3 zones to Water Systems," "Daniel commented on The Chestnut Grove." Doesn't need to be real-time for MVP — refresh to see updates is fine.
- **Notifications** — email alert when your collaborator makes changes or leaves a comment.

**Direction:**

Start simple. Shared access at the project level — both users query the same project data. Comments are spatially located elements (points on the map) with their own data model (author, text, thread, resolved status). Real-time sync via WebSockets is already on the future enhancements list — it's a nice-to-have for the collaboration but not required. The core value is that both people see the same canvas and can leave spatially anchored feedback.

---

### 7. Implementation Phasing

**Priority:** IMPORTANT — Ship before design delivery  
**Why:** The current Time Machine simulates canopy growth over time — that's one dimension of "the future." But a permaculture design is implemented in phases: what gets built in year one, what comes in year two, what's the long-term vision. The grant has milestones. William's design isn't "do everything at once." The platform needs to model this.

**What it needs to do:**

- Every zone, planting, and drawn element gets a **phase** property (Phase 1, Phase 2, Phase 3 — or Year 1, Year 2, Year 3, however the designer wants to label them).
- **Phase filter on the map** — show only Phase 1 elements to see what gets built first. Show Phases 1–2 to see the second year's additions layered onto the first.
- **Integration with Time Machine** — when the slider is at Year 1, show Phase 1 elements. At Year 3, show Phases 1–3 with growth progression applied. The two systems should feel unified, not separate.
- **Phase summary** — a panel listing what's in each phase with counts, categories, and status (planned / in-progress / complete).
- **Budget or resource tagging** per phase — optional, but useful for grant alignment and cost planning.

**Direction:**

This extends the existing Time Machine rather than replacing it. The Time Machine already filters/transforms visual elements based on a timeline — phasing adds a second filter dimension. The phase property on each element should be simple (a number or label) and filterable. The summary panel is a read-only aggregation view.

---

### 8. Export & Presentation Mode

**Priority:** NEEDED — Ship before platform launch  
**Why:** The design needs to leave the browser. Grant reports require printable documentation. Filming content requires a guided walkthrough. William may want to print a map and pin it to a wall. The platform currently has no way to get the design out.

**What it needs to do:**

- **Image / PDF export** — capture the current map view at high resolution with all visible layers, drawn features, and a legend. Include a title block: project name, designer name, date, and selected layer info.
- **Presentation mode** — a guided walkthrough that flies the camera to each zone sequentially, displaying its name, rationale, and key details. Think slideshow-on-a-map. This is ideal for filming content and client presentations.
- **Data export** — GeoJSON and/or KML export of all drawn features for interoperability with GIS tools. Already on the future enhancements list.
- **Report generation** — auto-generate a structured summary document from the design data: full species list, zone inventory, water system specs, implementation timeline, annotated photos. This is essentially the grant deliverable report assembled automatically from what's already in the platform.

**Direction:**

The mapping library can render the canvas to an image. The challenge is compositing annotations, legends, and title blocks on top cleanly. Presentation mode is a sequence of camera positions (center, zoom, bearing, pitch) with fly-to animations between them — the designer curates the sequence, the platform animates through it. Report generation is the most complex piece — it's essentially a template that queries all project data and renders it as a document. Prioritize PDF/image export first, presentation mode second, report generation third.

---

### 9. Guild Builder (Post-Launch)

A visual companion planting tool. Select a primary species (e.g., chestnut), see recommended companions, nitrogen fixers, dynamic accumulators, and known antagonists pulled from the species database. Place the entire guild as a group with proper spacing calculated from mature canopy widths. Tie into mycorrhizal inoculation data. This is high-value educational content and a strong differentiator, but it's not required for William's initial design work — he carries this knowledge in his head.

---

### 10. Offline Field Mode (Post-Launch)

Service worker caching of map tiles and project data for the property area. The designer and landowner walk the property with the app open even without cell signal — mark observations, drop comment pins, take photos, all synced when back online. Important for the on-site day if the property has dead spots, but not a blocker if they plan around it.

---

## Enhancements to Existing Features

These aren't new features — they're upgrades to shipped functionality that significantly improve the designer experience.

### Zone System

- **Custom zone types** — let designers create their own categories with custom colors and icons beyond the 20 built-in types. William will want types like "Mycorrhizal Inoculation Zone" or "Seed Collection Area" that don't exist in the current set.
- **Zone grouping** — group related zones into named collections ("East Swale Complex," "Chestnut Nursery Block A"). Select the group to see aggregate stats like total area and species count.
- **Zone relationships** — express that "this swale feeds this pond" or "this windbreak protects this nursery bed." Visual connection lines between related zones. This is how systems thinking gets represented spatially.

### Planting System

- **Mycorrhizal partner field** — for each species record, store which fungal partners to inoculate with. This is William's core expertise and a unique differentiator for the platform that no competitor has.
- **Sourcing / supplier links** — where to buy this specific cultivar. This is what makes the design "shoppable" per the collaboration plan. Every species placement can link to the Run-a-muck Farm Store or MycoSymbiotics retail.
- **Bulk planting** — instead of placing 200 individual points, draw a polygon and specify "fill with chestnuts at 30ft spacing." Auto-generate the planting grid within the zone boundary. This is how nursery beds actually get designed.
- **Planting status tracking** — a simple lifecycle: planned → ordered → planted → established → failed/removed. Visual differentiation on the map (e.g., opacity or icon change) so the designer and landowner can see implementation progress at a glance.

### Measurement System

- **Live on-draw measurements** — as you draw a polygon or line, show running perimeter length and enclosed area in real time. Display segment lengths between vertices as you place them.
- **Point-to-point distance tool** — click two points, see the distance. Simple and essential for spacing decisions.
- **Slope indicator** — using the 3D terrain data that's already available, show slope percentage between two points or across a drawn line. Critical for swale placement — swales follow contours, and the designer needs to verify grade.

### AI Chat Integration

The existing ChatOverlay component should become context-aware of the active design:

- "What species work well as companions for the chestnuts I placed in Zone A?" → AI reads the zone data and species list from the current project.
- "Calculate the water catchment potential for my four hoop houses" → AI uses zone areas and local rainfall data.
- "Generate a planting schedule for Phase 1" → AI reads phased elements and outputs a timeline.
- "Summarize this design for a grant report" → AI assembles structured text from all annotations, zone data, and species lists.

This is where the platform becomes more than a drawing tool — it becomes a design *partner*. The AI should have access to the full project data model when responding to queries within a project context.

---

## William's End-to-End Workflow

Once features 1–8 are in place, here's what the experience should feel like:

1. **Opens the project.** Daniel has already created the farm, set the boundary, uploaded drone imagery, and tagged existing infrastructure. William sees the 25 acres in the immersive editor with current drone photos as the base layer.

2. **Reads the land.** Toggles topo contours over the drone imagery. Uses 3D terrain pitch to visualize elevation. Identifies natural water flow paths and accumulation points.

3. **Designs the water system.** Creates a "Water Systems" design layer. Draws swale lines along contours. Places catchment zones around hoop houses with auto-calculated capture area. Draws flow arrows showing water movement from catchment → swale → nursery → pond. Writes design rationale on each element explaining his reasoning. Attaches photos of current drainage conditions.

4. **Lays out the nursery.** Creates a "Nursery" layer. Draws nursery bed polygons. Uses bulk planting to fill beds — chestnuts at 30ft, hazelnuts at 15ft. Attaches mycorrhizal partner data and sourcing info to each species. Adds companion guild plantings. Notes inoculation strategy in annotations.

5. **Phases the implementation.** Tags everything Phase 1, 2, or 3. Phase 1: water infrastructure + first nursery beds. Phase 2: expanded nursery + food forest. Phase 3: secondary species + refinement. Scrubs the Time Machine to preview the property evolving over years.

6. **Collaborates with Daniel.** Daniel opens the same project, sees all design work. Drops comment pins with local knowledge: "This floods in spring," "We already have a well here." William responds and adjusts.

7. **Presents and exports.** Uses presentation mode for filmed content — camera flies zone to zone while William narrates. Exports PDF for the grant report. The design goes live on the platform as the flagship Living Lab project.

---

## What Success Looks Like

If William can complete steps 1–7 without leaving the application, without exporting to another tool, and without losing any of his design thinking to disconnected documents or verbal explanations — the platform works. Every decision he makes lives in the spatial context where it was made, is explained in his own words, and is explorable by anyone who visits the project on permaculture.studio.

That's the bar. Build to it.
