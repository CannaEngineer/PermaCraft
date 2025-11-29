import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function clearFarms() {
  try {
    // Delete in correct order (foreign key constraints)
    await db.execute('DELETE FROM ai_analyses');
    console.log('✓ Deleted AI analyses');

    await db.execute('DELETE FROM zones');
    console.log('✓ Deleted zones');

    await db.execute('DELETE FROM farms');
    console.log('✓ Deleted farms');

    console.log('\n✅ All farms and related data cleared!');
  } catch (error) {
    console.error('❌ Error clearing farms:', error);
    process.exit(1);
  }
}

clearFarms();
