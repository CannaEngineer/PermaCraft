#!/usr/bin/env tsx
import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@libsql/client';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

async function makeAdmin() {
  const email = process.argv[2];

  if (!email) {
    console.error('Usage: npx tsx scripts/make-admin.ts <email>');
    process.exit(1);
  }

  if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
    console.error('Error: TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are required');
    process.exit(1);
  }

  const db = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  try {
    // Find user by email
    const result = await db.execute({
      sql: 'SELECT id, email, name FROM users WHERE email = ?',
      args: [email],
    });

    if (result.rows.length === 0) {
      console.error(`❌ User not found: ${email}`);
      console.log('\nTip: Make sure the user has logged in at least once.');
      process.exit(1);
    }

    const user = result.rows[0] as any;

    // Check if already admin
    if (user.is_admin === 1) {
      console.log(`✓ ${user.name || user.email} is already an admin`);
      process.exit(0);
    }

    // Make admin
    await db.execute({
      sql: 'UPDATE users SET is_admin = 1 WHERE id = ?',
      args: [user.id],
    });

    console.log(`✅ Successfully granted admin access to ${user.name || user.email}`);
    console.log(`\nYou can now access the admin panel at /admin/content`);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

makeAdmin();
