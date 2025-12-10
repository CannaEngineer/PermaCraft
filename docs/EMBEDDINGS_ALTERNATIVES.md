# Embeddings API Issue & Alternative Solutions

## Current Issue

OpenRouter's embeddings API is returning 401 "No cookie auth credentials found" for all requests, including:
- Chat completions endpoint
- Embeddings endpoint
- All embedding models (OpenAI, Qwen, etc.)

### Evidence
- Tested with documented models: `openai/text-embedding-3-small`, `openai/text-embedding-3-large`
- Tested with Qwen models: `qwen/qwen3-embedding-8b`, `qwen/qwen3-embedding-0.6b`
- All return: `{"error": {"message": "No cookie auth credentials found", "code": 401}}`

### Mystery
- Embeddings WERE generated successfully before (3 chunks exist with Qwen3 embeddings in database)
- OCR has been working (successfully processed PDFs)
- Suggests possible OpenRouter API changes or account issue

### Action Required
**IMPORTANT:** The API key was exposed in test output. Rotate it at: https://openrouter.ai/keys

## Alternative Embedding Solutions

Since OpenRouter embeddings are currently not working, here are proven alternatives:

### Option 1: OpenAI Embeddings (Recommended)

**Pros:**
- Reliable, well-documented API
- Multiple model options (small, large, ada-002)
- Good performance and quality
- Context limit: 8,191 tokens

**Setup:**
```bash
npm install openai
```

```typescript
// lib/ai/openai-embeddings.ts
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small', // 1536 dimensions, $0.02/1M tokens
    input: texts,
  });
  return response.data.map(item => item.embedding);
}
```

**Cost:**
- `text-embedding-3-small`: $0.02 per 1M tokens (1536 dimensions)
- `text-embedding-3-large`: $0.13 per 1M tokens (3072 dimensions)

### Option 2: Voyage AI Embeddings

**Pros:**
- Specialized for RAG use cases
- Excellent retrieval performance
- Competitive pricing
- Context limit: 16,000 tokens

**Setup:**
```bash
npm install voyageai
```

```typescript
// lib/ai/voyage-embeddings.ts
import { VoyageAIClient } from 'voyageai';

const voyage = new VoyageAIClient({
  apiKey: process.env.VOYAGE_API_KEY,
});

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const response = await voyage.embed({
    input: texts,
    model: 'voyage-3-lite', // 512 dimensions, fast
  });
  return response.embeddings;
}
```

**Cost:**
- `voyage-3-lite`: $0.02 per 1M tokens (512 dimensions)
- `voyage-3`: $0.06 per 1M tokens (1024 dimensions)

### Option 3: Cohere Embeddings

**Pros:**
- Multiple specialized models (search, clustering)
- Multilingual support
- Competitive pricing
- Context limit: 512 tokens

**Setup:**
```bash
npm install cohere-ai
```

```typescript
// lib/ai/cohere-embeddings.ts
import { CohereClient } from 'cohere-ai';

const cohere = new CohereClient({
  token: process.env.COHERE_API_KEY,
});

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const response = await cohere.embed({
    texts: texts,
    model: 'embed-english-light-v3.0', // 384 dimensions
    inputType: 'search_document',
  });
  return response.embeddings;
}
```

**Cost:**
- `embed-english-light-v3.0`: $0.01 per 1M tokens (384 dimensions)
- `embed-english-v3.0`: $0.10 per 1M tokens (1024 dimensions)

### Option 4: Local Embeddings with Transformers.js

**Pros:**
- Free (runs locally)
- No API calls, no rate limits
- Works offline
- Privacy: data never leaves your server

**Cons:**
- Slower than API-based solutions
- Requires more compute resources
- Smaller models = lower quality

**Setup:**
```bash
npm install @xenova/transformers
```

```typescript
// lib/ai/local-embeddings.ts
import { pipeline } from '@xenova/transformers';

let embedder: any = null;

async function getEmbedder() {
  if (!embedder) {
    embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  return embedder;
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const model = await getEmbedder();
  const embeddings = await Promise.all(
    texts.map(async (text) => {
      const output = await model(text, { pooling: 'mean', normalize: true });
      return Array.from(output.data);
    })
  );
  return embeddings;
}
```

**Models Available:**
- `Xenova/all-MiniLM-L6-v2`: 384 dimensions, fast, good quality
- `Xenova/bge-small-en-v1.5`: 384 dimensions, optimized for retrieval
- `Xenova/gte-small`: 384 dimensions, general purpose

## Recommended Implementation Strategy

### Short Term (Immediate)
1. **Use OpenAI embeddings** - Most reliable, well-documented, proven
2. Update `lib/rag/embedding-generator.ts` to use OpenAI client
3. Re-process existing chunks to generate new embeddings
4. Test semantic search with OpenAI embeddings

### Medium Term (1-2 weeks)
1. **Add Voyage AI as backup** - Better for RAG specifically
2. Implement provider fallback (OpenAI → Voyage → Local)
3. Compare quality: run test queries, measure relevance
4. Choose best provider based on results

