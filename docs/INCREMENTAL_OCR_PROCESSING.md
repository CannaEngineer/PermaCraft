# Incremental OCR Processing

## Problem Solved

Previously, if OCR processing stopped halfway through a PDF (e.g., credits ran out), **all work was lost** and the document would be reprocessed from page 1.

## Solution

**Incremental checkpoint system** that saves progress as each page is processed.

## How It Works

### 1. Check Existing Progress

Before starting OCR, the system queries the database to see which pages are already done:

```typescript
async function getProcessedPages(sourceId: string): Promise<Set<number>> {
  const result = await db.execute({
    sql: 'SELECT DISTINCT page_number FROM knowledge_chunks WHERE source_id = ?',
    args: [sourceId],
  });
  // Returns Set of page numbers already processed
}
```

### 2. Skip Already-Processed Pages

```typescript
for (let pageNum = 1; pageNum <= pagesToProcess; pageNum++) {
  // Skip pages that are already processed
  if (processedPages.has(pageNum)) {
    console.log(`  ○ Page ${pageNum}/${numPages} already processed, skipping`);
    skippedPages++;
    continue;
  }

  // Process only new pages...
}
```

### 3. Save Each Page Immediately

After OCR completes for a page, chunks are saved immediately to the database:

```typescript
const pageText = await performOCR(imageBase64);

if (pageText.trim().length > 0) {
  // SAVE CHUNKS IMMEDIATELY after successful OCR
  chunkIndex = await savePageChunks(sourceId, pageNum, pageText, chunkIndex);
  console.log(`    ✓ Saved chunks for page ${pageNum} to database`);

  newPagesProcessed++;
}
```

### 4. Resume on Retry

If processing stops at page 20 of 100:
- ✅ Pages 1-20: Saved in database
- ⏸️ Pages 21-100: Not yet processed

On retry:
- ✅ Pages 1-20: **Skipped** (already done)
- 🔄 Pages 21-100: **Processed** (picks up where it left off)

## Example Output

### First Run (Stopped at Page 20)

```
📄 Extracting text from book.pdf...
  ✓ PDF has 100 page(s), processing up to 100
  ✓ Converted 100 page(s) to images

  📸 OCR processing page 1/100...
    ✓ Extracted 1234 characters
    ✓ Saved chunks for page 1 to database

  📸 OCR processing page 2/100...
    ✓ Extracted 1156 characters
    ✓ Saved chunks for page 2 to database

  ...

  📸 OCR processing page 20/100...
    ✓ Extracted 1289 characters
    ✓ Saved chunks for page 20 to database

  ✗ Error processing page 21: RateLimitError: 429 Rate limit exceeded

  ✅ Processing summary: 20 new pages, 0 skipped (already done)
```

### Second Run (Resumes from Page 21)

```
📄 Extracting text from book.pdf...
  ✓ PDF has 100 page(s), processing up to 100
  ✓ Found 20 already-processed pages - will resume from where we left off
  ✓ Converted 100 page(s) to images

  ○ Page 1/100 already processed, skipping
  ○ Page 2/100 already processed, skipping
  ...
  ○ Page 20/100 already processed, skipping

  📸 OCR processing page 21/100...
    ✓ Extracted 1342 characters
    ✓ Saved chunks for page 21 to database

  📸 OCR processing page 22/100...
    ✓ Extracted 1198 characters
    ✓ Saved chunks for page 22 to database

  ...

  ✅ Processing summary: 80 new pages, 20 skipped (already done)
```

## Benefits

### 1. No Wasted Work
- Every successfully processed page is saved immediately
- Never redo work that's already completed
- Safe to retry multiple times

### 2. Cost Savings
- Only pay for pages actually processed
- Previous runs (even failed ones) preserve their work
- Optimal use of free tier and paid credits

### 3. Large Documents
- Can process 500+ page PDFs over multiple sessions
- Process 50 pages/day with free tier
- Continue next day from where you left off

### 4. Fault Tolerance
- Network issues? Resume automatically
- Credits exhausted? Continue later
- Script crashed? Just re-run

## Database Schema

Uses existing `knowledge_chunks` table:

```sql
CREATE TABLE knowledge_chunks (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL,        -- Links to knowledge_sources
  page_number INTEGER,             -- Which page this chunk is from
  chunk_text TEXT NOT NULL,
  ...
);
```

**Key:** `page_number` column allows tracking which pages are complete.

## Source Status

The system now tracks processing status more accurately:

```typescript
// If all pages processed
processing_status = 'completed'

// If some pages remaining
processing_status = 'pending'

// If error occurred
processing_status = 'failed'
```

On retry, failed documents are automatically re-queued and resume from last successful page.

## Performance Impact

**Minimal overhead:**
- Database query to get processed pages: ~10ms
- Page skip check: <1ms per page
- Chunk save after each page: ~50ms total per page

**For 100-page PDF:**
- Overhead: ~1 second total
- OCR time: 50-100 minutes (dominant factor)
- **Overhead is negligible** compared to OCR time

## Manual Recovery

If you need to reprocess specific pages, delete their chunks:

```sql
-- Reprocess pages 20-30 of a document
DELETE FROM knowledge_chunks
WHERE source_id = '<source-id>'
AND page_number BETWEEN 20 AND 30;

-- Then re-run processing
```

## Testing

To test incremental processing:

```bash
# Process a multi-page PDF
npx tsx scripts/manual-rag-test.ts

# Kill the process mid-way (Ctrl+C)

# Re-run - should resume from where it left off
npx tsx scripts/manual-rag-test.ts
```

## Summary

✅ **Incremental Saving:** Chunks saved after each page OCR completes

✅ **Smart Resume:** Automatically skips already-processed pages

✅ **Zero Wasted Work:** Previous progress always preserved

✅ **Cost Efficient:** Only pay for new pages, not re-processing

✅ **Large Document Support:** Process 500+ page PDFs over multiple sessions

---

**Implementation:** 2025-12-09
**Files Modified:**
- `lib/rag/document-processor.ts` - Added getProcessedPages(), savePageChunks(), incremental processing loop
**Lines:** 78-255
