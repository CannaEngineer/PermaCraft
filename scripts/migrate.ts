import { createClient } from '@libsql/client';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment files for local runs (no-op if missing)
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

async function runAllMigrations() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) {
    console.log('⚠ TURSO_DATABASE_URL not set — skipping migrations');
    process.exit(0);
  }

  const db = createClient({ url, authToken });

  const migrationsDir = join(__dirname, '..', 'lib', 'db', 'migrations');
  const files = readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log(`Running ${files.length} migrations…\n`);

  for (const file of files) {
    const raw = readFileSync(join(migrationsDir, file), 'utf-8');

    // Strip comment lines, split by semicolon
    const statements = raw
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n')
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    let skipped = 0;
    let executed = 0;

    for (const stmt of statements) {
      try {
        await db.execute(stmt);
        executed++;
      } catch (error: any) {
        const msg = error.message ?? '';
        if (
          msg.includes('already exists') ||
          msg.includes('duplicate column') ||
          msg.includes('no column named') ||
          msg.includes('no such column')
        ) {
          skipped++;
          continue;
        }
        console.error(`✗ ${file} failed:`);
        console.error(`  Statement: ${stmt.substring(0, 120)}…`);
        console.error(`  Error: ${msg}`);
        process.exit(1);
      }
    }

    const parts: string[] = [];
    if (executed) parts.push(`${executed} applied`);
    if (skipped) parts.push(`${skipped} skipped`);
    const summary = parts.length ? parts.join(', ') : 'empty';
    console.log(`  ${file} — ${summary}`);
  }

  console.log('\n✓ All migrations complete');
  process.exit(0);
}

runAllMigrations().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
