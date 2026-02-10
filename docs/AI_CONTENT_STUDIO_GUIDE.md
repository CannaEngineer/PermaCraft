# AI Content Studio - Quick Start Guide

**Status:** ✅ Fully functional and ready to use!

---

## Overview

The AI Content Studio is an admin-only tool that lets you generate high-quality permaculture lesson content using AI in minutes. Generate 40-50 lessons in hours instead of weeks!

## Quick Start

### 1. Make Yourself an Admin

First time setup - grant yourself admin access:

```bash
npx tsx scripts/make-admin.ts your-email@example.com
```

**Important:** You must have logged into Permaculture.Studio at least once for your account to exist in the database.

### 2. Access the Admin Panel

Navigate to: **http://localhost:3000/admin/content**

You'll see:
- Dashboard with content stats
- Recent AI generations
- Lessons organized by topic
- Quick action buttons

### 3. Generate Your First Lesson

Click **"Generate New Lesson"** button

Fill out the form:
- **Topic:** Select from 10 topics (Zone Education, Native First, etc.)
- **Title:** e.g., "Zone 3 Design Principles"
- **Difficulty:** Beginner / Intermediate / Advanced
- **Duration:** 10-25 minutes (affects word count)
- **Learning Objectives:** What should students learn?
  - Example: "Understand Zone 3 characteristics, Select appropriate plants, Plan maintenance schedules"
- **Key Concepts:** Main ideas to cover
  - Example: "Zone 3 definition, Access patterns, Plant selection criteria, Maintenance frequency"
- **Quiz Questions:** 0-5 questions

Click **"Generate Lesson with AI"**

⏱️ Takes 15-30 seconds

### 4. Review & Edit

You'll be redirected to the preview page with 3 tabs:

**Content Tab:**
- Preview generated markdown content
- Click "Edit Mode" to modify
- Rich formatting, bullet points, headers
- ~800-1500 words depending on duration

**Quiz Tab:**
- Preview quiz questions
- Edit as JSON if needed
- Multiple choice with explanations
- Shows correct answers highlighted

**Metadata Tab:**
- View learning objectives
- See key concepts covered
- Source attributions
- Suggested images/diagrams

**Actions:**
- **Save Edits** - Save changes without publishing
- **Publish Lesson** - Go live immediately
- **Delete** - Discard this generation

### 5. Publish

Click **"Publish Lesson"** when ready

The system will:
1. Create the lesson in the `lessons` table
2. Assign next order_index in topic
3. Generate URL: `/learn/lessons/your-lesson-slug`
4. Create version record for audit trail
5. Mark generation as published

**Live immediately!** Students can access it right away.

---

## Workflow Examples

### Scenario 1: Generate Multiple Lessons for One Topic

**Goal:** Create 5 lessons for "Water Management" topic

1. Navigate to `/admin/content`
2. Click + icon next to "Water Management" (or use Generate button)
3. Generate lessons one by one:
   - Lesson 1: "Introduction to Water Cycles"
   - Lesson 2: "Designing Swales and Berms"
   - Lesson 3: "Pond Design Principles"
   - Lesson 4: "Rainwater Harvesting Systems"
   - Lesson 5: "Keyline Design for Slopes"

**Time:** ~15 minutes total (3 min per lesson)

### Scenario 2: Fill Content Gaps

**Goal:** Get from 3 → 40 lessons

**Strategy:**
1. Check dashboard - see which topics have fewest lessons
2. Generate 3-5 lessons per topic to balance content
3. Focus on foundational topics first:
   - Introduction to Permaculture: 5 lessons
   - Zone Education: 6 lessons (one per zone)
   - Native First Approach: 5 lessons
   - Polyculture Design: 5 lessons

**Priority topics for MVP:**
- Zones 0-5 individual lessons
- Plant guild building
- Native species selection
- Observation and assessment
- Ethics and principles

**Time:** ~2-3 hours for 40 lessons

### Scenario 3: Iterative Improvement

**Goal:** Regenerate a lesson with better quality

1. Review published lesson at `/learn/lessons/[slug]`
2. Note what needs improvement
3. Go to `/admin/content/generate`
4. Create new generation with better prompts
5. Add more specific objectives/concepts
6. Review and publish
7. Old version stays in version history

---

## AI Generation Tips

### Writing Better Prompts

**Learning Objectives** should be specific and actionable:
- ❌ Bad: "Learn about zones"
- ✅ Good: "Understand Zone 3 access patterns, Select low-maintenance perennials, Calculate optimal visit frequency"

**Key Concepts** should be comprehensive:
- ❌ Bad: "Zones"
- ✅ Good: "Zone 3 definition, 2-3x weekly visits, Perennial focus, Swale placement, Example plantings, Maintenance calendar"

### Difficulty Levels

**Beginner:**
- Foundational concepts
- Simple language
- Step-by-step explanations
- Lots of examples

**Intermediate:**
- Practical application
- Assumes basic knowledge
- More technical detail
- Case studies

**Advanced:**
- Complex systems
- Assumes expertise
- Deep dives
- Advanced techniques

### Content Length

- **10 min** = ~800 words (quick intro)
- **15 min** = ~1200 words (standard lesson)
- **20 min** = ~1500 words (comprehensive)
- **25 min** = ~1900 words (deep dive)

