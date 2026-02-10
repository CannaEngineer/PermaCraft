# RAG System Implementation Plan for Permaculture.Studio
**Date:** 2025-12-08
**Status:** Planning

## Executive Summary

This plan outlines the implementation of a Retrieval-Augmented Generation (RAG) system for Permaculture.Studio's AI assistant. The RAG system will ground AI recommendations in authoritative permaculture literature, reducing hallucinations and providing educational, citation-backed responses.

## Current Architecture Analysis

### Existing AI Flow
1. User submits query with map screenshots
2. System builds context from:
   - Farm metadata (acres, climate, soil)
   - Zone data with grid coordinates
   - Farmer goals
   - Native species context
   - Existing plantings
3. OpenRouter vision model analyzes screenshots + context
4. Response stored in conversation history

### Key Integration Points
- **`/app/api/ai/analyze/route.ts`** - Main AI endpoint
- **`/lib/ai/prompts.ts`** - System and analysis prompts
- **`/lib/ai/context-manager.ts`** - Conversation history management
- **`/lib/ai/goals-context.ts`** - Farmer goals formatting

## RAG System Architecture

### Phase 1: Foundation (Week 1-2)

#### 1.1 Document Storage & Vector Database

**Technology Choice: SQLite with sqlite-vec Extension**
- **Why**: Already using Turso (libSQL/SQLite), minimal new dependencies
- **Pros**:
  - No additional infrastructure
  - Works with existing database
  - Simple deployment (just an extension)
  - Fast for small-to-medium document corpora
- **Cons**: Limited to ~100k documents (sufficient for permaculture books)

**Alternative: ChromaDB**
- **Why**: Purpose-built vector database
- **Pros**: Better for large-scale, built-in distance metrics
- **Cons**: Additional service to deploy

**Recommendation**: Start with sqlite-vec, migrate to ChromaDB if scaling beyond 100k chunks

#### 1.2 Document Schema

```sql
-- Permaculture knowledge base table
CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id TEXT PRIMARY KEY,
  source_document TEXT NOT NULL,     -- Book title or document name
  source_page INTEGER,                -- Page number for citation
  chunk_text TEXT NOT NULL,          -- The actual content chunk
  chunk_index INTEGER NOT NULL,       -- Order within document
  topic_category TEXT,                -- e.g., 'water-management', 'soil', 'guilds'
  embedding BLOB NOT NULL,           -- Vector embedding (1536 dimensions for OpenAI)
  created_at INTEGER DEFAULT (unixepoch())
);

-- Indexes for fast retrieval
CREATE INDEX idx_knowledge_source ON knowledge_chunks(source_document);
CREATE INDEX idx_knowledge_topic ON knowledge_chunks(topic_category);
CREATE INDEX idx_knowledge_created ON knowledge_chunks(created_at);

-- Vector search index (requires sqlite-vec extension)
CREATE VIRTUAL TABLE knowledge_vec_idx USING vec0(
  chunk_id TEXT PRIMARY KEY,
  embedding FLOAT[1536]  -- Dimension matches embedding model
);

-- Source documents metadata
CREATE TABLE IF NOT EXISTS knowledge_sources (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT,
  publication_year INTEGER,
  isbn TEXT,
  file_path TEXT,                    -- Path to original PDF
  total_chunks INTEGER,
  processing_status TEXT,            -- 'pending', 'processing', 'completed', 'failed'
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);
```

#### 1.3 Embedding Strategy

**Model Choice: OpenAI text-embedding-3-small**
- Cost: $0.02 per 1M tokens (~$0.000002 per chunk)
- Dimensions: 1536
- Performance: Excellent for semantic search
- Alternative: Voyage AI (better for RAG), Cohere (cheaper)

**Free Alternative: all-MiniLM-L6-v2** (via Transformers.js)
- Runs locally in Node.js
- 384 dimensions (smaller, faster)
- Good quality for most use cases
- Zero cost

**Recommendation**: Start with OpenAI for quality, provide local fallback

