# Permaculture Knowledge Base

This folder contains PDF documents that will be automatically processed and added to the AI's knowledge base.

## How It Works

1. **Add PDFs**: Drop permaculture books or documents here
2. **Auto-Scan**: On app startup, new/updated PDFs are detected via file hash
3. **Auto-Queue**: Detected documents are added to processing queue
4. **Auto-Process**: Documents are OCR'd and chunked (if `RAG_AUTO_PROCESS=true`)
5. **Embeddings**: Generate 8192-dim vectors using Qwen3 (run `npx tsx scripts/test-embeddings.ts`)

## Environment Variables

Add these to your `.env.local` file:

```env
# Enable auto-scanning on startup (dev mode)
RAG_AUTO_SCAN=true

# Enable automatic document processing (optional)
RAG_AUTO_PROCESS=true
```

**Note**: In production, `RAG_AUTO_SCAN` is always enabled.

## Folder Structure

```
data/knowledge/
├── permaculture-designers-manual.pdf
├── permaculture-designers-manual.meta.json  (optional)
├── gaias-garden.pdf
└── gaias-garden.meta.json  (optional)
```

## Optional Metadata Files

Create a `.meta.json` file with the same name as your PDF to provide additional context:

**Example: `permaculture-designers-manual.meta.json`**
```json
{
  "title": "Permaculture: A Designer's Manual",
  "author": "Bill Mollison",
  "year": 1988,
  "isbn": "978-0908228010",
  "topics": ["design", "water", "soil", "guilds", "zones"],
  "priority": "high"
}
```

If no metadata file exists, the system will extract information from the PDF filename and content.

## Supported Formats

- **PDF (`.pdf`)** - Currently supported via pdf-parse
- Text (`.txt`) - Future enhancement
- Markdown (`.md`) - Future enhancement

## Processing Status

Check the database for processing status:
```sql
SELECT title, processing_status, total_chunks, created_at
FROM knowledge_sources
ORDER BY created_at DESC;
```

## Tips

- **File naming**: Use descriptive names (e.g., `bill-mollison-designers-manual.pdf`)
- **Keep originals**: Files are read-only, never modified
- **Large files**: PDFs over 50MB may take 5-10 minutes to process
- **Updates**: If you replace a PDF, delete the old record from the database first

## Recommended Books to Add

1. **Permaculture: A Designer's Manual** - Bill Mollison
2. **Gaia's Garden** - Toby Hemenway
3. **Edible Forest Gardens Vol 1** - Dave Jacke
4. **Edible Forest Gardens Vol 2** - Dave Jacke
5. **The Resilient Farm and Homestead** - Ben Falk
6. **Water for Every Farm** - P.A. Yeomans
7. **Introduction to Permaculture** - Bill Mollison
8. **The Permaculture Handbook** - Peter Bane

---

**Note**: Make sure you own or have permission to use these documents. This system is for personal/educational use only.
