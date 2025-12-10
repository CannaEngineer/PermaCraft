# PDF Ingestion Guide

## How New PDFs Get Into Your Knowledge Base

### Quick Answer

**Just drop a PDF in `data/knowledge/` and restart the app!**

```bash
cp your-book.pdf data/knowledge/
npm run dev
```

The system automatically detects, processes, and embeds it. ✨

---

## The Complete Flow

### 1. Drop PDF in Folder

```bash
data/knowledge/
├── permaculture-designers-manual.pdf  ← Your new PDF
├── permaculture-designers-manual.meta.json  ← Optional metadata
└── README.md
```

### 2. App Startup Triggers Auto-Scan

**What happens when you run `npm run dev`:**

```typescript
app/layout.tsx
  └─ imports lib/rag/startup.ts
      └─ calls initializeRAG()
          └─ runs autoScanAndQueue()
```

The system:
1. **Scans** `data/knowledge/` folder
2. **Hashes** each PDF (SHA-256)
3. **Compares** with database
4. **Detects** status: NEW | UPDATED | UNCHANGED

### 3. Auto-Scan Logic

```
For each PDF:
├─ Calculate SHA-256 hash
├─ Check knowledge_sources table
│
├─ IF file doesn't exist
│   └─ Mark as NEW → Queue for processing
│
├─ ELSE IF hash changed
│   └─ Mark as UPDATED → Queue for reprocessing
│
├─ ELSE IF status = 'failed'
│   └─ Mark for RETRY → Queue for reprocessing
│
└─ ELSE
    └─ SKIP (already processed)
```

### 4. Document Queuing

When a PDF is detected (new/updated):

```sql
-- 1. Create knowledge_sources record
INSERT INTO knowledge_sources (
  id, filename, file_path, file_hash, title,
  author, publication_year, topics, priority,
  processing_status
) VALUES (...)

-- 2. Add to processing queue
INSERT INTO knowledge_processing_queue (
  id, filename, file_path, priority, status
) VALUES (uuid, 'book.pdf', 'data/knowledge/book.pdf', 50, 'queued')
```

### 5. Auto-Processing (if enabled)

**Requires:** `RAG_AUTO_PROCESS=true` in `.env.local`

The queue processor runs in background:

```
For each queued document:

1. OCR Extraction (30-60 sec/page)
   ├─ pdftoppm: PDF → PNG images
   ├─ OpenRouter vision: PNG → Text
   └─ Combine: All pages → Full text

2. Semantic Chunking (instant)
   ├─ Split text into 1000-char chunks
   ├─ Add 200-char overlap
   ├─ Respect sentence boundaries
   └─ Store in knowledge_chunks table

3. Embedding Generation (1 sec/chunk)
   ├─ Call Qwen3 API
   ├─ Get 4096-dim vectors
   └─ Save as BLOB (16KB each)

4. Update Status
   └─ Mark as 'completed'
```

### 6. Ready for Semantic Search!

Once processed, the PDF content is searchable:

```typescript
// In AI analysis endpoint
const ragContext = await getRAGContext(userQuery, 5);
// Returns top 5 most relevant chunks
```

---

## Configuration Options

### Option 1: Full Auto (Recommended)

**`.env.local`:**
```env
RAG_AUTO_SCAN=true      # Detect PDFs on startup
RAG_AUTO_PROCESS=true   # Process them automatically
OPENROUTER_API_KEY=sk-or-v1-...
```

**Behavior:**
- Drop PDF → Restart app → Fully processed automatically
- Zero manual intervention
- Best for production

### Option 2: Scan Only

**`.env.local`:**
```env
RAG_AUTO_SCAN=true      # Detect PDFs on startup
RAG_AUTO_PROCESS=false  # Don't process automatically
OPENROUTER_API_KEY=sk-or-v1-...
```

**Behavior:**
- Drop PDF → Restart app → Queued but not processed
- Manual processing: `npx tsx scripts/manual-rag-test.ts`
- Good for review before processing

### Option 3: Manual Only

**`.env.local`:**
```env
RAG_AUTO_SCAN=false     # No auto-scanning
```

**Behavior:**
- Drop PDF → Nothing happens
- Manual scan: `npx tsx scripts/manual-rag-test.ts`
- Manual embeddings: `npx tsx scripts/test-embeddings.ts`
- Good for development/testing

---

## Optional Metadata Files

Enhance PDFs with metadata by creating a `.meta.json` file:

**Filename:** Same as PDF with `.meta.json` extension

**Example:** `permaculture-designers-manual.meta.json`
```json
{
  "title": "Permaculture: A Designer's Manual",
  "author": "Bill Mollison",
  "year": 1988,
  "isbn": "978-0908228010",
  "topics": ["design", "water", "soil", "guilds"],
  "priority": "high"
}
```

**Priority affects processing order:**
- `"high"` → Priority 80 (processed first)
- `"normal"` → Priority 50 (default)
- `"low"` → Priority 30 (processed last)

**If no metadata file:**
- Title extracted from filename
- `permaculture-designers-manual.pdf` → "Permaculture Designers Manual"

---

## Monitoring & Status

### Check What's Being Processed

```bash
npx tsx scripts/check-rag-status.ts
```

**Output:**
```
📊 RAG System Status

📚 Knowledge Sources:
┌─────────────────────────────────┬──────────────┬──────────────┐
│ filename                        │ status       │ total_chunks │
├─────────────────────────────────┼──────────────┼──────────────┤
│ restorationagriculture.pdf      │ completed    │ 3            │
│ permaculture-designers-manual..│ processing   │ 0            │
└─────────────────────────────────┴──────────────┴──────────────┘

📋 Processing Queue:
┌─────────────────────────────────┬──────────┬──────────┐
│ filename                        │ status   │ priority │
├─────────────────────────────────┼──────────┼──────────┤
│ permaculture-designers-manual..│ queued   │ 80       │
└─────────────────────────────────┴──────────┴──────────┘

🔢 Embeddings:
┌───────┬──────────┬───────────────────────────┐
│ total │ embedded │ embedding_model           │
├───────┼──────────┼───────────────────────────┤
│ 3     │ 3        │ qwen/qwen3-embedding-8b   │
└───────┴──────────┴───────────────────────────┘
```

