# Knowledge Base System for Learn Section
**Status:** Deferred
**Priority:** High
**Complexity:** High
**Estimated Effort:** 8-12 days

## Overview
Create a comprehensive knowledge base / learning center with RAG-powered semantic search across permaculture literature, guides, and educational content.

## Business Value
- **Educational Platform**: Transform from design tool to learning platform
- **AI Quality**: RAG system dramatically improves AI recommendations with citations
- **User Retention**: Keeps users engaged with educational content
- **SEO Benefits**: Rich content attracts organic traffic
- **Community Contribution**: Users can contribute guides and knowledge

## Technical Architecture

### Database Schema

```sql
-- Migration: migrations/032_knowledge_base.sql

-- Source documents (books, PDFs, guides)
CREATE TABLE IF NOT EXISTS knowledge_sources (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT,
  publication_year INTEGER,
  isbn TEXT,
  source_type TEXT NOT NULL CHECK(source_type IN ('book', 'pdf', 'article', 'guide', 'video')),
  file_path TEXT,                    -- Path to original file
  cover_image_url TEXT,
  description TEXT,
  total_chunks INTEGER DEFAULT 0,
  processing_status TEXT DEFAULT 'pending' CHECK(processing_status IN ('pending', 'processing', 'completed', 'failed')),
  processing_error TEXT,
  is_public INTEGER DEFAULT 1,       -- Public vs. private content
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Text chunks with embeddings for RAG
CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL,
  chunk_text TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,      -- Order within document
  page_number INTEGER,                -- For citations
  section_title TEXT,                 -- e.g., "Chapter 3: Water Systems"

  -- Categorization
  topic_category TEXT,                -- 'water', 'soil', 'guilds', 'zones', 'patterns'
  subtopic TEXT,                      -- More specific classification
  keywords TEXT,                      -- JSON array of extracted keywords

  -- Vector embedding (for semantic search)
  embedding BLOB NOT NULL,            -- 1536 dimensions (OpenAI) or 384 (local)

  created_at INTEGER NOT NULL DEFAULT (unixepoch()),

  FOREIGN KEY (source_id) REFERENCES knowledge_sources(id) ON DELETE CASCADE
);

-- Pre-built topic taxonomy
CREATE TABLE IF NOT EXISTS knowledge_topics (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,                 -- "Water Management"
  slug TEXT NOT NULL UNIQUE,          -- "water-management"
  parent_id TEXT,                     -- For hierarchical topics
  icon TEXT,                          -- Lucide icon name
  color TEXT,                         -- Tailwind color class
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  FOREIGN KEY (parent_id) REFERENCES knowledge_topics(id)
);

-- User interactions with knowledge base
CREATE TABLE IF NOT EXISTS knowledge_bookmarks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  source_id TEXT,
  chunk_id TEXT,
  bookmark_type TEXT CHECK(bookmark_type IN ('source', 'chunk')),
  notes TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (source_id) REFERENCES knowledge_sources(id) ON DELETE CASCADE,
  FOREIGN KEY (chunk_id) REFERENCES knowledge_chunks(id) ON DELETE CASCADE
);

-- Reading progress tracking
CREATE TABLE IF NOT EXISTS knowledge_progress (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  source_id TEXT NOT NULL,
  last_page INTEGER,
  last_chunk_id TEXT,
  progress_percent REAL DEFAULT 0.0,  -- 0.0 to 100.0
  completed INTEGER DEFAULT 0,
  last_read_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (source_id) REFERENCES knowledge_sources(id) ON DELETE CASCADE,
  UNIQUE(user_id, source_id)
);

-- Indexes for performance
CREATE INDEX idx_knowledge_chunks_source ON knowledge_chunks(source_id, chunk_index);
CREATE INDEX idx_knowledge_chunks_topic ON knowledge_chunks(topic_category, subtopic);
CREATE INDEX idx_knowledge_bookmarks_user ON knowledge_bookmarks(user_id, created_at DESC);
CREATE INDEX idx_knowledge_progress_user ON knowledge_progress(user_id, last_read_at DESC);

-- Vector search index (requires sqlite-vec extension)
-- Alternative: Store embeddings and use cosine similarity in application code
CREATE VIRTUAL TABLE IF NOT EXISTS knowledge_vec_idx USING vec0(
  chunk_id TEXT PRIMARY KEY,
  embedding FLOAT[1536]  -- Adjust dimension based on embedding model
);
```

