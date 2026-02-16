# Research Paper & Article System
**Status:** Deferred
**Priority:** Medium
**Complexity:** Medium-High
**Estimated Effort:** 5-7 days

## Overview
Comprehensive research library for peer-reviewed papers, case studies, and scientific articles related to permaculture, agroecology, and regenerative agriculture.

## Business Value
- **Scientific Credibility**: Backs up design recommendations with research
- **Professional Tool**: Appeals to consultants, researchers, academics
- **Educational Resource**: Complements hands-on knowledge base
- **SEO & Backlinks**: Academic citations drive authority and traffic
- **Differentiation**: Few competitors offer integrated research library

## Technical Architecture

### Database Schema

```sql
-- Migration: migrations/033_research_articles.sql

CREATE TABLE IF NOT EXISTS research_articles (
  id TEXT PRIMARY KEY,

  -- Citation metadata
  title TEXT NOT NULL,
  authors TEXT NOT NULL,              -- JSON array of author objects
  publication_year INTEGER,
  publication_month INTEGER,
  journal_name TEXT,
  volume TEXT,
  issue TEXT,
  pages TEXT,                         -- e.g., "123-145"
  doi TEXT UNIQUE,                    -- Digital Object Identifier
  isbn TEXT,
  publisher TEXT,

  -- Content
  abstract TEXT,
  full_text TEXT,                     -- Extracted text from PDF
  pdf_url TEXT,                       -- Link to PDF (R2 or external)
  external_url TEXT,                  -- Publisher URL

  -- Classification
  article_type TEXT CHECK(article_type IN ('peer_reviewed', 'case_study', 'thesis', 'white_paper', 'conference', 'report')),
  primary_topic TEXT,                 -- 'soil', 'water', 'biodiversity', etc.
  tags TEXT,                          -- JSON array
  keywords TEXT,                      -- JSON array (author keywords)

  -- Metrics
  citation_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  bookmark_count INTEGER DEFAULT 0,

  -- Status
  processing_status TEXT DEFAULT 'pending' CHECK(processing_status IN ('pending', 'processing', 'completed', 'failed')),
  is_public INTEGER DEFAULT 1,
  is_open_access INTEGER DEFAULT 0,   -- Open access vs. paywalled

  -- Timestamps
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Research topics taxonomy
CREATE TABLE IF NOT EXISTS research_topics (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,                 -- "Soil Microbiology"
  slug TEXT NOT NULL UNIQUE,          -- "soil-microbiology"
  parent_id TEXT,                     -- Hierarchical
  description TEXT,
  article_count INTEGER DEFAULT 0,
  FOREIGN KEY (parent_id) REFERENCES research_topics(id)
);

-- Article-topic many-to-many
CREATE TABLE IF NOT EXISTS article_topics (
  article_id TEXT NOT NULL,
  topic_id TEXT NOT NULL,
  relevance REAL DEFAULT 1.0,         -- How relevant (0.0-1.0)
  PRIMARY KEY (article_id, topic_id),
  FOREIGN KEY (article_id) REFERENCES research_articles(id) ON DELETE CASCADE,
  FOREIGN KEY (topic_id) REFERENCES research_topics(id) ON DELETE CASCADE
);

-- User interactions
CREATE TABLE IF NOT EXISTS article_bookmarks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  article_id TEXT NOT NULL,
  notes TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (article_id) REFERENCES research_articles(id) ON DELETE CASCADE,
  UNIQUE(user_id, article_id)
);

CREATE TABLE IF NOT EXISTS article_citations (
  id TEXT PRIMARY KEY,
  article_id TEXT NOT NULL,
  cited_by_user_id TEXT,              -- Who added this citation
  citation_context TEXT,               -- Where they cited it (farm design, journal entry)
  farm_id TEXT,
  feature_id TEXT,                    -- Which zone/planting was influenced
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (article_id) REFERENCES research_articles(id) ON DELETE CASCADE,
  FOREIGN KEY (cited_by_user_id) REFERENCES users(id),
  FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_articles_doi ON research_articles(doi);
CREATE INDEX idx_articles_topic ON research_articles(primary_topic);
CREATE INDEX idx_articles_year ON research_articles(publication_year DESC);
CREATE INDEX idx_articles_type ON research_articles(article_type);
CREATE INDEX idx_article_topics_topic ON article_topics(topic_id);
CREATE INDEX idx_article_bookmarks_user ON article_bookmarks(user_id, created_at DESC);
CREATE INDEX idx_article_citations_farm ON article_citations(farm_id);
```