### Phase 2: Document Ingestion Pipeline (Week 2-3)

#### 2.1 PDF Processing

```typescript
// lib/rag/document-processor.ts

import { PDFLoader } from 'langchain/document_loaders/fs/pdf';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';

interface ProcessedChunk {
  text: string;
  metadata: {
    source: string;
    page: number;
    chunkIndex: number;
  };
}

async function processPermaculturePDF(
  filePath: string,
  documentId: string
): Promise<ProcessedChunk[]> {
  // Load PDF
  const loader = new PDFLoader(filePath, {
    splitPages: true,
  });
  const docs = await loader.load();

  // Split into semantic chunks
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,          // ~250 tokens
    chunkOverlap: 200,        // Preserve context across chunks
    separators: ['\\n\\n', '\\n', '. ', ' ', ''],
  });

  const chunks: ProcessedChunk[] = [];
  for (const [pageIndex, doc] of docs.entries()) {
    const pageChunks = await splitter.splitText(doc.pageContent);

    pageChunks.forEach((chunk, index) => {
      chunks.push({
        text: chunk,
        metadata: {
          source: documentId,
          page: pageIndex + 1,
          chunkIndex: index,
        },
      });
    });
  }

  return chunks;
}
```

#### 2.2 Embedding Generation

```typescript
// lib/rag/embeddings.ts

import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });

  return response.data[0].embedding;
}

export async function batchGenerateEmbeddings(
  texts: string[],
  batchSize = 100
): Promise<number[][]> {
  const embeddings: number[][] = [];

  // Process in batches to avoid rate limits
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: batch,
    });

    embeddings.push(...response.data.map(d => d.embedding));

    // Rate limiting
    if (i + batchSize < texts.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return embeddings;
}
```

#### 2.3 Ingestion Script

```typescript
// scripts/ingest-permaculture-docs.ts

import { db } from '@/lib/db';
import { processPermaculturePDF } from '@/lib/rag/document-processor';
import { batchGenerateEmbeddings } from '@/lib/rag/embeddings';

async function ingestDocument(
  filePath: string,
  metadata: {
    title: string;
    author: string;
    year: number;
  }
) {
  const docId = crypto.randomUUID();

  console.log(`Ingesting: ${metadata.title}...`);

  // 1. Create source record
  await db.execute({
    sql: `INSERT INTO knowledge_sources (id, title, author, publication_year, file_path, processing_status)
          VALUES (?, ?, ?, ?, ?, 'processing')`,
    args: [docId, metadata.title, metadata.author, metadata.year, filePath],
  });

  // 2. Process PDF into chunks
  const chunks = await processPermaculturePDF(filePath, docId);
  console.log(`  Extracted ${chunks.length} chunks`);

  // 3. Generate embeddings
  const texts = chunks.map(c => c.text);
  const embeddings = await batchGenerateEmbeddings(texts);
  console.log(`  Generated ${embeddings.length} embeddings`);

  // 4. Store chunks and embeddings
  for (let i = 0; i < chunks.length; i++) {
    const chunkId = crypto.randomUUID();
    const chunk = chunks[i];
    const embedding = embeddings[i];

    // Store chunk
    await db.execute({
      sql: `INSERT INTO knowledge_chunks (id, source_document, source_page, chunk_text, chunk_index, embedding)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [
        chunkId,
        docId,
        chunk.metadata.page,
        chunk.text,
        chunk.metadata.chunkIndex,
        Buffer.from(new Float32Array(embedding).buffer),
      ],
    });

    // Store in vector index
    await db.execute({
      sql: `INSERT INTO knowledge_vec_idx (chunk_id, embedding) VALUES (?, ?)`,
      args: [chunkId, Buffer.from(new Float32Array(embedding).buffer)],
    });
  }

  // 5. Mark as completed
  await db.execute({
    sql: `UPDATE knowledge_sources SET processing_status = 'completed', total_chunks = ?, updated_at = unixepoch() WHERE id = ?`,
    args: [chunks.length, docId],
  });

  console.log(`✓ Completed: ${metadata.title}\\n`);
}

