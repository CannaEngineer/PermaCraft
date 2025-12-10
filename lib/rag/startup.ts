/**
 * RAG System Startup Hook
 *
 * Runs on application startup to ensure knowledge base is synchronized.
 * This file is imported early in the Next.js lifecycle.
 */

import { autoScanAndQueue } from './auto-scanner';
import { processQueue } from './document-processor';

let isInitialized = false;
let initPromise: Promise<void> | null = null;

/**
 * Initialize RAG system
 * - Scans knowledge folder
 * - Queues new documents
 * - Optionally processes queue in background
 * - Returns immediately (non-blocking)
 */
export async function initializeRAG(): Promise<void> {
  if (isInitialized) {
    return;
  }

  if (initPromise) {
    // Already initializing, wait for it
    return initPromise;
  }

  initPromise = (async () => {
    try {
      // Only run in production or when explicitly enabled
      const shouldRun = process.env.NODE_ENV === 'production' || process.env.RAG_AUTO_SCAN === 'true';

      if (!shouldRun) {
        console.log('📚 RAG auto-scan disabled (set RAG_AUTO_SCAN=true to enable in dev)');
        return;
      }

      console.log('📚 Initializing RAG system...');

      // Scan and queue documents
      const scanResult = await autoScanAndQueue();
      console.log(`  ✓ Scanned: ${scanResult.newCount} new, ${scanResult.updatedCount} updated, ${scanResult.skippedCount} unchanged`);

      // Process queue if enabled (background processing)
      const shouldProcess = process.env.RAG_AUTO_PROCESS === 'true';
      if (shouldProcess && (scanResult.newCount > 0 || scanResult.updatedCount > 0)) {
        console.log('📝 Starting background document processing...');

        // Process in background without blocking initialization
        processQueue(10)
          .then(result => {
            console.log(`  ✅ Processing complete: ${result.processed} succeeded, ${result.failed} failed`);
          })
          .catch(error => {
            console.error('  ❌ Background processing error:', error);
          });
      } else if (!shouldProcess) {
        console.log('  ℹ Auto-processing disabled (set RAG_AUTO_PROCESS=true to enable)');
      }

      isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize RAG system:', error);
      // Don't throw - let app start even if RAG fails
    }
  })();

  return initPromise;
}

/**
 * Check if RAG system is ready
 */
export function isRAGReady(): boolean {
  return isInitialized;
}

// Auto-initialize in server context
if (typeof window === 'undefined') {
  // Run async without blocking module load
  setImmediate(() => {
    initializeRAG().catch(console.error);
  });
}