### Quiz Questions

**Good quiz questions:**
- Test understanding, not memorization
- Have clear correct answers
- Include helpful explanations
- Relate to real-world application

Example:
```json
{
  "question": "Which plants work best in Zone 3?",
  "options": [
    "High-maintenance annuals requiring daily care",
    "Low-maintenance perennials visited 2-3x weekly",
    "Only native wildflowers with no management",
    "Tropical species needing constant attention"
  ],
  "correct": 1,
  "explanation": "Zone 3 is for low-maintenance perennials you visit 2-3x weekly. This balances productivity with reasonable time investment."
}
```

---

## Content Quality Checklist

Before publishing, verify:

- [ ] **Accurate permaculture principles** - Connects to ethics/principles
- [ ] **Scientific names** - All plants include (Genus species)
- [ ] **Native status marked** - [NATIVE], [NATURALIZED], [NON-NATIVE]
- [ ] **Practical examples** - At least 3 real-world scenarios
- [ ] **Appropriate difficulty** - Matches target audience
- [ ] **Clear objectives** - Students know what they'll learn
- [ ] **Actionable next steps** - Ends with "what to do now"
- [ ] **Quiz tests understanding** - Not just factual recall
- [ ] **Proper length** - ~80 words per minute of reading
- [ ] **Good formatting** - Headers, bullets, readable

---

## Dashboard Features

### Content Statistics
- Total published lessons count
- Draft generations awaiting review
- Lessons per topic breakdown
- Recent activity log

### Quick Actions
- Generate new lesson
- View content library
- Access recent generations

### Topic Overview
- See lesson count per topic
- Click + to generate for specific topic
- Identify gaps at a glance

### Recent Generations
- Last 10 AI generations
- Status badges (draft/published)
- Quick "Review" button for drafts
- Metadata (topic, author, date)

---

## Advanced Features

### Batch Generation (Coming Soon)
Upload CSV with multiple lesson outlines:
```csv
topic,title,difficulty,objectives,concepts
zone-education,Zone 4 Management,intermediate,"Understand Zone 4...", "Forest gardens, Foraging..."
```

### Version Control
- Every edit creates a version record
- Track who changed what when
- Ability to rollback (future)
- Compare versions (future)

### Content Library
- Browse all published lessons
- Edit published content
- Duplicate and modify existing lessons
- Bulk operations (future)

---

## Cost & Performance

### AI Costs
- **Free tier:** 100% on OpenRouter free models
- **Per lesson:** ~2000 tokens (~$0 with free models)
- **40 lessons:** $0 - $4 total
- **Fallback:** Paid models if free tier exhausted (~$0.10/lesson)

### Speed
- **Generation:** 15-30 seconds per lesson
- **Edit/review:** 5-10 minutes (if needed)
- **Total per lesson:** ~5-12 minutes start to finish
- **40 lessons:** 2-3 hours of focused work

### Quality
- **First draft:** 80-90% ready to publish
- **With editing:** 95%+ quality
- **Consistency:** Same format, style, depth
- **Improvement:** AI learns from your edits over time

---

## Troubleshooting

### "Unauthorized" when accessing /admin
- Make sure you ran the make-admin script
- Verify you're logged in with the same email
- Check database: `SELECT email, is_admin FROM users;`

### Generation fails
- Check OpenRouter API key in .env.local
- Verify internet connection
- Try again (AI services can have hiccups)
- Check console for specific error

### Slug collision (lesson already exists)
- System auto-appends timestamp to slug
- Or edit the title slightly to change slug
- View existing lessons to avoid duplicates

### Content quality issues
- Improve your prompt specificity
- Add more learning objectives
- Include example scenarios in key concepts
- Increase estimated minutes for more depth
- Regenerate if needed

### Can't see Admin link in sidebar
- Must be logged in
- Must have is_admin = 1 in database
- Try refreshing page after running make-admin script

---

## Next Steps

### Immediate (Do Now)
1. Make yourself admin: `npx tsx scripts/make-admin.ts your@email.com`
2. Generate 5 lessons to test the system
3. Review quality and adjust prompts as needed

### Short Term (This Week)
4. Generate remaining ~35 lessons to reach 40 total
5. Focus on foundational topics (Zones, Native, Intro)
6. Test student flow: sign up → take lesson → earn badge

### Medium Term (This Month)
7. Add more advanced lessons (Tier 2)
8. Create lesson images/diagrams
9. Build content library browser
10. Implement batch generation

---

## Success Metrics

Track these to measure content studio impact:

- **Time saved:** vs manual writing
- **Lessons published:** Growth rate
- **Student completion:** % who finish lessons
- **Content quality:** Student feedback
- **Generation accuracy:** Edit % before publish
- **Topic coverage:** Balance across all 10 topics

**Target:** 40 lessons in 2-3 hours (vs 40+ hours manually)

---

## Support

For issues or questions:
- Check console logs for errors
- Review error messages carefully
- Test with simple examples first
- Iterate and improve prompts

**Remember:** The AI is a tool, you're the expert. Review and edit all content before publishing!

---

**Built with:** OpenRouter (openai/gpt-oss-120b), Next.js 14, Turso, TypeScript
**License:** CC BY-NC-SA (default for generated content)
**Last Updated:** 2026-02-09
