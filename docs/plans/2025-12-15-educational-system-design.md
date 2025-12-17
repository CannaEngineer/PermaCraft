# Educational System Design - PermaCraft Learn

**Date:** 2025-12-15
**Status:** Design Complete - Ready for Implementation

## Overview

An integrated educational system that teaches permaculture principles through structured learning paths, AI-powered personalization, gamification, and contextual learning moments within the farm editor.

## Core Philosophy

- **Teach permaculture itself**, not just how to use PermaCraft
- **AI-first approach**: Personalized content, adaptive tutoring, practice farm grading
- **Learning by doing**: Sandbox practice farms + real farm application
- **Gamified progression**: Badges, XP, levels for motivation
- **Contextual integration**: Learning moments appear naturally during farm design

## Learning Paths

Users choose one path to start (can switch later). Each path combines foundational content with specialized focus areas.

### Six Learning Paths

1. **Urban Food Producer**
   - Target: Balconies, rooftops, small yards (0.1-0.5 acres)
   - Emphasis: Urban Permaculture (100%), Zones 0-2 (deep), Container Polyculture

2. **Suburban Homesteader**
   - Target: Typical residential lots (0.5-2 acres)
   - Emphasis: Zones 1-3, Food production, Soil building

3. **Rural Regenerator**
   - Target: Larger properties focused on ecosystem restoration (2-20 acres)
   - Emphasis: Water Management (100%), Zones 3-5 (deep), Native First (deep)

4. **Small Farm Operator**
   - Target: Production agriculture with permaculture (5-50 acres)
   - Emphasis: Economics, Polyculture at scale, Market production

5. **Agro-Tourism Developer**
   - Target: Farms as educational/visitor destinations
   - Emphasis: All zones, Economics & Ethics (deep), Food Forests, Guest experiences

6. **Permaculture Student**
   - Target: Academic/certification track
   - Emphasis: Most comprehensive, all topics in depth

### Path Overlap Strategy

All paths share foundational lessons (first 3-5 lessons):
- Permaculture ethics (Earth Care, People Care, Fair Share)
- Observation and assessment
- Basic zone concepts
- Systems thinking introduction

After foundations, paths diverge but share topic modules with different emphasis levels.

## Topic Structure

### Core Topics

Each topic contains 5-10 lessons, available across multiple learning paths:

1. **Zone Education**
   - Understanding zones 0-5
   - Zone placement logic
   - Energy flows and access patterns
   - Zone-appropriate plantings

2. **Native First Approach**
   - Bioregional plants
   - Ecosystem services
   - Ethics of native species
   - Naturalized vs invasive species

3. **Polyculture Design**
   - Guild building principles
   - Companion planting
   - Vertical layer stacking
   - Succession planting

4. **Systems Thinking**
   - Observing patterns in nature
   - Feedback loops
   - Whole-system design
   - Edge effects and ecotones

5. **Water Management**
   - Swales and berms
   - Pond design
   - Keyline design
   - Rainwater harvesting

6. **Soil Building**
   - Composting systems
   - Mulching strategies
   - Cover crops
   - No-till methods

7. **Urban Permaculture**
   - Container guilds
   - Vertical gardens
   - Micro-climates
   - Balcony and rooftop production

8. **Food Forests**
   - Seven layers
   - Succession planning
   - Perennial systems
   - Canopy to root zone design

9. **Agro-Tourism**
   - Farm stays and workshops
   - Education programs
   - Value-added experiences
   - Liability and safety

10. **Economics & Ethics**
    - Fair trade principles
    - People care in practice
    - Fair share and surplus
    - Farm economics

## Gamification System

### XP & Levels

**XP Sources:**
- Complete lesson: 10-50 XP (based on difficulty)
- Practice challenge: 100-500 XP (based on AI grade)
- Apply to real farm: +50 XP bonus
- Daily streak: 5 XP per day