### TypeScript Types

```typescript
// lib/db/schema.ts

export interface KnowledgeSource {
  id: string;
  title: string;
  author?: string;
  publication_year?: number;
  isbn?: string;
  source_type: 'book' | 'pdf' | 'article' | 'guide' | 'video';
  file_path?: string;
  cover_image_url?: string;
  description?: string;
  total_chunks: number;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  processing_error?: string;
  is_public: 0 | 1;
  created_at: number;
  updated_at: number;
}

export interface KnowledgeChunk {
  id: string;
  source_id: string;
  chunk_text: string;
  chunk_index: number;
  page_number?: number;
  section_title?: string;
  topic_category?: string;
  subtopic?: string;
  keywords?: string; // JSON array
  embedding: Buffer;
  created_at: number;
}

export interface KnowledgeTopic {
  id: string;
  name: string;
  slug: string;
  parent_id?: string;
  icon?: string;
  color?: string;
  description?: string;
  sort_order: number;
}

export interface KnowledgeSearchResult {
  chunk: KnowledgeChunk;
  source: KnowledgeSource;
  similarity: number;  // 0.0 to 1.0
  context?: string;    // Surrounding text for context
}
```

### Document Ingestion Pipeline

```typescript
// lib/rag/document-processor.ts

import { PDFLoader } from 'langchain/document_loaders/fs/pdf';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { generateEmbedding } from './embeddings';
import { db } from '@/lib/db';

export interface ProcessingOptions {
  chunkSize?: number;      // Default: 1000
  chunkOverlap?: number;   // Default: 200
  autoCategor ize?: boolean; // Use AI to categorize chunks
}

export async function processDocument(
  sourceId: string,
  filePath: string,
  options: ProcessingOptions = {}
): Promise<void> {
  const { chunkSize = 1000, chunkOverlap = 200, autoCategorize = false } = options;

  // Update status to processing
  await db.execute({
    sql: 'UPDATE knowledge_sources SET processing_status = ? WHERE id = ?',
    args: ['processing', sourceId]
  });

  try {
    // Load PDF
    const loader = new PDFLoader(filePath, { splitPages: true });
    const pages = await loader.load();

    // Split into chunks
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize,
      chunkOverlap,
      separators: ['\n\n', '\n', '. ', ' ', '']
    });

    let chunkIndex = 0;
    for (const [pageIndex, page] of pages.entries()) {
      const pageChunks = await splitter.splitText(page.pageContent);

      for (const chunkText of pageChunks) {
        // Generate embedding
        const embedding = await generateEmbedding(chunkText);

        // Auto-categorize if enabled
        let category, subtopic;
        if (autoCategorize) {
          ({ category, subtopic } = await categorizeChunk(chunkText));
        }

        // Extract keywords
        const keywords = extractKeywords(chunkText);

        // Save chunk
        const chunkId = crypto.randomUUID();
        await db.execute({
          sql: `INSERT INTO knowledge_chunks
            (id, source_id, chunk_text, chunk_index, page_number, topic_category, subtopic, keywords, embedding)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            chunkId,
            sourceId,
            chunkText,
            chunkIndex,
            pageIndex + 1,
            category || null,
            subtopic || null,
            JSON.stringify(keywords),
            Buffer.from(new Float32Array(embedding).buffer)
          ]
        });

        // Save to vector index
        await db.execute({
          sql: 'INSERT INTO knowledge_vec_idx (chunk_id, embedding) VALUES (?, ?)',
          args: [chunkId, Buffer.from(new Float32Array(embedding).buffer)]
        });

        chunkIndex++;
      }
    }

    // Update source with completion status
    await db.execute({
      sql: 'UPDATE knowledge_sources SET processing_status = ?, total_chunks = ? WHERE id = ?',
      args: ['completed', chunkIndex, sourceId]
    });

  } catch (error) {
    await db.execute({
      sql: 'UPDATE knowledge_sources SET processing_status = ?, processing_error = ? WHERE id = ?',
      args: ['failed', error.message, sourceId]
    });
    throw error;
  }
}

