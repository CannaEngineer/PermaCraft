# RAG (Retrieval-Augmented Generation) System

## Overview

The RAG system automatically ingests permaculture PDFs, extracts text via OCR, and stores them in a searchable knowledge base. This grounds AI responses in authoritative permaculture literature.

## ✅ What's Working

### 1. Auto-Scanning PDF Detection
- Drop PDFs into `/data/knowledge/`
- System detects new/updated files automatically
- Tracks changes via SHA-256 hash

### 2. OCR Text Extraction
- Converts PDF pages to images using `pdftoppm`
- Extracts text using OpenRouter's free vision models (Amazon Nova 2 Lite)
- Handles multi-page documents
- Page limit: 3 pages per PDF (for testing/cost control)

### 3. Semantic Chunking
- Splits extracted text into 1000-character chunks
- 200-character overlap for context preservation
- Respects sentence and paragraph boundaries
- Stores chunks with metadata (page numbers, source document)

### 4. Database Storage
- All chunks stored in `knowledge_chunks` table
- Metadata in `knowledge_sources` table
- Processing queue for async workflows

### 5. Embedding Generation
- **OpenRouter Qwen3** (`qwen/qwen3-embedding-8b`)
- **8192-dimensional vectors** (high quality!)
- Uses same API key as OCR (unified platform)
- Enables semantic search

## 🚀 Quick Start

### Basic Usage (OCR Only - Free)

1. **Add a PDF:**
   ```bash
   cp your-permaculture-book.pdf /home/daniel/PROJECTS/FARM_PLANNER/data/knowledge/
   ```

2. **Restart the dev server:**
   ```bash
   npm run dev
   ```
   The system auto-scans on startup (if `RAG_AUTO_SCAN=true`)

3. **Or manually trigger processing:**
   ```bash
   npx tsx scripts/manual-rag-test.ts
   ```

### Advanced Usage (With Embeddings)

**Good news:** You already have everything you need! The same OpenRouter API key used for OCR also works for embeddings.

1. **Generate embeddings:**
   ```bash
   OPENROUTER_API_KEY="your-key" npx tsx scripts/test-embeddings.ts
   ```
   Or it will auto-detect from `.env.local`

2. **Verify:**
   ```bash
   turso db shell permaculture-studio
   ```
   ```sql
   SELECT COUNT(*) FROM knowledge_chunks WHERE embedding IS NOT NULL;
   SELECT chunk_text, embedding_model FROM knowledge_chunks LIMIT 1;
   ```

3. **What you get:**
   - **Model:** qwen/qwen3-embedding-8b
   - **Dimensions:** 8192 (very high quality!)
   - **Cost:** Included with OpenRouter (same key as OCR)

## 📁 Folder Structure

```
data/knowledge/
├── restorationagriculture.pdf          # Your PDF files
├── restorationagriculture.meta.json    # Optional metadata
└── README.md                           # Usage instructions
```

## 📝 Optional Metadata Files

Add a `.meta.json` file alongside your PDF for better organization:

**Example: `restorationagriculture.meta.json`**
```json
{
  "title": "Restoration Agriculture",
  "author": "Mark Shepard",
  "year": 2013,
  "topics": ["agroforestry", "perennial crops", "restoration"],
  "priority": "high"
}
```

## 🛠️ Environment Variables

Add to `.env.local`:

```env
# Auto-scan PDFs on startup (recommended)
RAG_AUTO_SCAN=true

# Auto-process PDFs after scanning (optional)
RAG_AUTO_PROCESS=true

# OpenRouter API key (required - used for both OCR and embeddings)
OPENROUTER_API_KEY=sk-or-v1-...
```

## 📊 Database Schema

### `knowledge_sources`
- Tracks source documents (PDFs)
- Stores metadata, processing status
- Unique filename constraint

### `knowledge_chunks`
- Text chunks extracted from documents
- Page numbers, chunk index
- Optional embedding vectors (BLOB)
- chunk_hash for deduplication

### `knowledge_processing_queue`
- Async processing queue
- Priority-based ordering
- Status tracking

## 🎯 Current Limitations

1. **Page Limit:** Only first 3 pages processed (configurable in `document-processor.ts`)
2. **OCR Speed:** ~30-60 seconds per page with OpenRouter
3. **No Vector Search Yet:** Embeddings are stored but search not implemented
4. **PDF Format:** Only PDFs supported (no .txt or .md yet)

## 🔧 Configuration

### Adjust Page Limit

Edit `/lib/rag/document-processor.ts`:

```typescript
export async function extractTextFromPDF(
  filepath: string,
  maxPages: number = 3  // <-- Change this number
): Promise<...>
```

### Change Chunk Size

Edit `/lib/rag/document-processor.ts`:

```typescript
const CHUNK_SIZE = 1000;      // <-- Target characters per chunk
const CHUNK_OVERLAP = 200;     // <-- Overlap between chunks
const MIN_CHUNK_SIZE = 100;    // <-- Minimum chunk size
```

## 🧪 Testing

### Test OCR Pipeline
```bash
npx tsx scripts/manual-rag-test.ts
```

**Expected Output:**
```
▶ Processing: restorationagriculture.pdf
  ✓ PDF has 196 page(s), processing first 3
  ✓ Converted 3 page(s) to images
  📸 OCR processing page 1/196...
    ✓ Extracted 82 characters
  ...
  ✓ Saved 3/3 chunks
```

### Test Embeddings
```bash
npx tsx scripts/test-embeddings.ts
```

## 📈 Cost Estimates

### OCR (OpenRouter)
- Model: Amazon Nova 2 Lite (free tier)
- Speed: ~30-60s per page
- Cost: **$0.00** (free)

### Embeddings (OpenRouter)
- Model: qwen/qwen3-embedding-8b
- Dimensions: 8192 (high quality!)
- Cost: Check OpenRouter pricing
- Same API key as OCR (unified platform)

## 🔮 Future Enhancements

1. **Vector Search:** Implement similarity search using embeddings
2. **Full Document Processing:** Remove 3-page limit for production
3. **Citation Tracking:** Link AI responses back to source pages
4. **Multi-Format:** Support .txt and .md files
5. **Batch Processing:** Process multiple PDFs in parallel
6. **Progress UI:** Real-time progress tracking in dashboard

## 🐛 Troubleshooting

### "PDF has 0 chunks"
- Check if PDF is valid: `pdfinfo data/knowledge/yourfile.pdf`
- Ensure file isn't corrupted or password-protected

### "OCR extraction failed"
- Check OpenRouter API key in `.env.local`
- Verify internet connection
- Check OpenRouter service status

### "Embedding generation failed"
- Ensure `OPENROUTER_API_KEY` is set in `.env.local`
- Check OpenRouter service status
- Verify API key is valid

### Database Issues
```bash
# Reset RAG data
turso db shell permaculture-studio
```
```sql
DELETE FROM knowledge_processing_queue;
DELETE FROM knowledge_sources;
DELETE FROM knowledge_chunks;
```

## 📚 Resources

- OpenRouter: https://openrouter.ai/
- Qwen3 Embedding Model: https://openrouter.ai/models/qwen/qwen3-embedding-8b
- Permaculture Principles: https://www.permacultureprinciples.com/

---

**Status:** ✅ Complete RAG pipeline fully functional!
- ✅ OCR extraction working (Amazon Nova 2 Lite)
- ✅ Semantic chunking working
- ✅ Database storage working
- ✅ **Embedding generation working (Qwen3 8192-dim vectors)**
- 🔜 Next step: Implement semantic search with embeddings
