-- RAG (Retrieval-Augmented Generation) Schema for Permaculture.Studio
-- Auto-scanned knowledge base from data/knowledge/ folder

-- Source documents metadata
CREATE TABLE IF NOT EXISTS knowledge_sources (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL UNIQUE,           -- Original filename
  file_path TEXT NOT NULL,                 -- Relative path from project root
  file_hash TEXT NOT NULL,                 -- SHA-256 hash to detect changes
  title TEXT NOT NULL,
  author TEXT,
  publication_year INTEGER,
  isbn TEXT,
  topics TEXT,                             -- JSON array of topics
  priority TEXT DEFAULT 'normal',          -- 'high', 'normal', 'low'
  total_chunks INTEGER DEFAULT 0,
  total_pages INTEGER,
  processing_status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  error_message TEXT,                      -- If processing failed
  last_processed_at INTEGER,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

-- Knowledge chunks (text segments with embeddings)
CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL,                 -- FK to knowledge_sources
  chunk_index INTEGER NOT NULL,            -- Order within document
  page_number INTEGER,                     -- Page in original PDF
  chunk_text TEXT NOT NULL,                -- The actual content
  chunk_hash TEXT NOT NULL,                -- Hash for deduplication
  topic_tags TEXT,                         -- JSON array of detected topics
  embedding_model TEXT DEFAULT 'text-embedding-3-small',
  embedding BLOB,                          -- Vector embedding (1536 dims)
  token_count INTEGER,                     -- Approximate tokens in chunk
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (source_id) REFERENCES knowledge_sources(id) ON DELETE CASCADE
);

-- Indexes for fast retrieval
CREATE INDEX IF NOT EXISTS idx_knowledge_sources_filename ON knowledge_sources(filename);
CREATE INDEX IF NOT EXISTS idx_knowledge_sources_hash ON knowledge_sources(file_hash);
CREATE INDEX IF NOT EXISTS idx_knowledge_sources_status ON knowledge_sources(processing_status);

CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_source ON knowledge_chunks(source_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_page ON knowledge_chunks(page_number);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_hash ON knowledge_chunks(chunk_hash);

-- Processing queue (tracks pending documents)
CREATE TABLE IF NOT EXISTS knowledge_processing_queue (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_hash TEXT NOT NULL,
  priority INTEGER DEFAULT 50,             -- 0-100, higher = process first
  queued_at INTEGER DEFAULT (unixepoch()),
  started_at INTEGER,
  completed_at INTEGER,
  status TEXT DEFAULT 'queued'             -- 'queued', 'processing', 'completed', 'failed'
);

CREATE INDEX IF NOT EXISTS idx_queue_status ON knowledge_processing_queue(status);
CREATE INDEX IF NOT EXISTS idx_queue_priority ON knowledge_processing_queue(priority DESC);

-- AI analysis citations (track which chunks were used)
CREATE TABLE IF NOT EXISTS ai_analysis_citations (
  id TEXT PRIMARY KEY,
  analysis_id TEXT NOT NULL,
  chunk_id TEXT NOT NULL,
  relevance_score REAL,                    -- Similarity score from vector search
  used_in_response INTEGER DEFAULT 0,      -- 1 if actually referenced in response
  citation_context TEXT,                   -- How it was cited
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (analysis_id) REFERENCES ai_analyses(id) ON DELETE CASCADE,
  FOREIGN KEY (chunk_id) REFERENCES knowledge_chunks(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_citations_analysis ON ai_analysis_citations(analysis_id);
CREATE INDEX IF NOT EXISTS idx_citations_chunk ON ai_analysis_citations(chunk_id);
