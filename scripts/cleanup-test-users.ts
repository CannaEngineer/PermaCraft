/**
 * Cleanup Test Users Script
 *
 * Removes all data associated with test@test.com and test@example.com
 * including their farms, posts, comments, reactions, and all related data.
 *
 * Usage: npx tsx scripts/cleanup-test-users.ts
 */

import 'dotenv/config';
import { db } from '../lib/db';
import * as readline from 'readline';

const TEST_EMAILS = ['test@test.com', 'test@example.com'];

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function getUserIds(): Promise<{ id: string; email: string }[]> {
  const placeholders = TEST_EMAILS.map(() => '?').join(',');
  const result = await db.execute({
    sql: `SELECT id, email FROM users WHERE email IN (${placeholders})`,
    args: TEST_EMAILS,
  });
  return result.rows as any[];
}

async function getDataCounts(userIds: string[]) {
  if (userIds.length === 0) return null;

  const placeholders = userIds.map(() => '?').join(',');

  const counts: Record<string, number> = {};

  // Count farms
  const farmsResult = await db.execute({
    sql: `SELECT COUNT(*) as count FROM farms WHERE user_id IN (${placeholders})`,
    args: userIds,
  });
  counts.farms = (farmsResult.rows[0] as any).count;

  // Get farm IDs for counting related data
  const farmIdsResult = await db.execute({
    sql: `SELECT id FROM farms WHERE user_id IN (${placeholders})`,
    args: userIds,
  });
  const farmIds = farmIdsResult.rows.map((row: any) => row.id);

  if (farmIds.length > 0) {
    const farmPlaceholders = farmIds.map(() => '?').join(',');

    // Count zones
    const zonesResult = await db.execute({
      sql: `SELECT COUNT(*) as count FROM zones WHERE farm_id IN (${farmPlaceholders})`,
      args: farmIds,
    });
    counts.zones = (zonesResult.rows[0] as any).count;

    // Count plantings
    const plantingsResult = await db.execute({
      sql: `SELECT COUNT(*) as count FROM plantings WHERE farm_id IN (${farmPlaceholders})`,
      args: farmIds,
    });
    counts.plantings = (plantingsResult.rows[0] as any).count;

    // Count AI conversations
    const conversationsResult = await db.execute({
      sql: `SELECT COUNT(*) as count FROM ai_conversations WHERE farm_id IN (${farmPlaceholders})`,
      args: farmIds,
    });
    counts.ai_conversations = (conversationsResult.rows[0] as any).count;

    // Count AI analyses
    const analysesResult = await db.execute({
      sql: `SELECT COUNT(*) as count FROM ai_analyses WHERE farm_id IN (${farmPlaceholders})`,
      args: farmIds,
    });
    counts.ai_analyses = (analysesResult.rows[0] as any).count;

    // Count posts
    const postsResult = await db.execute({
      sql: `SELECT COUNT(*) as count FROM farm_posts WHERE farm_id IN (${farmPlaceholders})`,
      args: farmIds,
    });
    counts.posts = (postsResult.rows[0] as any).count;

    // Count snapshots
    const snapshotsResult = await db.execute({
      sql: `SELECT COUNT(*) as count FROM map_snapshots WHERE farm_id IN (${farmPlaceholders})`,
      args: farmIds,
    });
    counts.snapshots = (snapshotsResult.rows[0] as any).count;
  }

  // Count comments
  const commentsResult = await db.execute({
    sql: `SELECT COUNT(*) as count FROM post_comments WHERE author_id IN (${placeholders})`,
    args: userIds,
  });
  counts.comments = (commentsResult.rows[0] as any).count;

  // Count reactions
  const reactionsResult = await db.execute({
    sql: `SELECT COUNT(*) as count FROM post_reactions WHERE user_id IN (${placeholders})`,
    args: userIds,
  });
  counts.reactions = (reactionsResult.rows[0] as any).count;

  // Count saved posts
  const savedResult = await db.execute({
    sql: `SELECT COUNT(*) as count FROM saved_posts WHERE user_id IN (${placeholders})`,
    args: userIds,
  });
  counts.saved_posts = (savedResult.rows[0] as any).count;

  // Count notifications
  const notificationsResult = await db.execute({
    sql: `SELECT COUNT(*) as count FROM notifications WHERE user_id IN (${placeholders})`,
    args: userIds,
  });
  counts.notifications = (notificationsResult.rows[0] as any).count;

  // Count sessions
  const sessionsResult = await db.execute({
    sql: `SELECT COUNT(*) as count FROM sessions WHERE user_id IN (${placeholders})`,
    args: userIds,
  });
  counts.sessions = (sessionsResult.rows[0] as any).count;

  return counts;
}

async function promptConfirmation(): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(
      `${colors.yellow}\nType "DELETE" to confirm deletion (or anything else to cancel): ${colors.reset}`,
      (answer) => {
        rl.close();
        resolve(answer.trim().toUpperCase() === 'DELETE');
      }
    );
  });
}