// Example usage
async function main() {
  await ingestDocument('./data/permaculture-designers-manual.pdf', {
    title: "Permaculture: A Designer's Manual",
    author: 'Bill Mollison',
    year: 1988,
  });

  await ingestDocument('./data/gaias-garden.pdf', {
    title: "Gaia's Garden",
    author: 'Toby Hemenway',
    year: 2009,
  });
}

main();
```

### Phase 3: Retrieval System (Week 3-4)

#### 3.1 Semantic Search

```typescript
// lib/rag/retrieval.ts

import { db } from '@/lib/db';
import { generateEmbedding } from './embeddings';

interface RetrievedChunk {
  id: string;
  text: string;
  source: string;
  page: number;
  similarity: number;
}

export async function retrieveRelevantChunks(
  query: string,
  topK = 5
): Promise<RetrievedChunk[]> {
  // 1. Generate query embedding
  const queryEmbedding = await generateEmbedding(query);

  // 2. Vector similarity search
  // Using cosine similarity with sqlite-vec
  const results = await db.execute({
    sql: `
      SELECT
        kc.id,
        kc.chunk_text,
        ks.title as source,
        kc.source_page as page,
        vec_distance_cosine(kv.embedding, ?) as similarity
      FROM knowledge_vec_idx kv
      JOIN knowledge_chunks kc ON kv.chunk_id = kc.id
      JOIN knowledge_sources ks ON kc.source_document = ks.id
      ORDER BY similarity ASC
      LIMIT ?
    `,
    args: [Buffer.from(new Float32Array(queryEmbedding).buffer), topK],
  });

  return results.rows.map((row: any) => ({
    id: row.id,
    text: row.chunk_text,
    source: row.source,
    page: row.page,
    similarity: 1 - row.similarity, // Convert distance to similarity
  }));
}

// Topic-specific retrieval
export async function retrieveByTopic(
  topic: string,
  topK = 5
): Promise<RetrievedChunk[]> {
  // For predefined topics, can filter by category
  const results = await db.execute({
    sql: `
      SELECT id, chunk_text, source_document, source_page
      FROM knowledge_chunks
      WHERE topic_category = ?
      ORDER BY chunk_index
      LIMIT ?
    `,
    args: [topic, topK],
  });

  return results.rows.map((row: any) => ({
    id: row.id,
    text: row.chunk_text,
    source: row.source_document,
    page: row.source_page,
    similarity: 1.0,
  }));
}
```

#### 3.2 Context Formatting

```typescript
// lib/rag/context-formatter.ts

interface RetrievedChunk {
  text: string;
  source: string;
  page: number;
}

export function formatRetrievedContext(
  chunks: RetrievedChunk[]
): string {
  if (chunks.length === 0) return '';

  const contextParts = chunks.map((chunk, i) => {
    return `**Reference ${i + 1}** (${chunk.source}, p.${chunk.page}):\\n${chunk.text}`;
  });

  return `
**PERMACULTURE KNOWLEDGE BASE**

The following excerpts from authoritative permaculture texts are relevant to this query:

${contextParts.join('\\n\\n---\\n\\n')}

**END KNOWLEDGE BASE**

Use this knowledge to inform your recommendations. When referencing these sources, cite them naturally in your response (e.g., "As Mollison describes in the Designer's Manual...").

IMPORTANT: Combine this theoretical knowledge with your visual analysis of the farm screenshots. Ground recommendations in both the principles above AND the specific terrain/conditions visible in the images.
`.trim();
}
```

### Phase 4: Enhanced AI Integration (Week 4-5)

#### 4.1 Updated Analysis Endpoint

```typescript
// app/api/ai/analyze/route.ts (enhanced)

import { retrieveRelevantChunks } from '@/lib/rag/retrieval';
import { formatRetrievedContext } from '@/lib/rag/context-formatter';

