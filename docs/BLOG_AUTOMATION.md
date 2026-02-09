# Blog Automation Setup

## Overview

The PermaCraft blog system features AI-powered automated content generation using OpenRouter's Claude Opus 4 model. The system is designed to generate 3 high-quality, SEO-optimized blog posts per day (one every 6 hours).

## Features

- **Intelligent Topic Discovery**: Discovers trending permaculture topics based on season, current trends, and educational value
- **SEO Optimization**: Generates meta descriptions, keywords, and structured content for maximum search visibility
- **Automatic Tagging**: AI assigns relevant tags to each post
- **XP Rewards**: Logged-in users earn 15 XP for completing blog articles
- **Badge System**: Reading milestones unlock badges (1, 10, 25, 50 articles)
- **Analytics Tracking**: Tracks views, completed reads, and engagement metrics

## Generation Schedule

**Recommended**: 3 posts per day
**Frequency**: Every 6 hours
**Schedule**: 12:00 AM, 6:00 AM, 12:00 PM, 6:00 PM (UTC)

## Environment Variables Required

Add these to your `.env` file:

```bash
# OpenRouter API (required for blog generation)
OPENROUTER_API_KEY=sk-or-...

# Cron job security (generate a random secret)
CRON_SECRET=your-random-secret-here

# Your app URL
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

To generate a CRON_SECRET:
```bash
openssl rand -base64 32
```

## Cron Job Setup

### Option 1: Vercel Cron Jobs (Recommended for Vercel deployments)

Create `vercel.json` in your project root:

```json
{
  "crons": [
    {
      "path": "/api/blog/auto-generate",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

The schedule `0 */6 * * *` means "run at minute 0 of every 6th hour" (12 AM, 6 AM, 12 PM, 6 PM UTC).

Vercel will automatically send the `CRON_SECRET` as a bearer token.

### Option 2: External Cron Service (EasyCron, cron-job.org, etc.)

Set up a POST request to:
```
https://your-domain.com/api/blog/auto-generate
```

**Headers:**
```
Authorization: Bearer YOUR_CRON_SECRET_HERE
Content-Type: application/json
```

**Schedule:** Every 6 hours (adjust for your timezone)

Popular services:
- **EasyCron**: https://www.easycron.com/
- **cron-job.org**: https://cron-job.org/
- **Cronitor**: https://cronitor.io/

### Option 3: Server-side Cron (if self-hosting)

Add to your crontab:

```bash
# Generate blog post every 6 hours
0 */6 * * * curl -X POST https://your-domain.com/api/blog/auto-generate \
  -H "Authorization: Bearer YOUR_CRON_SECRET_HERE" \
  -H "Content-Type: application/json"
```

Edit crontab:
```bash
crontab -e
```

## Manual Generation (Admin Dashboard)

For immediate testing or content needs:

1. Navigate to `/admin/blog`
2. Click "Generate Now" button
3. Wait 30-60 seconds for AI generation
4. Post will be automatically published

## API Endpoints

### Automated Generation (Cron)
```
POST /api/blog/auto-generate
Headers: Authorization: Bearer {CRON_SECRET}
```

**Response:**
```json
{
  "success": true,
  "postId": "uuid",
  "message": "Blog post generated and published"
}
```

### Manual Generation (Admin)
```
POST /api/blog/generate-manual
Requires: Admin authentication
```

## Content Strategy

The AI system follows these principles:

1. **Seasonal Relevance**: Topics match current month/season
2. **Permaculture Focus**: All content tied to permaculture ethics and principles
3. **SEO-Driven**: Primary keywords in first 100 words, natural distribution
4. **Educational Value**: Targets beginners, intermediate, and advanced learners
5. **Actionable Content**: Includes practical steps and key takeaways
6. **Scientific Accuracy**: Uses scientific plant names and permaculture principles

## Database Tables

The system uses these tables:

- **blog_posts**: Main blog content with SEO fields
- **blog_tags**: Tag library
- **blog_post_tags**: Many-to-many relationship
- **blog_post_reads**: Track user reading for XP
- **blog_generation_queue**: Schedule future topics
- **blog_generation_analytics**: Daily metrics

## Monitoring

Check blog system health:

1. Admin Dashboard (`/admin/blog`) shows:
   - Total posts
   - AI-generated count
   - Total views
   - Completed reads

2. Individual post metrics:
   - View count
   - Read completion count
   - XP earned by users

## Cost Estimation

Using OpenRouter Claude Opus 4:
- ~8,000 tokens per generation (input + output)
- Current pricing: ~$0.40 per post
- 3 posts/day = ~$1.20/day = ~$36/month

Alternative: Use free models during testing:
```typescript
// In lib/blog/auto-generator.ts
const PREMIUM_MODEL = 'meta-llama/llama-3.2-90b-vision-instruct:free';
```

## Troubleshooting

### Posts not generating
1. Check `OPENROUTER_API_KEY` is valid
2. Verify cron job is running (check logs)
3. Test manual generation from admin dashboard

### Authentication errors
1. Verify `CRON_SECRET` matches in `.env` and cron config
2. Check Vercel environment variables are set

### Quality issues
1. Review prompts in `lib/blog/auto-generator.ts`
2. Adjust temperature (currently 0.7-0.8)
3. Switch to premium model if using free tier

## Best Practices

1. **Start Manual**: Generate 5-10 posts manually to build content base
2. **Monitor Quality**: Review first week of automated posts
3. **Adjust Schedule**: Match your audience's timezone
4. **Tag Maintenance**: Periodically review and consolidate tags
5. **SEO Tracking**: Monitor which topics drive traffic

## Future Enhancements

Planned features:
- Topic queue management
- Custom topic suggestions
- A/B testing headlines
- Social media auto-posting
- Newsletter integration
- Trending topic API integration

## Support

For issues or questions:
- Review logs at `/api/blog/auto-generate`
- Check admin dashboard for generation stats
- Test with manual generation first
- Verify OpenRouter API status

---

**Ready to Launch**: Once cron job is configured, your blog will automatically fill with high-quality permaculture content, driving SEO traffic and user engagement!