**Level Progression:**
- Seedling (0-100 XP)
- Sprout (100-300 XP)
- Sapling (300-800 XP)
- Tree (800-2000 XP)
- Grove (2000-5000 XP)
- Forest (5000+ XP)

Visual progression indicator shows growth from seed to forest.

### Badge System

**Tier 1 - Foundations** (complete topic modules):
- 🌱 Observer - "Introduction to Permaculture"
- 💧 Water Steward - "Water Management"
- 🌳 Guild Builder - "Polyculture Design"
- 🗺️ Zone Planner - "Zone Education"
- 🌿 Native Advocate - "Native First Approach"
- 🌍 Systems Thinker - "Systems Thinking"
- 🏙️ Urban Cultivator - "Urban Permaculture"
- 🌾 Soil Steward - "Soil Building"

**Tier 2 - Mastery** (practice farm achievements):
- 🏆 Design Master - AI rates practice farm 90%+
- 🔄 Feedback Loop Expert - Demonstrate feedback loops in design
- 📐 Efficiency Expert - Optimize zone placement challenge
- 🌿 Native Champion - Practice farm with 80%+ native species
- 💚 Polyculture Pro - Design diverse guild system

**Tier 3 - Path Completion**:
- 🏙️ Urban Food Producer Badge
- 🏡 Suburban Homesteader Badge
- 🌲 Rural Regenerator Badge
- 🚜 Small Farm Operator Badge
- 🎪 Agro-Tourism Developer Badge
- 🎓 Certified Designer Badge

### Progress Dashboard

Located at `/learn`, shows:
- Current level & XP progress bar with visual plant growth
- Active learning path with % completion
- Next recommended lesson (AI-suggested)
- Badge collection display (earned + locked)
- Practice farm portfolio gallery
- Optional leaderboard (opt-in)

## User Interface Integration

### Sidebar Navigation

Add "Learn" to main navigation (components/shared/sidebar.tsx):
```typescript
{ name: "Learn", href: "/learn", icon: GraduationCap, requiresAuth: false }
```

For authenticated users, show level badge next to username in sidebar.

### Learn Section Main Page (`/learn`)

**Layout Sections:**

1. **Hero/Status Bar** (authenticated users only)
   - Current level display with visual indicator
   - XP progress to next level
   - Active path name + completion %
   - "Continue Learning" CTA → next lesson

2. **Learning Paths Grid**
   - 6 cards in responsive grid
   - Each card shows: icon, name, description, estimated lessons, difficulty
   - "Start Path" (new users) or "Switch Path" (existing users)
   - Current path highlighted

3. **Topic Library**
   - Grid/list view of all 10 topics
   - Filter by: difficulty, learning path, completion status
   - Search functionality
   - Each topic shows: completed lessons / total lessons

4. **Practice Farm Hub**
   - "Create Practice Farm" primary button
   - Gallery of user's practice farms with thumbnails
   - AI grade displayed on each
   - Featured challenges carousel

5. **Achievements Section**
   - Badge collection (grid of earned badges)
   - Recently earned (last 3)
   - Next unlockable badges with progress

6. **Leaderboard** (optional, collapsed by default)
   - Top 10 learners by XP
   - Opt-in participation only
   - Shows: rank, name, level, total XP

### Individual Lesson Page (`/learn/lessons/[slug]`)

**Header:**
- Breadcrumb: Learn > Topic > Lesson
- Lesson title
- Metadata: estimated time, difficulty, prerequisite indicators
- Progress: X of Y in this topic

**Main Content Area:**
- Rich content (Markdown rendered, or custom JSON structure)
- Mixed media: text, images, diagrams, embedded visualizations
- AI personalization callouts (highlighted boxes):
  - "In your Zone 7a climate..."
  - "Native species for your Pacific Northwest region..."
  - "For a 2-acre property like yours..."

**Interactive Elements:**
- Embedded quizzes (multiple choice, true/false)
- Interactive diagrams (click to explore zones, layers)
- Species relationship visualizers (for polyculture topics)
- Animated growth simulations (for food forest succession)