export async function POST(request: NextRequest) {
  // ... existing auth and validation ...

  // NEW: Retrieve relevant permaculture knowledge
  const relevantChunks = await retrieveRelevantChunks(query, 5);
  const knowledgeContext = formatRetrievedContext(relevantChunks);

  // Build enhanced prompt with RAG context
  const analysisPrompt = createAnalysisPrompt({
    farm,
    query,
    zones,
    nativeSpeciesContext,
    plantingsContext,
    goalsContext,
    knowledgeContext, // NEW: RAG context
    legendContext,
    mapLayer,
  });

  // ... rest of existing flow ...
}
```

#### 4.2 Enhanced Prompt Builder

```typescript
// lib/ai/prompts.ts (enhanced)

export function createAnalysisPrompt(context: {
  farm: Farm;
  query: string;
  zones?: any[];
  nativeSpeciesContext?: string;
  plantingsContext?: string;
  goalsContext?: string;
  knowledgeContext?: string; // NEW
  legendContext?: string;
  mapLayer?: string;
}): string {
  const parts: string[] = [];

  // Farm context (existing)
  parts.push(`**FARM DETAILS:**`);
  parts.push(`- Property: ${context.farm.name}`);
  // ... existing farm details ...

  // NEW: Permaculture knowledge context
  if (context.knowledgeContext) {
    parts.push('\\n' + context.knowledgeContext + '\\n');
  }

  // Goals context (existing)
  if (context.goalsContext) {
    parts.push('\\n' + context.goalsContext + '\\n');
  }

  // ... rest of existing context ...

  parts.push(`\\n**USER QUESTION:**\\n${context.query}`);

  return parts.join('\\n');
}
```

### Phase 5: Citation & Source Tracking (Week 5-6)

#### 5.1 Citation Extraction

```typescript
// lib/rag/citations.ts

interface Citation {
  source: string;
  page: number;
  text: string;
}