### TypeScript Types

```typescript
// lib/db/schema.ts

export interface ResearchArticle {
  id: string;

  // Citation
  title: string;
  authors: string; // JSON: Array<{ name: string; affiliation?: string; }>
  publication_year?: number;
  publication_month?: number;
  journal_name?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  doi?: string;
  isbn?: string;
  publisher?: string;

  // Content
  abstract?: string;
  full_text?: string;
  pdf_url?: string;
  external_url?: string;

  // Classification
  article_type: 'peer_reviewed' | 'case_study' | 'thesis' | 'white_paper' | 'conference' | 'report';
  primary_topic?: string;
  tags?: string; // JSON array
  keywords?: string; // JSON array

  // Metrics
  citation_count: number;
  view_count: number;
  bookmark_count: number;

  // Status
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  is_public: 0 | 1;
  is_open_access: 0 | 1;

  created_at: number;
  updated_at: number;
}

export interface Author {
  name: string;
  affiliation?: string;
  orcid?: string;
}

export interface CitationFormat {
  apa: string;
  mla: string;
  chicago: string;
  bibtex: string;
}
```

### PDF Processing & Metadata Extraction

```typescript
// lib/research/pdf-processor.ts

import { PDFExtract } from 'pdf.js-extract';
import type { ResearchArticle, Author } from '@/lib/db/schema';

export interface ExtractedMetadata {
  title?: string;
  authors?: Author[];
  abstract?: string;
  keywords?: string[];
  doi?: string;
  publicationYear?: number;
}

export async function extractPDFMetadata(pdfBuffer: Buffer): Promise<ExtractedMetadata> {
  const pdfExtract = new PDFExtract();
  const data = await pdfExtract.extractBuffer(pdfBuffer);

  // Extract text from first few pages for metadata
  const firstPages = data.pages.slice(0, 3).map(p =>
    p.content.map(item => item.str).join(' ')
  ).join('\n');

  // Pattern matching for common metadata
  const metadata: ExtractedMetadata = {};

  // DOI extraction
  const doiMatch = firstPages.match(/(?:doi|DOI):\s*([^\s]+)/);
  if (doiMatch) {
    metadata.doi = doiMatch[1];
  }

  // Title (usually largest font on first page)
  const titleMatch = data.pages[0]?.content
    .filter(item => item.height > 12) // Larger font
    .map(item => item.str)
    .join(' ');
  if (titleMatch) {
    metadata.title = titleMatch.trim();
  }

  // Authors (patterns vary widely, may need AI assistance)
  const authorSection = firstPages.match(/(?:Author|By):\s*([^\n]+)/i);
  if (authorSection) {
    metadata.authors = parseAuthors(authorSection[1]);
  }

  // Abstract
  const abstractMatch = firstPages.match(/Abstract[\s\S]*?(?=\n\n|\n[A-Z])/i);
  if (abstractMatch) {
    metadata.abstract = abstractMatch[0].replace(/^Abstract\s*/i, '').trim();
  }

  // Full text extraction
  const fullText = data.pages.map(p =>
    p.content.map(item => item.str).join(' ')
  ).join('\n\n');

  return {
    ...metadata,
    keywords: extractKeywords(fullText)
  };
}

function parseAuthors(authorString: string): Author[] {
  // Simple comma/and split (can be enhanced)
  const names = authorString.split(/,|\sand\s/);
  return names.map(name => ({
    name: name.trim(),
    affiliation: undefined
  }));
}

function extractKeywords(text: string): string[] {
  // Extract keyword section if exists
  const keywordMatch = text.match(/Keywords?:\s*([^\n]+)/i);
  if (keywordMatch) {
    return keywordMatch[1].split(/[,;]/).map(k => k.trim());
  }
  return [];
}

// Enhanced metadata via CrossRef API (if DOI available)
export async function enrichMetadataFromDOI(doi: string): Promise<Partial<ResearchArticle>> {
  try {
    const response = await fetch(`https://api.crossref.org/works/${doi}`);
    const data = await response.json();

    const work = data.message;

    return {
      title: work.title?.[0],
      authors: JSON.stringify(work.author?.map((a: any) => ({
        name: `${a.given} ${a.family}`,
        affiliation: a.affiliation?.[0]?.name
      })) || []),
      publication_year: work.published?.['date-parts']?.[0]?.[0],
      publication_month: work.published?.['date-parts']?.[0]?.[1],
      journal_name: work['container-title']?.[0],
      volume: work.volume,
      issue: work.issue,
      pages: work.page,
      publisher: work.publisher,
      doi: work.DOI
    };
  } catch (error) {
    console.error('CrossRef API error:', error);
    return {};
  }
}
```

### Citation Formatting

```typescript
// lib/research/citations.ts