**AI Tutor Sidebar** (collapsible, always present):
- Chat interface: "Ask me anything about this lesson"
- Remembers conversation context within lesson
- Can elaborate, provide regional examples, suggest related topics
- Visual indicator when AI is "thinking"

**Bottom Actions:**
- "Mark Complete" button (awards XP, updates progress)
- "Take Practice Challenge" (if available for this lesson)
- "Save for Later" bookmark
- "Next Lesson" navigation

### Contextual Learning in Farm Editor

Three integration points:

**1. Action-Triggered Hints**

First-time actions trigger educational prompts:
- First zone drawn → Toast: "🎓 Learn about Permaculture Zones" (link)
- First planting added → "Understanding Plant Guilds" suggestion
- Drawing water feature → "Water Management Fundamentals" prompt
- Clicking AI analysis → "How AI Can Guide Your Design" intro
- Using timeline slider → "Understanding Succession" hint

Implemented as toast notifications with "Learn More" link. Dismissed hints stored in `user_hint_dismissal` table (don't repeat).

**2. AI-Detected Gap Suggestions**

AI monitors farm patterns, suggests relevant lessons via sidebar widget:

Pattern detection examples:
- All non-native plants → "💡 Try our Native First Approach lesson"
- Only annuals, no perennials → "Consider learning about Food Forests"
- No water features on large property → "Water Management could help"
- Dense monoculture planting → "Systems Thinking: Edge Effects"
- Only Zone 1, no outer zones → "Understanding Zones 2-5"

Widget: "AI Learning Suggestions" (collapsible, in farm editor sidebar). Shows 1-3 suggestions max. User can dismiss or click to lesson.

**3. Lesson-to-Practice Flow**

After completing lesson in Learn section:
1. Congratulations modal: badge/XP animation
2. "Ready to practice?" prompt with two options:
   - **Practice Farm**: "Try in sandbox" (safe experimentation)
   - **Real Farm**: "Apply to your farm" (bonus +50 XP)
3. If Practice Farm → create new practice farm pre-configured for lesson challenge
4. If Real Farm → redirect to user's farm with contextual hints overlay

**Contextual Help Icons**

Small "?" icons throughout farm editor open mini-lesson modals:
- Next to zone type selector → "What permaculture zone is this?"
- In species picker → "Native vs Non-Native explained"
- On timeline slider → "Understanding Plant Succession"
- In AI chat → "How to ask better design questions"

Mini-lessons: 200-300 words, 1-2 diagrams, "Learn More" link to full lesson.

## Practice Farms & AI Grading

### Practice Farm Creation

Users can create sandbox farms to experiment without affecting real farm projects.

**Practice Farm Types:**
1. **Free Practice** - blank canvas, any design
2. **Lesson Challenge** - specific scenario with success criteria
3. **Featured Challenges** - community/seasonal challenges

**Lesson Challenges Examples:**
- "Design a Zone 1 Kitchen Garden" (Urban path)
- "Plan a 3-Guild Food Forest" (Polyculture topic)
- "Create a Swale System for 5-acre slope" (Water Management)
- "Native Hedgerow Windbreak" (Native First + Systems Thinking)

### AI Grading System

When user clicks "Submit for Review" on practice farm:

1. Capture map screenshot + zone/planting data
2. Send to AI with lesson criteria and user context
3. AI analyzes based on:
   - Lesson-specific principles (e.g., zone logic for Zone Education)
   - Native species percentage
   - Polyculture diversity (species per guild)
   - Water management features
   - Systems thinking indicators (edges, feedback loops)
   - Appropriate scale for property size

4. Return structured feedback:
```json
{
  "overall_score": 85,
  "strengths": [
    "Excellent zone placement with kitchen garden closest to house",
    "Good native species diversity (75% native)"
  ],
  "improvements": [
    "Consider adding nitrogen-fixing plants to guilds",
    "Water catchment could be enhanced with swale placement"
  ],
  "specific_suggestions": [
    "Add native groundcover like wild strawberry under fruit trees",
    "Consider swale along north property line to slow runoff"
  ],
  "principle_scores": {
    "zone_logic": 90,
    "native_diversity": 75,
    "polyculture_design": 80,
    "water_management": 70,
    "systems_thinking": 85
  }
}
```

5. Display feedback in modal with visual score indicator
6. Award XP based on score (100-500 XP range)
7. Unlock badges if criteria met (e.g., 90%+ = Design Master)
8. Option to "Revise & Resubmit"

### Practice Farm Portfolio

Users can save multiple practice farms:
- Gallery view at `/learn/practice-farms`
- Each shows: thumbnail, name, lesson, AI grade, date
- Can revisit, revise, or delete
- Can share to community feed (optional)

## AI Integration

### Three AI Roles

**1. Content Personalizer**

Takes seed lesson content and adapts for user:

```
System Prompt:
You are a permaculture education assistant. Personalize this lesson for:
- Climate: {climate_zone}
- Property: {acres} acres, {region}
- Experience: {level}

Base lesson: {lesson_content}

Add 2-3 callout boxes with specific examples relevant to their context.
When mentioning plants, suggest native species for their region.
Adapt scenarios to their property size.
```

Endpoint: `GET /api/learning/lessons/[id]/personalize`

**2. AI Tutor**

Conversational assistant within each lesson:

```
System Prompt:
You are a knowledgeable permaculture tutor helping a student learn about {current_lesson_title}.

Student profile:
- Climate: {climate_zone}
- Property: {property_type}, {acres} acres
- Experience: {level}
- Completed lessons: {completed_lessons}

Guidelines:
- Answer questions clearly and concisely
- Provide region-specific examples when relevant
- Connect concepts to permaculture ethics and principles
- If question is outside current lesson scope, briefly answer then suggest relevant lesson
- Encourage hands-on practice
- Be supportive and encouraging
```

Endpoint: `POST /api/learning/ai-tutor` (streaming chat)

**3. Practice Farm Grader**

Evaluates user's practice farm designs:

```
System Prompt:
You are a permaculture design reviewer evaluating a student's practice farm.

Lesson focus: {lesson_topic}
Success criteria: {lesson_criteria}

Student context:
- Climate: {climate_zone}
- Property size in practice: {acres}
- Experience level: {level}

Evaluate based on:
1. Lesson-specific principles (primary weight)
2. Overall permaculture design quality
3. Native species selection
4. Polyculture diversity
5. Water management
6. Systems thinking application

Analyze the farm data and screenshot provided.

Return structured JSON with:
- overall_score (0-100)
- strengths (array, 2-4 items)
- improvements (array, 2-4 items)
- specific_suggestions (array, 2-4 actionable items with locations)
- principle_scores (object with sub-scores)

Be encouraging but honest. Provide actionable, specific feedback.
```

Endpoint: `POST /api/learning/practice-farms/[id]/submit`

### AI Gap Detection

Background process (or on-demand when farm editor loads) analyzes user's real farm:

```
System Prompt:
Analyze this farm design and identify learning opportunities.

Farm data: {zones, plantings, features}
User's completed lessons: {completed_lessons}
User's learning path: {path_name}

Look for patterns indicating knowledge gaps:
- All non-native species → Native First lesson
- No perennials → Food Forest lesson
- Monoculture planting → Polyculture lesson
- No water features on large property → Water Management
- Unclear zone organization → Zone Education
- All Zone 1, nothing outer → Zones 3-5 lessons

Return top 3 lesson suggestions with brief reasoning.
```

Endpoint: `GET /api/learning/contextual-hints?farm_id={id}`

## Content Strategy

### Content Sources

Mix of curated seed content and AI enhancement:

**Open Educational Resources (properly attributed):**
- Permaculture Principles (permacultureprinciples.com) - Creative Commons
- Permaculture Research Institute - open articles
- ATTRA Sustainable Agriculture - public domain
- USDA NRCS native plant guides - public domain
- Wikipedia permaculture articles - CC BY-SA

**Content Structure:**
```json
{
  "lesson_id": "zone-education-01",
  "title": "Introduction to Permaculture Zones",
  "core_content": "Markdown content here...",
  "source_attribution": "Adapted from Permaculture: A Designer's Manual (Mollison, 1988)",
  "license": "Educational use, attributed",
  "images": [
    {
      "url": "/images/lessons/zone-diagram.png",
      "alt": "Permaculture zones 0-5 diagram",
      "credit": "Permaculture Principles, CC BY-NC"
    }
  ],
  "ai_personalization_points": [
    "climate_zone_examples",
    "property_size_adaptations",
    "native_species_suggestions_for_zones"
  ],
  "quiz": [
    {
      "question": "Which zone is visited most frequently?",
      "options": ["Zone 0", "Zone 1", "Zone 5"],
      "correct": 0
    }
  ]
}
```

### Initial Content Scope (Phase 1)

**Minimum viable content for launch:**
- 6 learning paths fully defined
- 40-50 foundational lessons across 10 topics:
  - Introduction to Permaculture: 5 lessons
  - Zone Education: 6 lessons (one per zone)
  - Native First Approach: 5 lessons
  - Polyculture Design: 5 lessons
  - Systems Thinking: 4 lessons
  - Water Management: 5 lessons
  - Soil Building: 4 lessons
  - Urban Permaculture: 4 lessons
  - Food Forests: 5 lessons
  - Economics & Ethics: 3 lessons

Each lesson: 800-1500 words, 2-4 images/diagrams, 1-2 quizzes, 1 practice challenge (optional).

### Attribution System

All external content includes:
- Source citation in lesson footer
- License information
- "Learn more" links to original sources
- Compliant with Creative Commons and fair use

## Database Schema

```typescript
export interface LearningPath {
  id: string;
  name: string;
  slug: string;
  description: string;
  target_audience: string;
  estimated_lessons: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  icon_name: string;
  created_at: number;
}

export interface Topic {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon_name: string;
  created_at: number;
}

export interface Lesson {
  id: string;
  topic_id: string;
  title: string;
  slug: string;
  description: string;
  content: string; // JSON structure with core_content, images, quiz, etc.
  content_type: 'text' | 'interactive' | 'video' | 'mixed';
  estimated_minutes: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  prerequisite_lesson_ids: string | null; // JSON array
  xp_reward: number;
  order_index: number;
  created_at: number;
  updated_at: number;
}

export interface PathLesson {
  id: string;
  learning_path_id: string;
  lesson_id: string;
  order_index: number;
  is_required: number; // 1 = required, 0 = optional
  created_at: number;
}

export interface LearningPathTopic {
  id: string;
  learning_path_id: string;
  topic_id: string;
  emphasis_level: 'core' | 'supplementary' | 'optional';
  created_at: number;
}

export interface UserProgress {
  id: string;
  user_id: string;
  learning_path_id: string | null;
  current_level: number;
  total_xp: number;
  created_at: number;
  updated_at: number;
}

export interface LessonCompletion {
  id: string;
  user_id: string;
  lesson_id: string;
  completed_at: number;
  xp_earned: number;
  quiz_score: number | null; // 0-100
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon_name: string;
  badge_type: 'foundation' | 'mastery' | 'path_completion';
  tier: number; // 1, 2, 3
  unlock_criteria: string; // JSON: {type: 'lesson', lesson_id: '...'} or {type: 'score', min_score: 90}
  created_at: number;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  earned_at: number;
}

export interface PracticeFarm {
  id: string;
  user_id: string;
  lesson_id: string | null;
  name: string;
  description: string | null;
  // Reuse farm schema fields
  center_lat: number;
  center_lng: number;
  zoom_level: number;
  ai_grade: number | null; // 0-100
  ai_feedback: string | null; // JSON from grading
  submitted_for_review: number;
  created_at: number;
  updated_at: number;
}

export interface PracticeZone {
  // Same as Zone but with practice_farm_id instead of farm_id
  id: string;
  practice_farm_id: string;
  name: string | null;
  zone_type: string;
  geometry: string; // GeoJSON
  properties: string | null;
  created_at: number;
  updated_at: number;
}

export interface PracticePlanting {
  // Same as Planting but with practice_farm_id
  id: string;
  practice_farm_id: string;
  species_id: string;
  name: string | null;
  lat: number;
  lng: number;
  planted_year: number | null;
  current_year: number;
  notes: string | null;
  created_at: number;
  updated_at: number;
}

export interface ContextualHint {
  id: string;
  trigger_type: 'first_zone' | 'first_planting' | 'water_feature' | 'ai_analysis' | 'help_icon';
  lesson_id: string;
  hint_text: string;
  priority: number;
  created_at: number;
}

export interface UserHintDismissal {
  id: string;
  user_id: string;
  hint_id: string;
  dismissed_at: number;
}

export interface AITutorConversation {
  id: string;
  user_id: string;
  lesson_id: string;
  messages: string; // JSON array of {role, content}
  created_at: number;
  updated_at: number;
}
```

## API Endpoints

### Learning Paths
- `GET /api/learning/paths` - List all learning paths
- `GET /api/learning/paths/[slug]` - Get path details with lessons
- `POST /api/learning/paths/[id]/enroll` - Set as user's active path

### Topics & Lessons
- `GET /api/learning/topics` - List all topics
- `GET /api/learning/topics/[slug]` - Get topic with lessons
- `GET /api/learning/lessons/[slug]` - Get lesson content
- `GET /api/learning/lessons/[id]/personalize` - AI-enhanced content for user
- `POST /api/learning/lessons/[id]/complete` - Mark complete, award XP

### Progress & Gamification
- `GET /api/learning/progress` - User's XP, level, active path
- `GET /api/learning/badges` - User's earned badges
- `GET /api/learning/badges/available` - Unlockable badges with progress
- `GET /api/learning/leaderboard` - Top learners (opt-in)

### Practice Farms
- `POST /api/learning/practice-farms` - Create practice farm
- `GET /api/learning/practice-farms` - List user's practice farms
- `GET /api/learning/practice-farms/[id]` - Get practice farm details
- `POST /api/learning/practice-farms/[id]/submit` - Submit for AI grading
- `GET /api/learning/practice-farms/[id]/feedback` - Get AI feedback
- `DELETE /api/learning/practice-farms/[id]` - Delete practice farm

### AI Features
- `POST /api/learning/ai-tutor` - Chat with AI about current lesson
- `GET /api/learning/contextual-hints` - Get hints for current farm context

### Zones & Plantings for Practice Farms
- `POST /api/learning/practice-farms/[id]/zones` - Add zone to practice farm
- `PUT /api/learning/practice-farms/[id]/zones/[zone_id]` - Update zone
- `DELETE /api/learning/practice-farms/[id]/zones/[zone_id]` - Delete zone
- `POST /api/learning/practice-farms/[id]/plantings` - Add planting
- `PUT /api/learning/practice-farms/[id]/plantings/[planting_id]` - Update
- `DELETE /api/learning/practice-farms/[id]/plantings/[planting_id]` - Delete

## Integration with Existing Features

### Species Database
- Lessons about native plants link to filterable species list
- "Native Plants for Zone 4" lesson → species filter preset
- Species detail modal shows which lessons mention that species

### AI Farm Analysis
- AI analysis responses include "Learn more" links to relevant lessons
- Example: AI suggests guild → links to "Polyculture Design" lesson
- Analysis saved with lesson references in database

### Social Feed
- Share badge achievements to feed (auto-post or manual)
- Share practice farm designs to community
- Post type: 'learning_achievement' added to FarmPost types
- Reaction type: 'bulb' for educational content

### Farm Goals
- When user sets goals, suggest relevant learning path
- Example: Goal "Increase native plants" → "Native First Approach" path
- Goal dashboard shows related completed lessons

### Regional Knowledge
- Connect lessons to regional_knowledge table
- Lessons can pull region-specific tips from community knowledge
- AI tutor references regional knowledge when personalizing

## Implementation Phases

### Phase 1 - Foundation (MVP)
**Goal:** Basic educational system with manual content

**Tasks:**
1. Database migrations for all learning tables
2. Seed data: 6 learning paths, 10 topics, 40-50 lessons
3. API endpoints for paths, topics, lessons, progress
4. UI: Learn main page (`/learn`)
5. UI: Lesson page (`/learn/lessons/[slug]`)
6. Sidebar navigation update
7. XP and level system
8. Basic badge system (Tier 1 only)
9. User progress tracking
10. Lesson completion flow

**Deliverables:**
- Users can browse learning paths
- Users can read lessons and earn XP
- Progress tracked and displayed
- Badges awarded for topic completion

### Phase 2 - AI Integration
**Goal:** Personalization and intelligent tutoring

**Tasks:**
1. AI lesson personalization endpoint
2. AI tutor chat interface in lesson page
3. Practice farm creation (reuse farm map components)
4. AI grading system for practice farms
5. Practice farm portfolio page
6. Action-triggered contextual hints
7. Help icon mini-lessons

**Deliverables:**
- Lessons adapt to user's climate and property
- AI tutor answers questions in real-time
- Users can create and submit practice farms for grading
- Contextual hints appear in farm editor

### Phase 3 - Rich Content & Gamification
**Goal:** Interactive learning and advanced progression

**Tasks:**
1. Interactive visualizations (zone diagrams, guild builders)
2. Animated growth simulations
3. Quiz system with scoring
4. Featured practice challenges
5. Tier 2 & 3 badges (mastery and path completion)
6. Leaderboard (opt-in)
7. Lesson-to-practice flow automation
8. Badge sharing to social feed

**Deliverables:**
- Engaging interactive content
- Practice challenges with AI grading
- Full badge system
- Community leaderboard

### Phase 4 - Advanced Features
**Goal:** Seamless integration and mobile optimization

**Tasks:**
1. AI gap detection for farms
2. Lesson recommendations based on farm analysis
3. Video content integration (if available)
4. Mobile-optimized learning experience
5. Offline lesson access (PWA)
6. Advanced analytics (time spent, retention, completion rates)
7. Admin dashboard for content management

**Deliverables:**
- Proactive learning suggestions
- Full mobile experience
- Analytics for content improvement

## Success Metrics

**User Engagement:**
- % of users who start a learning path (target: 40%+)
- Average lessons completed per user (target: 5+)
- Lesson completion rate (target: 60%+)

**Learning Outcomes:**
- Practice farm AI grades improving over time
- % of users applying lessons to real farms (target: 30%+)
- Badge earning rate

**Retention:**
- Weekly active learners
- Learning streak (consecutive days)
- Path completion rate (target: 15%+)

**Content Quality:**
- AI tutor interaction rate
- Lesson ratings (if implemented)
- User feedback on practice grading accuracy

## Open Questions & Future Considerations

1. **Content Licensing:** Ensure all seed content complies with copyright/CC licenses
2. **Accessibility:** WCAG compliance for lessons, alt text for diagrams
3. **Localization:** Support for multiple languages and bioregions beyond initial scope
4. **Instructor-Led:** Future option for live workshops or cohort-based learning?
5. **Certification:** Partner with permaculture organizations for official PDC credit?
6. **Community Content:** Allow expert users to contribute lessons (moderated)?
7. **Mobile App:** Native mobile app with offline lessons?

## Related Documents

- Product roadmap (where this fits in overall PermaCraft vision)
- AI prompt engineering guidelines
- Content style guide for lesson writing
- Accessibility standards

---

**Next Steps:**
Ready to proceed with implementation plan for Phase 1.