### Check App Logs

When app starts, you'll see:

```
📚 Initializing RAG system...
📚 Scanning knowledge folder: /path/to/data/knowledge
  Checking: permaculture-designers-manual.pdf
    ✓ New document detected

  Summary: 1 new, 0 updated, 3 skipped

📥 Queueing 1 documents for processing...
  Queued: permaculture-designers-manual.pdf (priority: 80)

✓ Auto-scan complete: 1 new, 0 updated

📝 Starting background document processing...

▶ Processing: permaculture-designers-manual.pdf
  ✓ PDF has 650 page(s), processing first 999
  ✓ Converted 650 page(s) to images
  📸 OCR processing page 1/650...
    ✓ Extracted 1243 characters
  ...
```

---

## Troubleshooting

### PDF Not Detected

**Check:**
1. Is file in correct folder? `data/knowledge/`
2. Is it a `.pdf` extension?
3. Is `RAG_AUTO_SCAN=true` in `.env.local`?
4. Did you restart the app after adding the PDF?

**Test manually:**
```bash
npx tsx scripts/manual-rag-test.ts
```

### PDF Queued But Not Processing

**Reason:** `RAG_AUTO_PROCESS=false` or not set

**Solution:**
```bash
# Add to .env.local
RAG_AUTO_PROCESS=true

# OR manually process queue
npx tsx scripts/manual-rag-test.ts
```

### Processing Failed

**Check logs for:**
- `processing_status = 'failed'` in database
- Error messages in console

**Common causes:**
- Corrupted PDF
- Scanned images (not text-based PDFs) - OCR will handle these!
- API key issues
- Rate limits

**Retry:**
```bash
# Failed documents auto-retry on next scan
npm run dev

# OR manually retry
npx tsx scripts/manual-rag-test.ts
```

### No Embeddings Generated

**Check:**
1. Is `OPENROUTER_API_KEY` set?
2. Did OCR complete successfully?
3. Are chunks in `knowledge_chunks` table?

**Generate manually:**
```bash
npx tsx scripts/test-embeddings.ts
```

---

## Performance Notes

### Processing Time Estimates

**For a 200-page PDF:**
- OCR: 100-200 minutes (30-60 sec/page)
- Chunking: < 1 second
- Embeddings (200 chunks): ~200 seconds
- **Total: ~2-3 hours**

### Background Processing

Processing runs in background - doesn't block app startup.

You can:
- Use the app normally
- Add more PDFs while processing
- Monitor progress in logs

### Cost Estimates

**OpenRouter (free tier):**
- OCR: Amazon Nova 2 Lite (FREE)
- Embeddings: Qwen3 (check OpenRouter pricing)

**For 200-page PDF:**
- ~200 chunks
- ~4,000 tokens
- Cost: Check OpenRouter dashboard

---

## Manual Processing Scripts

### Scan and Process
```bash
npx tsx scripts/manual-rag-test.ts
```
- Scans folder
- Queues new PDFs
- Processes queue
- Generates embeddings

### Just Generate Embeddings
```bash
npx tsx scripts/test-embeddings.ts
```
- For chunks without embeddings
- Useful after manual OCR

### Check Status
```bash
npx tsx scripts/check-rag-status.ts
```
- Shows all sources
- Shows queue status
- Shows embedding counts

### Test Semantic Search
```bash
npx tsx scripts/test-semantic-search.ts
```
- Tests search with sample queries
- Verifies embeddings work

---

## Example Workflows

### Workflow 1: Add Single PDF

```bash
# 1. Drop PDF
cp gaias-garden.pdf data/knowledge/

# 2. Restart app
npm run dev

# 3. Monitor logs
# Auto-scan detects it → queues → processes → embeds

# 4. Verify (in separate terminal)
npx tsx scripts/check-rag-status.ts
```

### Workflow 2: Batch Add Multiple PDFs

```bash
# 1. Drop all PDFs
cp *.pdf data/knowledge/

# 2. Add metadata (optional)
cat > data/knowledge/gaias-garden.meta.json <<EOF
{
  "title": "Gaia's Garden",
  "author": "Toby Hemenway",
  "priority": "high"
}
EOF

# 3. Restart app
npm run dev

# All detected and queued by priority
# High priority PDFs process first
```

### Workflow 3: Replace Updated PDF

```bash
# 1. Replace file (same filename)
cp gaias-garden-2nd-edition.pdf data/knowledge/gaias-garden.pdf

# 2. Restart app
npm run dev

# Auto-scan detects hash change → marks as updated
# Old chunks deleted, new ones created
```

---

## Summary

**Automatic Mode (Recommended):**
1. Set `RAG_AUTO_SCAN=true` and `RAG_AUTO_PROCESS=true`
2. Drop PDF in `data/knowledge/`
3. Restart app
4. Done! ✨

**Manual Mode:**
1. Drop PDF in `data/knowledge/`
2. Run `npx tsx scripts/manual-rag-test.ts`
3. Run `npx tsx scripts/test-embeddings.ts`
4. Done!

**The system handles:**
- ✅ Detection
- ✅ Deduplication (via hash)
- ✅ OCR extraction
- ✅ Chunking
- ✅ Embedding generation
- ✅ Semantic search indexing

**You just add PDFs!** 🎉