export function extractCitations(
  aiResponse: string,
  retrievedChunks: RetrievedChunk[]
): Citation[] {
  const citations: Citation[] = [];

  // Look for citation patterns in AI response
  const patterns = [
    /according to ([^,]+)/gi,
    /as ([^,]+) describes/gi,
    /([^,]+) recommends/gi,
  ];

  for (const pattern of patterns) {
    const matches = aiResponse.matchAll(pattern);
    for (const match of matches) {
      const authorOrSource = match[1];

      // Find matching chunk
      const chunk = retrievedChunks.find(c =>
        c.source.toLowerCase().includes(authorOrSource.toLowerCase())
      );

      if (chunk) {
        citations.push({
          source: chunk.source,
          page: chunk.page,
          text: chunk.text.substring(0, 200),
        });
      }
    }
  }

  return citations;
}
```

#### 5.2 Store Citations with Analysis

```sql
-- Add citations table
CREATE TABLE IF NOT EXISTS ai_analysis_citations (
  id TEXT PRIMARY KEY,
  analysis_id TEXT NOT NULL,
  knowledge_chunk_id TEXT NOT NULL,
  citation_context TEXT,            -- Excerpt from AI response using this source
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (analysis_id) REFERENCES ai_analyses(id) ON DELETE CASCADE,
  FOREIGN KEY (knowledge_chunk_id) REFERENCES knowledge_chunks(id)
);
```

## Implementation Phases Summary

### Phase 1: Foundation (Week 1-2)
- [ ] Set up sqlite-vec extension in Turso
- [ ] Create knowledge_chunks and knowledge_sources tables
- [ ] Implement embedding generation (OpenAI API)

### Phase 2: Document Ingestion (Week 2-3)
- [ ] Build PDF processing pipeline
- [ ] Create chunking strategy
- [ ] Write ingestion script
- [ ] Ingest first 3-5 key permaculture books

### Phase 3: Retrieval System (Week 3-4)
- [ ] Implement semantic search
- [ ] Create context formatter
- [ ] Test retrieval quality

### Phase 4: AI Integration (Week 4-5)
- [ ] Enhance analysis endpoint with RAG
- [ ] Update prompt builder
- [ ] Test combined visual + knowledge responses

### Phase 5: Citations & Polish (Week 5-6)
- [ ] Implement citation extraction
- [ ] Store source references
- [ ] Add citation display in UI
- [ ] Performance optimization

## Key Permaculture Books to Ingest

1. **Permaculture: A Designer's Manual** - Bill Mollison (The definitive reference)
2. **Gaia's Garden** - Toby Hemenway (Accessible, practical)
3. **Edible Forest Gardens** (Vol 1 & 2) - Dave Jacke & Eric Toensmeier
4. **The Resilient Farm and Homestead** - Ben Falk
5. **Water for Every Farm** - P.A. Yeomans

## Expected Improvements

### Accuracy
- **Before**: AI relies on training data (may be outdated or generic)
- **After**: AI grounds responses in authoritative, specific permaculture knowledge

### Education
- **Before**: Recommendations without explanation
- **After**: "As Mollison explains on page 43 of the Designer's Manual..."

### Trust
- **Before**: Users question if AI really knows permaculture
- **After**: Verifiable sources build credibility

### Hallucination Reduction
- **Before**: AI may invent techniques or misapply principles
- **After**: RAG constrains responses to documented practices

## Cost Analysis

### One-Time Costs (Document Ingestion)
- 5 books × ~500 pages × ~1000 words/page = ~2.5M words
- ~3.3M tokens for embedding
- Cost: $0.02/1M tokens × 3.3 = **$0.066** (one-time)

### Ongoing Costs (Per Query)
- 5 chunks × ~250 tokens = ~1250 tokens retrieved
- Embedding generation: ~100 tokens
- Total: ~1350 additional tokens per query
- Impact on context window: Minimal (most models handle 32k+)
- Cost: Negligible (embeddings are cheap)

## Performance Considerations

### Latency
- Embedding generation: ~100-200ms
- Vector search: ~50-100ms
- Total RAG overhead: **~150-300ms** per query
- AI inference: 3-10 seconds (unchanged)
- **Impact**: <5% increase in total response time

### Storage
- 5 books × ~5000 chunks × (1KB text + 6KB embedding) = ~35MB
- SQLite handles this easily
- Room to grow to 100+ books without issues

## Alternative Architectures Considered

### 1. LangChain Full Stack
- **Pros**: Battle-tested, many integrations
- **Cons**: Heavy dependency, opinionated
- **Decision**: Use specific LangChain utilities (PDF loading, splitting) but not full framework

### 2. Pinecone Vector DB
- **Pros**: Managed, scalable
- **Cons**: External service, cost, complexity
- **Decision**: Defer until scaling beyond 100k documents

### 3. Local Embeddings (Transformers.js)
- **Pros**: Zero cost, privacy
- **Cons**: Lower quality, larger bundle
- **Decision**: Implement as fallback option

## Success Metrics

### Quantitative
- Reduction in user corrections/follow-ups
- Increase in conversation session length
- Higher user ratings for AI responses

### Qualitative
- Citations appear in >80% of design recommendations
- Users reference sources in community posts
- Reduced "I don't trust the AI" feedback

## Next Steps

1. **Validate Approach**: Run pilot with 1 book to test full pipeline
2. **User Testing**: A/B test RAG-enhanced vs baseline responses
3. **Iterate**: Refine chunk size, topK, and prompt formatting based on results
4. **Scale**: Add more books incrementally based on user queries

## Open Questions

1. **Chunk Size**: 1000 chars optimal or should we test 500/1500?
2. **Hybrid Search**: Combine semantic search with keyword filtering by topic?
3. **Reranking**: Use a reranker model (Cohere) to improve retrieval quality?
4. **Dynamic TopK**: Adjust number of chunks based on query complexity?

---

**Ready to implement?** Start with Phase 1 foundation and we can iterate from there.
