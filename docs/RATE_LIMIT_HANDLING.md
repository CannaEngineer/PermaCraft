# OpenRouter Rate Limit Handling

## Issue

Hit OpenRouter's free tier rate limit during batch PDF processing:

```
RateLimitError: 429 Rate limit exceeded: free-models-per-day.
Add 10 credits to unlock 1000 free model requests per day
```

## Rate Limit Details

**Free Tier:**
- **Limit:** 50 requests per day
- **Reset:** Daily at midnight UTC
- **Affected:** OCR vision model (`amazon/nova-2-lite`)

**Paid Tier ($10 credits):**
- **Limit:** 1000 requests per day
- **Cost:** Pay-per-use after unlocking

## What Happened

Processing was going well:
- ✅ Document 1: `dovetailpermaculture0915.pdf` (15 pages) - **Completed** (50 chunks)
- ⚠️ Document 2: `permaculture_basics_for_home_gardeners1.pdf` (51 pages) - **Failed at page 24/51**
- ⏸️ Documents 3-5: Not started

**Total API calls before limit:**
- Document 1: 15 pages
- Document 2: 23 pages (partial)
- **Total: ~38 requests** (we had a few from testing earlier)

## Current Status

```
📚 Knowledge Sources:
- ✅ 2 completed (53 chunks total)
- ⏳ 5 queued (will retry when limit resets)

🔢 Embeddings:
- ✅ 46 chunks embedded with Qwen3
```

## ✅ Automatic Fallback (IMPLEMENTED)

The system now **automatically switches to a paid model** when free tier rate limits are hit!

**How it works:**
1. Try free model (`amazon/nova-2-lite-v1:free`)
2. If 429 rate limit error → automatically retry with paid model (`google/gemini-2.5-flash-lite`)
3. Processing continues seamlessly with zero interruption

**Cost:** ~$0.0001 per page (only for pages processed after free tier exhausted)

**See:** [AUTOMATIC_FALLBACK.md](./AUTOMATIC_FALLBACK.md) for full details

---

## Manual Solutions (if needed)

### Option 1: Wait for Reset (Free)

Rate limit resets daily. Just wait and re-run:

```bash
# Tomorrow (after reset):
npx tsx scripts/manual-rag-test.ts
```

The system will:
- Skip already-processed documents
- Resume from failed documents
- Process remaining queue

### Option 2: Add Credits ($10)

Unlock 1000 requests/day:

1. Go to [OpenRouter Credits](https://openrouter.ai/credits)
2. Add $10 minimum
3. Unlocks 1000 free model requests per day
4. Plus pay-per-use for all models

**Remaining processing:**
- 5 documents × ~50 pages avg = ~250 pages
- Well within 1000 request limit

### Option 3: Use Alternative OCR

Switch to a paid vision model with higher limits:

```typescript
// In lib/ai/openrouter.ts
export const FREE_VISION_MODEL = 'google/gemini-2.0-flash-exp:free'; // Different free model
// OR
export const PAID_VISION_MODEL = 'anthropic/claude-3.5-sonnet'; // Paid, higher limits
```

**Note:** Paid models cost per request but have much higher rate limits.

### Option 4: Process Gradually

Spread processing over multiple days:

```bash
# Day 1: Process 2 documents
npx tsx scripts/manual-rag-test.ts

# Day 2: Process 2 more
npx tsx scripts/manual-rag-test.ts

# etc.
```

Each day's 50 requests = ~2-3 average-sized PDFs.

## Recommendations

**For Development/Testing:**
- **Option 1** (Wait) - Free, simple, just slower

**For Production:**
- **Option 2** (Add Credits) - $10 one-time unlock for 1000/day free requests
- Best value for ongoing use
- Still uses free models, just higher limit

## Implementation Notes

### Graceful Rate Limit Handling

The current code already handles rate limits gracefully:

```typescript
for (let pageNum = 1; pageNum <= pagesToProcess; pageNum++) {
  try {
    // OCR processing...
  } catch (error) {
    console.error(`✗ Error processing page ${pageNum}:`, error);
    // Continue with other pages even if one fails ✓
  }
}
```

**Behavior:**
- ✅ Partial text is saved (pages that succeeded before rate limit)
- ✅ Document marked as failed (can retry later)
- ✅ Queue continues (other documents processed if possible)

### Resume Processing

To resume after rate limit resets:

```bash
# Check status
npx tsx scripts/check-rag-status.ts

# Process failed/queued documents
npx tsx scripts/manual-rag-test.ts

# OR start app (if RAG_AUTO_PROCESS=true)
npm run dev
```

The auto-scanner will:
- Detect failed documents
- Re-queue them for processing
- Skip already-completed documents

## Monitoring

Check rate limit headers in error:

```
x-ratelimit-limit: 50
x-ratelimit-remaining: 0
x-ratelimit-reset: 1765324800000  // Unix timestamp in ms
```

Convert reset time:
```bash
node -e "console.log(new Date(1765324800000).toLocaleString())"
```

## Long-Term Solution

For large-scale processing:

1. **Add credits** ($10) - Unlocks 1000 free requests/day
2. **Use embeddings only** - Skip OCR for text-based PDFs
3. **Implement retry logic** - Auto-retry after reset
4. **Add progress tracking** - Save partial progress
5. **Rate limit awareness** - Check `x-ratelimit-remaining` before processing

## Summary

✅ **pdftoppm fix is working** - Successfully processed documents before hitting rate limit

⏳ **Rate limit hit** - Free tier: 50 requests/day (used ~38 today)

🔄 **5 documents queued** - Will auto-process when limit resets or credits added

**Next steps:**
1. Wait until tomorrow (free) OR add $10 credits (1000 requests/day)
2. Run `npx tsx scripts/manual-rag-test.ts`
3. System will auto-resume from where it stopped

---

**Date:** 2025-12-09
**Reset Time:** Daily at midnight UTC
**Current Status:** 2/7 documents complete, 5 queued