async function deleteUserData(userIds: string[]) {
  if (userIds.length === 0) return;

  const placeholders = userIds.map(() => '?').join(',');

  log('\n🗑️  Deleting user data...', 'cyan');

  // Get farm IDs first
  const farmIdsResult = await db.execute({
    sql: `SELECT id FROM farms WHERE user_id IN (${placeholders})`,
    args: userIds,
  });
  const farmIds = farmIdsResult.rows.map((row: any) => row.id);

  if (farmIds.length > 0) {
    const farmPlaceholders = farmIds.map(() => '?').join(',');

    // Delete in order to respect dependencies

    log('  Deleting notifications...', 'blue');
    await db.execute({
      sql: `DELETE FROM notifications WHERE user_id IN (${placeholders})`,
      args: userIds,
    });

    log('  Deleting saved posts...', 'blue');
    await db.execute({
      sql: `DELETE FROM saved_posts WHERE user_id IN (${placeholders})`,
      args: userIds,
    });

    log('  Deleting post views...', 'blue');
    await db.execute({
      sql: `DELETE FROM post_views WHERE user_id IN (${placeholders})`,
      args: userIds,
    });

    log('  Deleting reactions...', 'blue');
    await db.execute({
      sql: `DELETE FROM post_reactions WHERE user_id IN (${placeholders})`,
      args: userIds,
    });

    log('  Deleting comments...', 'blue');
    await db.execute({
      sql: `DELETE FROM post_comments WHERE author_id IN (${placeholders})`,
      args: userIds,
    });

    log('  Deleting posts...', 'blue');
    await db.execute({
      sql: `DELETE FROM farm_posts WHERE author_id IN (${placeholders})`,
      args: userIds,
    });

    log('  Deleting AI analyses...', 'blue');
    await db.execute({
      sql: `DELETE FROM ai_analyses WHERE farm_id IN (${farmPlaceholders})`,
      args: farmIds,
    });

    log('  Deleting AI conversations...', 'blue');
    await db.execute({
      sql: `DELETE FROM ai_conversations WHERE farm_id IN (${farmPlaceholders})`,
      args: farmIds,
    });

    log('  Deleting map snapshots...', 'blue');
    await db.execute({
      sql: `DELETE FROM map_snapshots WHERE farm_id IN (${farmPlaceholders})`,
      args: farmIds,
    });

    log('  Deleting plantings...', 'blue');
    await db.execute({
      sql: `DELETE FROM plantings WHERE farm_id IN (${farmPlaceholders})`,
      args: farmIds,
    });

    log('  Deleting zones...', 'blue');
    await db.execute({
      sql: `DELETE FROM zones WHERE farm_id IN (${farmPlaceholders})`,
      args: farmIds,
    });

    log('  Deleting farmer goals...', 'blue');
    await db.execute({
      sql: `DELETE FROM farmer_goals WHERE farm_id IN (${farmPlaceholders})`,
      args: farmIds,
    });

    log('  Deleting farm collaborators...', 'blue');
    await db.execute({
      sql: `DELETE FROM farm_collaborators WHERE farm_id IN (${farmPlaceholders}) OR collaborator_id IN (${placeholders})`,
      args: [...farmIds, ...userIds],
    });

    log('  Deleting farms...', 'blue');
    await db.execute({
      sql: `DELETE FROM farms WHERE user_id IN (${placeholders})`,
      args: userIds,
    });
  }

  log('  Deleting sessions...', 'blue');
  await db.execute({
    sql: `DELETE FROM sessions WHERE user_id IN (${placeholders})`,
    args: userIds,
  });

  log('  Deleting users...', 'blue');
  await db.execute({
    sql: `DELETE FROM users WHERE id IN (${placeholders})`,
    args: userIds,
  });

  log('\n✅ Deletion complete!', 'green');
}

async function main() {
  log('╔═══════════════════════════════════════════════╗', 'cyan');
  log('║   Test Users Cleanup Script                   ║', 'cyan');
  log('╚═══════════════════════════════════════════════╝', 'cyan');

  log('\n🔍 Searching for test users...', 'yellow');
  log(`   Emails: ${TEST_EMAILS.join(', ')}`, 'blue');

  const users = await getUserIds();

  if (users.length === 0) {
    log('\n✓ No test users found in database', 'green');
    return;
  }

  log(`\n📋 Found ${users.length} test user(s):`, 'yellow');
  users.forEach((user) => {
    log(`   • ${user.email} (${user.id})`, 'blue');
  });

  const userIds = users.map((u) => u.id);
  const counts = await getDataCounts(userIds);

  if (counts) {
    log('\n📊 Data to be deleted:', 'yellow');
    log(`   Users:              ${users.length}`, 'blue');
    log(`   Farms:              ${counts.farms || 0}`, 'blue');
    log(`   Zones:              ${counts.zones || 0}`, 'blue');
    log(`   Plantings:          ${counts.plantings || 0}`, 'blue');
    log(`   Posts:              ${counts.posts || 0}`, 'blue');
    log(`   Comments:           ${counts.comments || 0}`, 'blue');
    log(`   Reactions:          ${counts.reactions || 0}`, 'blue');
    log(`   Saved Posts:        ${counts.saved_posts || 0}`, 'blue');
    log(`   AI Conversations:   ${counts.ai_conversations || 0}`, 'blue');
    log(`   AI Analyses:        ${counts.ai_analyses || 0}`, 'blue');
    log(`   Map Snapshots:      ${counts.snapshots || 0}`, 'blue');
    log(`   Notifications:      ${counts.notifications || 0}`, 'blue');
    log(`   Sessions:           ${counts.sessions || 0}`, 'blue');
  }

  log('\n⚠️  WARNING: This action cannot be undone!', 'red');

  const confirmed = await promptConfirmation();

  if (!confirmed) {
    log('\n❌ Deletion cancelled', 'yellow');
    return;
  }

  await deleteUserData(userIds);
}

main().catch((error) => {
  log(`\n❌ Error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
