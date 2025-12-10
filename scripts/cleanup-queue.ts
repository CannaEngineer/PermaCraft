/**
 * Cleanup Script for Stuck Queue Entries
 *
 * Fixes queue entries that are stuck in 'processing' state by syncing with
 * the actual knowledge_sources processing status
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function cleanupQueue() {
  const { db } = await import('../lib/db/index.js');

  console.log('🧹 Cleaning up stuck queue entries...\n');

  // Find all 'processing' queue entries
  const processingItems = await db.execute({
    sql: `
      SELECT
        q.id as queue_id,
        q.filename,
        q.status as queue_status,
        s.processing_status as source_status,
        q.started_at,
        (unixepoch() - q.started_at) as seconds_elapsed
      FROM knowledge_processing_queue q
      JOIN knowledge_sources s ON s.filename = q.filename
      WHERE q.status = 'processing'
    `,
    args: [],
  });

  console.log(`Found ${processingItems.rows.length} items in 'processing' state\n`);

  let fixed = 0;
  let unchanged = 0;

  for (const row of processingItems.rows) {
    const queueId = row.queue_id as string;
    const filename = row.filename as string;
    const queueStatus = row.queue_status as string;
    const sourceStatus = row.source_status as string | null;
    const secondsElapsed = row.seconds_elapsed as number;

    console.log(`\n📄 ${filename}`);
    console.log(`  Queue: ${queueStatus}, Source: ${sourceStatus || 'null'}`);
    console.log(`  Running for: ${Math.floor(secondsElapsed / 60)} minutes`);

    // Determine correct status
    let newStatus: 'completed' | 'failed' | 'processing' = 'processing';
    let reason = '';

    if (sourceStatus === 'completed') {
      newStatus = 'completed';
      reason = 'Source is completed';
    } else if (sourceStatus === 'failed') {
      newStatus = 'failed';
      reason = 'Source failed';
    } else if (sourceStatus === 'pending' && secondsElapsed > 7200) {
      // Stuck for >2 hours and still pending - likely crashed
      newStatus = 'failed';
      reason = 'Stuck for >2 hours';
    } else if (!sourceStatus && secondsElapsed > 3600) {
      // No source status and stuck for >1 hour
      newStatus = 'failed';
      reason = 'No source status, stuck >1 hour';
    } else {
      unchanged++;
      console.log(`  ✓ Status OK (actively processing or pending resume)`);
      continue;
    }

    // Update queue status
    await db.execute({
      sql: `
        UPDATE knowledge_processing_queue
        SET status = ?, completed_at = CASE WHEN ? IN ('completed', 'failed') THEN unixepoch() ELSE NULL END
        WHERE id = ?
      `,
      args: [newStatus, newStatus, queueId],
    });

    fixed++;
    console.log(`  ✅ Fixed: ${queueStatus} → ${newStatus} (${reason})`);
  }

  console.log(`\n✅ Cleanup complete:`);
  console.log(`  Fixed: ${fixed}`);
  console.log(`  Unchanged: ${unchanged}`);
  console.log(`  Total: ${processingItems.rows.length}`);

  // Show final queue stats
  const stats = await db.execute({
    sql: 'SELECT status, COUNT(*) as count FROM knowledge_processing_queue GROUP BY status',
    args: [],
  });

  console.log(`\n📊 Final Queue Status:`);
  for (const stat of stats.rows) {
    console.log(`  ${stat.status}: ${stat.count}`);
  }
}

cleanupQueue().catch(console.error);
