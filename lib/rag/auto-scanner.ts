/**
 * Auto-Scanner for Knowledge Base
 *
 * Automatically scans data/knowledge/ folder for PDFs and processes them.
 * Runs on app startup to keep knowledge base synchronized.
 *
 * Features:
 * - Detects new PDFs in knowledge folder
 * - Checks file hashes to detect updates
 * - Reads optional .meta.json files for metadata
 * - Queues new/updated files for processing
 * - Skips already-processed files
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { db } from '@/lib/db';

const KNOWLEDGE_FOLDER = path.join(process.cwd(), 'data', 'knowledge');
const SUPPORTED_EXTENSIONS = ['.pdf']; // Only PDF supported for now

interface DocumentMetadata {
  title?: string;
  author?: string;
  year?: number;
  isbn?: string;
  topics?: string[];
  priority?: 'high' | 'normal' | 'low';
}

interface ScannedDocument {
  filename: string;
  filepath: string;
  hash: string;
  metadata: DocumentMetadata;
  isNew: boolean;
  isUpdated: boolean;
}

/**
 * Calculate SHA-256 hash of file
 */
function calculateFileHash(filepath: string): string {
  const fileBuffer = fs.readFileSync(filepath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

/**
 * Load optional metadata file
 * Looks for {filename}.meta.json
 */
function loadMetadata(filepath: string): DocumentMetadata {
  const metaPath = filepath.replace(/\.(pdf|txt|md)$/, '.meta.json');

  if (fs.existsSync(metaPath)) {
    try {
      const metaContent = fs.readFileSync(metaPath, 'utf-8');
      return JSON.parse(metaContent);
    } catch (error) {
      console.warn(`Failed to parse metadata file: ${metaPath}`, error);
    }
  }

  // Fallback: extract title from filename
  const basename = path.basename(filepath, path.extname(filepath));
  const title = basename
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());

  return { title };
}

/**
 * Check if document already exists in database
 */
async function getExistingDocument(filename: string): Promise<{
  id: string;
  file_hash: string;
  processing_status: string;
} | null> {
  const result = await db.execute({
    sql: 'SELECT id, file_hash, processing_status FROM knowledge_sources WHERE filename = ?',
    args: [filename],
  });

  return result.rows[0] as any || null;
}

/**
 * Scan knowledge folder for documents
 */
export async function scanKnowledgeFolder(): Promise<{
  scanned: ScannedDocument[];
  newCount: number;
  updatedCount: number;
  skippedCount: number;
}> {
  console.log(`📚 Scanning knowledge folder: ${KNOWLEDGE_FOLDER}`);

  // Check if folder exists
  if (!fs.existsSync(KNOWLEDGE_FOLDER)) {
    // Try to create it (won't work in production/serverless)
    try {
      console.log('  Creating knowledge folder...');
      fs.mkdirSync(KNOWLEDGE_FOLDER, { recursive: true });
    } catch (error) {
      console.log('  ℹ Knowledge folder does not exist and cannot be created (read-only filesystem)');
      console.log('  ℹ RAG system requires local data/knowledge folder - skipping in production');
      return { scanned: [], newCount: 0, updatedCount: 0, skippedCount: 0 };
    }
    return { scanned: [], newCount: 0, updatedCount: 0, skippedCount: 0 };
  }

  const scannedDocs: ScannedDocument[] = [];
  let newCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  // Get all files in folder
  const files = fs.readdirSync(KNOWLEDGE_FOLDER);

  for (const filename of files) {
    const filepath = path.join(KNOWLEDGE_FOLDER, filename);
    const ext = path.extname(filename).toLowerCase();

    // Skip non-document files and metadata files
    if (!SUPPORTED_EXTENSIONS.includes(ext) || filename.endsWith('.meta.json')) {
      continue;
    }

    // Skip if not a file
    const stats = fs.statSync(filepath);
    if (!stats.isFile()) {
      continue;
    }

    console.log(`  Checking: ${filename}`);

    try {
      // Calculate file hash
      const hash = calculateFileHash(filepath);

      // Load metadata
      const metadata = loadMetadata(filepath);

      // Check if document exists in database
      const existing = await getExistingDocument(filename);

      let isNew = false;
      let isUpdated = false;

      if (!existing) {
        // New document
        isNew = true;
        newCount++;
        console.log(`    ✓ New document detected`);
      } else if (existing.file_hash !== hash) {
        // Document was updated
        isUpdated = true;
        updatedCount++;
        console.log(`    ↻ Document updated (hash changed)`);
      } else if (existing.processing_status === 'failed') {
        // Retry failed documents
        isUpdated = true;
        updatedCount++;
        console.log(`    ⚠ Retrying failed document`);
      } else {
        // Already processed and unchanged
        skippedCount++;
        console.log(`    ○ Already processed, skipping`);
        continue;
      }

      scannedDocs.push({
        filename,
        filepath: path.relative(process.cwd(), filepath),
        hash,
        metadata,
        isNew,
        isUpdated,
      });

    } catch (error) {
      console.error(`    ✗ Error scanning ${filename}:`, error);
    }
  }

  console.log(`\\n  Summary: ${newCount} new, ${updatedCount} updated, ${skippedCount} skipped`);

  return {
    scanned: scannedDocs,
    newCount,
    updatedCount,
    skippedCount,
  };
}

/**
 * Queue documents for processing
 */
export async function queueDocumentsForProcessing(docs: ScannedDocument[]): Promise<void> {
  for (const doc of docs) {
    const sourceId = crypto.randomUUID();
    const queueId = crypto.randomUUID();
    const priority = doc.metadata.priority === 'high' ? 80 : doc.metadata.priority === 'low' ? 30 : 50;

    // First, create or update the knowledge_sources record
    await db.execute({
      sql: `
        INSERT INTO knowledge_sources (
          id, filename, file_path, file_hash, title, author,
          publication_year, isbn, topics, priority, processing_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
        ON CONFLICT(filename) DO UPDATE SET
          file_hash = excluded.file_hash,
          title = excluded.title,
          processing_status = 'pending',
          updated_at = unixepoch()
      `,
      args: [
        sourceId,
        doc.filename,
        doc.filepath,
        doc.hash,
        doc.metadata.title || doc.filename,
        doc.metadata.author || null,
        doc.metadata.year || null,
        doc.metadata.isbn || null,
        doc.metadata.topics ? JSON.stringify(doc.metadata.topics) : null,
        doc.metadata.priority || 'normal',
      ],
    });

    // Then queue for processing
    await db.execute({
      sql: `INSERT INTO knowledge_processing_queue (id, filename, file_path, file_hash, priority, status)
            VALUES (?, ?, ?, ?, ?, 'queued')
            ON CONFLICT(id) DO NOTHING`,
      args: [queueId, doc.filename, doc.filepath, doc.hash, priority],
    });

    console.log(`  Queued: ${doc.filename} (priority: ${priority})`);
  }
}

/**
 * Main auto-scan function
 * Call this on app startup or via cron job
 */
export async function autoScanAndQueue(): Promise<{
  newCount: number;
  updatedCount: number;
  skippedCount: number;
}> {
  console.log('\\n🔍 Auto-scanning knowledge base...\\n');

  try {
    const { scanned, newCount, updatedCount, skippedCount } = await scanKnowledgeFolder();

    if (scanned.length === 0) {
      console.log('✓ Knowledge base is up to date\\n');
      return { newCount: 0, updatedCount: 0, skippedCount };
    }

    console.log(`\\n📥 Queueing ${scanned.length} documents for processing...\\n`);
    await queueDocumentsForProcessing(scanned);

    console.log(`\\n✓ Auto-scan complete: ${newCount} new, ${updatedCount} updated\\n`);

    return { newCount, updatedCount, skippedCount };

  } catch (error) {
    console.error('✗ Auto-scan failed:', error);
    throw error;
  }
}