import type { ResearchArticle, Author } from '@/lib/db/schema';

export function formatCitation(article: ResearchArticle, style: 'apa' | 'mla' | 'chicago' | 'bibtex'): string {
  const authors = JSON.parse(article.authors) as Author[];

  switch (style) {
    case 'apa':
      return formatAPA(article, authors);
    case 'mla':
      return formatMLA(article, authors);
    case 'chicago':
      return formatChicago(article, authors);
    case 'bibtex':
      return formatBibTeX(article, authors);
    default:
      return formatAPA(article, authors);
  }
}

function formatAPA(article: ResearchArticle, authors: Author[]): string {
  const authorString = authors.length === 0 ? 'Unknown' :
    authors.length === 1 ? authors[0].name :
    authors.length === 2 ? `${authors[0].name} & ${authors[1].name}` :
    `${authors[0].name} et al.`;

  const year = article.publication_year || 'n.d.';
  const title = article.title;
  const journal = article.journal_name ? `${article.journal_name}, ` : '';
  const volume = article.volume ? `${article.volume}` : '';
  const issue = article.issue ? `(${article.issue})` : '';
  const pages = article.pages ? `, ${article.pages}` : '';
  const doi = article.doi ? ` https://doi.org/${article.doi}` : '';

  return `${authorString} (${year}). ${title}. ${journal}${volume}${issue}${pages}.${doi}`;
}

function formatMLA(article: ResearchArticle, authors: Author[]): string {
  const authorString = authors.length === 0 ? 'Unknown' :
    authors.length === 1 ? authors[0].name :
    `${authors[0].name}, et al.`;

  const title = `"${article.title}."`;
  const journal = article.journal_name ? ` ${article.journal_name}` : '';
  const volume = article.volume ? `, vol. ${article.volume}` : '';
  const issue = article.issue ? `, no. ${article.issue}` : '';
  const year = article.publication_year ? `, ${article.publication_year}` : '';
  const pages = article.pages ? `, pp. ${article.pages}` : '';

  return `${authorString}. ${title}${journal}${volume}${issue}${year}${pages}.`;
}

function formatChicago(article: ResearchArticle, authors: Author[]): string {
  const authorString = authors.length === 0 ? 'Unknown' :
    authors.length === 1 ? authors[0].name :
    authors.length === 2 ? `${authors[0].name} and ${authors[1].name}` :
    `${authors[0].name} et al.`;

  const year = article.publication_year || 'n.d.';
  const title = `"${article.title}."`;
  const journal = article.journal_name || '';
  const volume = article.volume || '';
  const issue = article.issue ? `, no. ${article.issue}` : '';
  const pages = article.pages ? `: ${article.pages}` : '';

  return `${authorString}. ${year}. ${title} ${journal} ${volume}${issue}${pages}.`;
}

function formatBibTeX(article: ResearchArticle, authors: Author[]): string {
  const authorString = authors.map(a => a.name).join(' and ');
  const year = article.publication_year || '';
  const key = authors[0]?.name.split(' ').pop()?.toLowerCase() + year;

  return `@article{${key},
  author = {${authorString}},
  title = {${article.title}},
  journal = {${article.journal_name || ''}},
  volume = {${article.volume || ''}},
  number = {${article.issue || ''}},
  pages = {${article.pages || ''}},
  year = {${year}},
  doi = {${article.doi || ''}}
}`;
}
```

### UI Components

```typescript
// app/(app)/research/page.tsx

import { ResearchBrowser } from '@/components/research/research-browser';
import { TopicFilter } from '@/components/research/topic-filter';
import { SortControls } from '@/components/research/sort-controls';
import { db } from '@/lib/db';

export default async function ResearchPage() {
  const topics = await db.execute({
    sql: 'SELECT * FROM research_topics WHERE parent_id IS NULL ORDER BY name'
  });

  const featured = await db.execute({
    sql: `SELECT * FROM research_articles
          WHERE is_public = 1
          ORDER BY citation_count DESC, view_count DESC
          LIMIT 6`
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Research Library</h1>
        <p className="text-muted-foreground">
          Peer-reviewed research on permaculture, agroecology, and regenerative agriculture
        </p>
      </header>

      <div className="flex gap-6">
        <aside className="w-64 shrink-0">
          <TopicFilter topics={topics.rows} />
        </aside>

        <main className="flex-1">
          <SortControls />
          <ResearchBrowser initialArticles={featured.rows} />
        </main>
      </div>
    </div>
  );
}
```

```typescript
// components/research/article-card.tsx

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Bookmark, Share2, ExternalLink } from 'lucide-react';
import type { ResearchArticle } from '@/lib/db/schema';

