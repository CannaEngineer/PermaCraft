import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { z } from 'zod';

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  provider: z.string().min(1).optional(),
  model_id: z.string().min(1).optional(),
  category: z.enum(['text', 'vision', 'image_generation', 'image_prompt']).optional(),
  cost_description: z.string().optional(),
  description: z.string().optional(),
  is_active: z.number().min(0).max(1).optional(),
});

// PUT - Update model
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const body = await request.json();
    const data = updateSchema.parse(body);

    // Build update query dynamically
    const updates: string[] = [];
    const args: any[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      args.push(data.name);
    }
    if (data.provider !== undefined) {
      updates.push('provider = ?');
      args.push(data.provider);
    }
    if (data.model_id !== undefined) {
      updates.push('model_id = ?');
      args.push(data.model_id);
    }
    if (data.category !== undefined) {
      updates.push('category = ?');
      args.push(data.category);
    }
    if (data.cost_description !== undefined) {
      updates.push('cost_description = ?');
      args.push(data.cost_description);
    }
    if (data.description !== undefined) {
      updates.push('description = ?');
      args.push(data.description);
    }
    if (data.is_active !== undefined) {
      updates.push('is_active = ?');
      args.push(data.is_active);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    updates.push('updated_at = unixepoch()');
    args.push(id);

    await db.execute({
      sql: `UPDATE ai_model_catalog SET ${updates.join(', ')} WHERE id = ?`,
      args,
    });

    return NextResponse.json({ success: true, message: 'Model updated successfully' });
  } catch (error: any) {
    console.error('Update model error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update model' },
      { status: 500 }
    );
  }
}

// DELETE - Remove model
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    // Soft delete - set is_active to 0
    await db.execute({
      sql: 'UPDATE ai_model_catalog SET is_active = 0, updated_at = unixepoch() WHERE id = ?',
      args: [id],
    });

    return NextResponse.json({ success: true, message: 'Model deleted successfully' });
  } catch (error: any) {
    console.error('Delete model error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete model' },
      { status: 500 }
    );
  }
}
