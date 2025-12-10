# Automatic Fallback to Paid Model

## Feature

The PDF processing system now **automatically falls back** from free to paid vision models when rate limits are hit.

## How It Works

```typescript
// lib/rag/document-processor.ts
async function performOCR(imageBase64: string, useFallback: boolean = false): Promise<string> {
  const model = useFallback ? FALLBACK_VISION_MODEL : FREE_VISION_MODEL;

  try {
    // Try with selected model
    const response = await openrouter.chat.completions.create({
      model,
      messages: [/* OCR request */],
      max_tokens: 4000,
    });

    return response.choices[0]?.message?.content || '';
  } catch (error: any) {
    // Check if it's a rate limit error (429)
    if (error.status === 429 && !useFallback) {
      console.log(`    ⚠ Free tier rate limit hit, switching to paid model (${FALLBACK_VISION_MODEL})`);
      // Retry with paid model
      return performOCR(imageBase64, true);
    }
    // Re-throw other errors
    throw error;
  }
}
```

## Behavior

**Normal Operation (Free Tier Available):**
```
📸 OCR processing page 1/15...
  ✓ Extracted 253 characters
📸 OCR processing page 2/15...
  ✓ Extracted 3364 characters
```

**Automatic Fallback (Rate Limit Hit):**
```
📸 OCR processing page 1/51...
  ⚠ Free tier rate limit hit, switching to paid model (google/gemini-2.5-flash-lite)
  ✓ Extracted 149 characters
📸 OCR processing page 2/51...
  ⚠ Free tier rate limit hit, switching to paid model (google/gemini-2.5-flash-lite)
  ✓ Extracted 325 characters
```

## Models Used

| Tier | Model | Cost | Speed | Use Case |
|------|-------|------|-------|----------|
| **Free** | `amazon/nova-2-lite-v1:free` | Free | Fast | Primary OCR model |
| **Fallback** | `google/gemini-2.5-flash-lite` | ~$0.0001/page | Very Fast | Rate limit fallback |

**Note:** Gemini 2.5 Flash Lite is one of the cheapest vision models (~$0.10 per 1,000 pages).

## Cost Estimate

**Scenario: Processing 200-page PDF**

Free tier allows 50 requests/day, so:
- **Pages 1-50:** Free tier (no cost)
- **Pages 51-200:** Paid fallback (150 pages × $0.0001 = **~$0.015**)

**Total cost: ~$0.015 for a 200-page PDF** (after free tier exhausted)

## Configuration

Edit `/lib/ai/openrouter.ts` to change fallback model:

```typescript
// Current fallback model
export const FALLBACK_VISION_MODEL = "google/gemini-2.5-flash-lite";

// Alternative options:
export const FALLBACK_VISION_MODEL = "google/gemini-2.0-flash-exp:free"; // Different free model
export const FALLBACK_VISION_MODEL = "anthropic/claude-3.5-sonnet"; // Premium quality
export const FALLBACK_VISION_MODEL = "openai/gpt-4o-mini"; // OpenAI alternative
```

## Advantages

1. **Zero Interruption** - Processing continues automatically
2. **Cost Efficient** - Only pays for pages after free tier exhausted
3. **Transparent** - Logs show when fallback occurs
4. **Fast** - Gemini Flash Lite is extremely fast for OCR
5. **No Manual Intervention** - No need to wait for daily reset

## Logs

When fallback occurs, you'll see:

```
⚠ Free tier rate limit hit, switching to paid model (google/gemini-2.5-flash-lite)
```

This message appears once per page until the free tier resets.

## Verified Working

**Test Case:** 51-page PDF processed after hitting free tier rate limit

**Result:**
```
✓ All 51 pages processed successfully
✓ Automatic fallback to paid model on every page
✓ Zero failures or interruptions
✓ ~11,000 characters extracted
```

## Alternative Approach (Original)

Without automatic fallback, you would need to:

1. Wait for rate limit to reset (24 hours)
2. OR manually add $10 credits to unlock 1000 requests/day
3. OR manually switch model in code

**With automatic fallback:** Just works! Processing continues seamlessly.

## Summary

✅ **Implemented:** Automatic fallback from free to paid model on 429 errors

✅ **Cost:** ~$0.0001 per page (only after free tier exhausted)

✅ **Zero Downtime:** Processing never stops

✅ **Transparent:** Clear logging of when fallback occurs

---

**Implementation:** 2025-12-09
**File:** `lib/rag/document-processor.ts`
**Lines:** 36-76