export function ArticleCard({ article }: { article: ResearchArticle }) {
  const authors = JSON.parse(article.authors);
  const authorString = authors.length > 3
    ? `${authors[0].name} et al.`
    : authors.map((a: any) => a.name).join(', ');

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="text-lg mb-2 hover:text-primary cursor-pointer">
              {article.title}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {authorString}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {article.journal_name} • {article.publication_year}
              {article.volume && ` • Vol. ${article.volume}`}
              {article.issue && `(${article.issue})`}
            </p>
          </div>

          <Badge variant={article.is_open_access ? 'default' : 'secondary'}>
            {article.is_open_access ? 'Open Access' : 'Paywalled'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        {article.abstract && (
          <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
            {article.abstract}
          </p>
        )}

        <div className="flex flex-wrap gap-2 mb-4">
          {JSON.parse(article.keywords || '[]').slice(0, 4).map((keyword: string) => (
            <Badge key={keyword} variant="outline" className="text-xs">
              {keyword}
            </Badge>
          ))}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href={`/research/${article.id}`}>
              <FileText className="w-4 h-4 mr-1" />
              Read
            </a>
          </Button>

          {article.pdf_url && (
            <Button variant="outline" size="sm" asChild>
              <a href={article.pdf_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-1" />
                PDF
              </a>
            </Button>
          )}

          <Button variant="ghost" size="sm">
            <Bookmark className="w-4 h-4 mr-1" />
            Save
          </Button>

          <Button variant="ghost" size="sm">
            <Share2 className="w-4 h-4 mr-1" />
            Cite
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

## API Integration

```typescript
// app/api/research/articles/route.ts

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const topic = searchParams.get('topic');
  const type = searchParams.get('type');
  const year = searchParams.get('year');
  const sort = searchParams.get('sort') || 'relevance';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');

  let sql = 'SELECT * FROM research_articles WHERE is_public = 1';
  const args: any[] = [];

  if (topic) {
    sql += ' AND primary_topic = ?';
    args.push(topic);
  }

  if (type) {
    sql += ' AND article_type = ?';
    args.push(type);
  }

  if (year) {
    sql += ' AND publication_year = ?';
    args.push(parseInt(year));
  }

  // Sorting
  switch (sort) {
    case 'recent':
      sql += ' ORDER BY publication_year DESC, publication_month DESC';
      break;
    case 'citations':
      sql += ' ORDER BY citation_count DESC';
      break;
    case 'popular':
      sql += ' ORDER BY view_count DESC';
      break;
    default:
      sql += ' ORDER BY created_at DESC';
  }

  sql += ' LIMIT ? OFFSET ?';
  args.push(limit, (page - 1) * limit);

  const result = await db.execute({ sql, args });

  return Response.json({
    articles: result.rows,
    page,
    limit,
    total: result.rows.length
  });
}
```

## Implementation Phases

### Phase 1: Core System (2-3 days)
- Database schema
- PDF upload and metadata extraction
- Basic browse/search interface
- Citation formatting

### Phase 2: Content Management (2 days)
- Admin interface for adding articles
- DOI lookup and auto-fill
- Topic tagging system
- Bulk import from bibliography file

### Phase 3: User Features (2 days)
- Bookmark/reading list
- Citation manager (export to BibTeX, EndNote)
- Article recommendations based on farm design
- Integration with AI assistant (cite research in recommendations)

## Content Strategy

### Initial Seed Content
- Open-access permaculture research from journals
- USDA reports and case studies
- University extension publications
- Non-profit research (Rodale Institute, etc.)

### Ongoing Content Addition
- User submissions (with moderation)
- Automated scraping of open-access repositories
- Partnerships with permaculture research institutes
- Community-contributed case studies

## Future Enhancements
- **Peer Review System**: Community can review/rate articles
- **Discussion Threads**: Comment on articles
- **Related Articles**: AI-powered recommendations
- **Integration with Farms**: "Articles used in this design"
- **Export to Reference Managers**: Zotero, Mendeley integration
