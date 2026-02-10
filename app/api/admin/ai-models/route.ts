import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { z } from 'zod';

const modelSchema = z.object({
  name: z.string().min(1),
  provider: z.string().min(1),
  model_id: z.string().min(1),
  category: z.enum(['text', 'vision', 'image_generation', 'image_prompt']),
  cost_description: z.string().optional(),
  description: z.string().optional(),
});

// GET - List all models
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userResult = await db.execute({
      sql: 'SELECT is_admin FROM users WHERE id = ?',
      args: [session.user.id],
    });

    if (userResult.rows.length === 0 || !(userResult.rows[0] as any).is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    let sql = 'SELECT * FROM ai_model_catalog WHERE is_active = 1';
    const args: string[] = [];

    if (category) {
      sql += ' AND category = ?';
      args.push(category);
    }

    sql += ' ORDER BY provider, name';

    const result = await db.execute({ sql, args });

    return NextResponse.json({ models: result.rows });
  } catch (error: any) {
    console.error('List models error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to list models' },
      { status: 500 }
    );
  }
}

// POST - Add new model
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userResult = await db.execute({
      sql: 'SELECT is_admin FROM users WHERE id = ?',
      args: [session.user.id],
    });

    if (userResult.rows.length === 0 || !(userResult.rows[0] as any).is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const data = modelSchema.parse(body);

    // Check if model_id already exists
    const existingResult = await db.execute({
      sql: 'SELECT id FROM ai_model_catalog WHERE model_id = ?',
      args: [data.model_id],
    });

    if (existingResult.rows.length > 0) {
      return NextResponse.json(
        { error: 'Model ID already exists' },
        { status: 400 }
      );
    }

    const modelId = crypto.randomUUID();
    await db.execute({
      sql: `INSERT INTO ai_model_catalog
            (id, name, provider, model_id, category, cost_description, description, created_by, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, unixepoch(), unixepoch())`,
      args: [
        modelId,
        data.name,
        data.provider,
        data.model_id,
        data.category,
        data.cost_description || null,
        data.description || null,
        session.user.id,
      ],
    });

    return NextResponse.json({
      success: true,
      modelId,
      message: 'Model added successfully'
    });
  } catch (error: any) {
    console.error('Add model error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to add model' },
      { status: 500 }
    );
  }
}