### Long Term (1-2 months)
1. **Implement hybrid search** - Combine embeddings + keywords
2. Add re-ranking with cross-encoder
3. Consider local embeddings for privacy-sensitive deployments
4. Optimize for cost/performance based on usage patterns

## Migration Steps

### 1. Update Environment Variables

Add to `.env.local`:
```env
# Primary embedding provider
OPENAI_API_KEY=sk-...

# Backup providers (optional)
VOYAGE_API_KEY=...
COHERE_API_KEY=...
```

### 2. Update Embedding Generator

Replace `lib/rag/embedding-generator.ts` content:

```typescript
/**
 * Embedding Generator
 * Uses OpenAI for reliable embedding generation
 */

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536; // OpenAI text-embedding-3-small
const BATCH_SIZE = 100;

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  try {
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: texts,
    });
    return response.data.map(item => item.embedding);
  } catch (error) {
    console.error('Error generating embeddings:', error);
    throw new Error(`Failed to generate embeddings: ${error}`);
  }
}

// ... rest of the file stays the same
```

### 3. Re-process Existing Chunks

```bash
# Clear old embeddings
turso db shell permacraft
UPDATE knowledge_chunks SET embedding = NULL;

# Generate new embeddings with OpenAI
npx tsx scripts/test-embeddings.ts
```

### 4. Update Database Schema

OpenAI uses 1536 dimensions (not 8192), so embeddings will be smaller:
- Old: 8192 floats × 4 bytes = 32,768 bytes per embedding
- New: 1536 floats × 4 bytes = 6,144 bytes per embedding
- **Storage savings: 81% smaller!**

No schema changes needed - BLOB column handles any size.

### 5. Test Semantic Search

```bash
npx tsx scripts/test-semantic-search.ts
```

Should now work with OpenAI embeddings!

## Cost Comparison

For 1000 chunks (average 500 tokens each = 500k tokens total):

| Provider | Model | Dimensions | Cost | Quality |
|----------|-------|------------|------|---------|
| OpenAI | text-embedding-3-small | 1536 | $0.01 | Excellent |
| OpenAI | text-embedding-3-large | 3072 | $0.065 | Best |
| Voyage | voyage-3-lite | 512 | $0.01 | Very Good |
| Voyage | voyage-3 | 1024 | $0.03 | Excellent |
| Cohere | embed-english-light-v3.0 | 384 | $0.005 | Good |
| Cohere | embed-english-v3.0 | 1024 | $0.05 | Excellent |
| Local | all-MiniLM-L6-v2 | 384 | $0 | Good |

**Recommendation:** Start with `text-embedding-3-small` - best balance of cost/quality.

## Quality Expectations

### Dimension Count Impact

More dimensions generally = better quality, but diminishing returns:
- **384-512 dims**: Good for most use cases, very fast
- **1024-1536 dims**: Excellent quality, standard choice
- **3072+ dims**: Marginal gains, slower, more expensive

### RAG-Specific Considerations

For permaculture knowledge base:
- **Context understanding**: Need good comprehension of domain terms
- **Query-document matching**: Must handle semantic similarity well
- **Citation accuracy**: Embeddings should cluster related concepts

**Best for RAG:**
1. Voyage AI (specialized for retrieval)
2. OpenAI text-embedding-3-small (proven, reliable)
3. Cohere embed-english-v3.0 (multilingual bonus)

## Troubleshooting

### "API key not set" Error
```bash
# Check if API key is in .env.local
grep OPENAI_API_KEY .env.local

# Add if missing
echo "OPENAI_API_KEY=sk-..." >> .env.local
```

### "Rate limit exceeded" Error
- OpenAI: 3,000 requests/minute, 1,000,000 tokens/minute
- Solution: Add exponential backoff, batch requests

### "Context length exceeded" Error
- OpenAI: 8,191 tokens max
- Solution: Split long texts before embedding, respect context limits

### "Embeddings too large for database" Error
- Unlikely with OpenAI (6KB per embedding)
- If it happens: Use smaller model (voyage-3-lite, 512 dims)

## Next Steps

1. **Choose provider**: Start with OpenAI (proven, reliable)
2. **Get API key**: https://platform.openai.com/api-keys
3. **Update code**: Follow migration steps above
4. **Test thoroughly**: Run semantic search tests
5. **Monitor costs**: Track usage on OpenAI dashboard

## Resources

- [OpenAI Embeddings Guide](https://platform.openai.com/docs/guides/embeddings)
- [Voyage AI Docs](https://docs.voyageai.com/)
- [Cohere Embeddings](https://docs.cohere.com/docs/embeddings)
- [Transformers.js](https://huggingface.co/docs/transformers.js)
- [Choosing Embedding Models](https://huggingface.co/blog/mteb)

---

**Summary:** OpenRouter embeddings currently not working. Switch to OpenAI text-embedding-3-small for immediate solution. Works reliably, costs $0.02/1M tokens, excellent quality for RAG.