async function categorizeChunk(text: string): Promise<{ category: string; subtopic: string }> {
  // Use OpenRouter to categorize chunk
  // This is optional and can be done asynchronously
  const response = await openrouter.chat.completions.create({
    model: 'meta-llama/llama-3.2-90b-vision-instruct:free',
    messages: [{
      role: 'user',
      content: `Categorize this permaculture text into ONE category and subtopic.

Categories: water, soil, guilds, zones, patterns, ethics, design-process, plants, animals, structures

Text: ${text.substring(0, 500)}

Respond with JSON: {"category": "...", "subtopic": "..."}`
    }]
  });

  return JSON.parse(response.choices[0].message.content);
}

function extractKeywords(text: string): string[] {
  // Simple keyword extraction (can be enhanced with NLP)
  const words = text.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
  const frequency = words.reduce((acc, word) => {
    acc[word] = (acc[word] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(frequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
}
```

### Semantic Search

```typescript
// lib/rag/search.ts

import { generateEmbedding } from './embeddings';
import { db } from '@/lib/db';
import type { KnowledgeSearchResult } from '@/lib/db/schema';

export async function semanticSearch(
  query: string,
  options: {
    limit?: number;
    topicCategory?: string;
    minSimilarity?: number;
  } = {}
): Promise<KnowledgeSearchResult[]> {
  const { limit = 5, topicCategory, minSimilarity = 0.7 } = options;

  // Generate query embedding
  const queryEmbedding = await generateEmbedding(query);

  // Perform vector similarity search
  // This requires sqlite-vec extension or manual cosine similarity
  const results = await db.execute({
    sql: `
      SELECT
        c.*,
        s.*,
        vec_distance_cosine(v.embedding, ?) as similarity
      FROM knowledge_chunks c
      JOIN knowledge_sources s ON c.source_id = s.id
      JOIN knowledge_vec_idx v ON c.id = v.chunk_id
      WHERE s.is_public = 1
        ${topicCategory ? 'AND c.topic_category = ?' : ''}
      ORDER BY similarity ASC
      LIMIT ?
    `,
    args: [
      Buffer.from(new Float32Array(queryEmbedding).buffer),
      ...(topicCategory ? [topicCategory] : []),
      limit
    ]
  });

  // Transform and filter by minimum similarity
  return results.rows
    .filter(row => (1 - row.similarity) >= minSimilarity)
    .map(row => ({
      chunk: {
        id: row.id,
        source_id: row.source_id,
        chunk_text: row.chunk_text,
        chunk_index: row.chunk_index,
        page_number: row.page_number,
        section_title: row.section_title,
        topic_category: row.topic_category,
        subtopic: row.subtopic,
        keywords: row.keywords,
        embedding: row.embedding,
        created_at: row.created_at
      },
      source: {
        id: row.source_id,
        title: row.title,
        author: row.author,
        // ... other source fields
      },
      similarity: 1 - row.similarity  // Convert distance to similarity
    }));
}

// Fallback: Manual cosine similarity (if sqlite-vec not available)
export function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
```

### UI Components

```typescript
// app/(app)/learn/page.tsx

import { KnowledgeBrowser } from '@/components/learn/knowledge-browser';
import { FeaturedGuides } from '@/components/learn/featured-guides';
import { TopicNav } from '@/components/learn/topic-nav';
import { SearchBar } from '@/components/learn/search-bar';

export default async function LearnPage() {
  const topics = await getTopics();
  const featured = await getFeaturedSources();

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Knowledge Base</h1>
        <p className="text-muted-foreground">
          Learn permaculture design from authoritative sources
        </p>
      </header>

      <SearchBar />

      <TopicNav topics={topics} />

      <FeaturedGuides sources={featured} />

      <KnowledgeBrowser />
    </div>
  );
}
```

```typescript
// components/learn/knowledge-browser.tsx

'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, BookOpen, Bookmark } from 'lucide-react';
import { semanticSearch } from '@/lib/rag/search';
import type { KnowledgeSearchResult } from '@/lib/db/schema';

export function KnowledgeBrowser() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<KnowledgeSearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/knowledge/search?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      setResults(data.results);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Interface */}
      <div className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask a question or search for topics..."
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <Button onClick={handleSearch} disabled={loading}>
          <Search className="w-4 h-4 mr-2" />
          Search
        </Button>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Search Results</h2>
          {results.map((result) => (
            <Card key={result.chunk.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {result.source.title}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {result.source.author} • Page {result.chunk.page_number}
                    </p>
                  </div>
                  <Badge variant="outline">
                    {Math.round(result.similarity * 100)}% match
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed">
                  {result.chunk.chunk_text}
                </p>
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" size="sm">
                    <BookOpen className="w-4 h-4 mr-1" />
                    Read More
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Bookmark className="w-4 h-4 mr-1" />
                    Save
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
```

## Integration with AI Assistant

```typescript
// lib/ai/rag-context.ts

import { semanticSearch } from '@/lib/rag/search';

export async function enhancePromptWithRAG(
  userQuery: string,
  farmContext: any
): Promise<string> {
  // Search knowledge base for relevant context
  const relevantKnowledge = await semanticSearch(userQuery, { limit: 3 });

  if (relevantKnowledge.length === 0) {
    return userQuery; // No RAG context available
  }

  // Build enhanced prompt with citations
  const ragContext = relevantKnowledge
    .map((result, index) => `
[Source ${index + 1}: "${result.source.title}" by ${result.source.author}, p.${result.chunk.page_number}]
${result.chunk.chunk_text}
`)
    .join('\n\n');

  return `
AUTHORITATIVE PERMACULTURE KNOWLEDGE:
${ragContext}

FARMER'S QUESTION: ${userQuery}

Provide a response grounded in the sources above. Cite sources using [Source 1], [Source 2] format.
If the sources don't cover the question, acknowledge this and use general permaculture principles.
`;
}
```

## Seeding Initial Content

### Recommended Permaculture Books (Public Domain / Open Access)
1. **"Introduction to Permaculture"** - Bill Mollison & Reny Mia Slay
2. **"Permaculture: A Designers' Manual"** - Bill Mollison (excerpts)
3. **USDA Soil Conservation Service Publications** (public domain)
4. **Open-source permaculture guides** from Permaculture Research Institute

### Content Pipeline
1. Convert PDFs to text using `pdf-parse` or `pdfjs-dist`
2. Process through ingestion pipeline
3. Generate embeddings (batch process overnight)
4. Categorize and tag content
5. Make available in Learn section

## Implementation Phases

### Phase 1: Foundation (3 days)
- Database schema and migrations
- Document ingestion pipeline
- Basic embedding generation
- Seed 1-2 permaculture books

### Phase 2: Search & Browse (3 days)
- Semantic search implementation
- Browse by topic UI
- Source detail pages
- Bookmark system

### Phase 3: RAG Integration (2 days)
- Connect to AI assistant
- Citation formatting
- Context window management
- A/B test RAG vs non-RAG responses

### Phase 4: User Features (2-3 days)
- Reading progress tracking
- Personal notes on sources
- Recommended reading based on farm design
- Community-contributed guides

## Testing Strategy

- **Embedding Quality**: Test with known queries, verify relevant chunks returned
- **Search Accuracy**: Precision/recall metrics on test dataset
- **Performance**: Search latency < 500ms for 10k chunks
- **Scalability**: Test with 100k chunks (multiple books)

## Future Enhancements

- **Multi-lingual Support**: Translate chunks to other languages
- **Video Content**: Extract transcripts and index video tutorials
- **Interactive Diagrams**: Annotated diagrams linked to text
- **Community Contributions**: User-submitted guides and articles
- **Learning Paths**: Curated sequences for beginners → advanced
- **Quiz System**: Test knowledge with interactive quizzes
- **Certifications**: Issue certificates for completed learning paths
