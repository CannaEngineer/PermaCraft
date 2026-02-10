import { db } from '@/lib/db';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { filename } = await request.json();

    if (!filename) {
      return NextResponse.json(
        { error: 'Filename required' },
        { status: 400 }
      );
    }

    // Read migration file
    const migrationPath = resolve(process.cwd(), 'lib/db/migrations', filename);
    const migration = readFileSync(migrationPath, 'utf-8');

    console.log(`Running migration: ${filename}`);

    // Split by semicolon and execute each statement
    const statements = migration.split(';').filter(s => s.trim());
    for (const statement of statements) {
      if (statement.trim()) {
        await db.execute(statement.trim());
      }
    }

    return NextResponse.json({
      success: true,
      message: `Migration ${filename} completed successfully`,
    });
  } catch (error: any) {
    console.error('Migration failed:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
