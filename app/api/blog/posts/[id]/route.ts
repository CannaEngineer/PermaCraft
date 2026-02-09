import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { db } from '@/lib/db';
import { z } from 'zod';

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  slug: z.string().optional(),
  metaDescription: z.string().optional(),
  excerpt: z.string().optional(),
  content: z.string().min(1).optional(),
  tags: z.array(z.string()).optional(),
  seoKeywords: z.string().optional(),
  readTimeMinutes: z.number().min(1).max(60).optional(),
  xpReward: z.number().min(5).max(100).optional(),
  isPublished: z.boolean().optional(),
});

async function requireAdmin() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  const userResult = await db.execute({
    sql: 'SELECT is_admin FROM users WHERE id = ?',
    args: [session.user.id],
  });

  if (userResult.rows.length === 0 || !(userResult.rows[0] as any).is_admin) {
    throw new Error('Admin access required');
  }

  return session.user.id;
}

interface RouteContext {
  params: { id: string };
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    await requireAdmin();
    const body = await request.json();
    const data = updateSchema.parse(body);

    // Check post exists
    const existingResult = await db.execute({
      sql: 'SELECT * FROM blog_posts WHERE id = ?',
      args: [params.id],
    });

    if (existingResult.rows.length === 0) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const existing = existingResult.rows[0] as any;

    // Build update query
    const updates: string[] = [];
    const args: any[] = [];

    if (data.title !== undefined) {
      updates.push('title = ?');
      args.push(data.title);
    }

    if (data.slug !== undefined) {
      // Check slug uniqueness
      const slugResult = await db.execute({
        sql: 'SELECT id FROM blog_posts WHERE slug = ? AND id != ?',
        args: [data.slug, params.id],
      });

      if (slugResult.rows.length > 0) {
        return NextResponse.json(
          { error: 'A post with this slug already exists' },
          { status: 400 }
        );
      }

      updates.push('slug = ?');
      args.push(data.slug);
    }

    if (data.metaDescription !== undefined) {
      updates.push('meta_description = ?');
      args.push(data.metaDescription);
    }

    if (data.excerpt !== undefined) {
      updates.push('excerpt = ?');
      args.push(data.excerpt);
    }

    if (data.content !== undefined) {
      updates.push('content = ?');
      args.push(data.content);
    }

    if (data.seoKeywords !== undefined) {
      updates.push('seo_keywords = ?');
      args.push(data.seoKeywords);
    }

    if (data.readTimeMinutes !== undefined) {
      updates.push('read_time_minutes = ?');
      args.push(data.readTimeMinutes);
    }

    if (data.xpReward !== undefined) {
      updates.push('xp_reward = ?');
      args.push(data.xpReward);
    }

    if (data.isPublished !== undefined) {
      updates.push('is_published = ?');
      args.push(data.isPublished ? 1 : 0);

      // Set published_at if publishing for first time
      if (data.isPublished && !existing.published_at) {
        updates.push('published_at = unixepoch()');
      }
    }

    updates.push('updated_at = unixepoch()');
    args.push(params.id);

    if (updates.length > 1) {
      // Always has updated_at
      await db.execute({
        sql: `UPDATE blog_posts SET ${updates.join(', ')} WHERE id = ?`,
        args,
      });
    }

    // Update tags if provided
    if (data.tags !== undefined) {
      // Remove existing tags
      await db.execute({
        sql: 'DELETE FROM blog_post_tags WHERE blog_post_id = ?',
        args: [params.id],
      });

      // Add new tags
      for (const tagName of data.tags) {
        const tagSlug = tagName.toLowerCase().replace(/\s+/g, '-');

        // Get or create tag
        let tagResult = await db.execute({
          sql: 'SELECT id FROM blog_tags WHERE slug = ?',
          args: [tagSlug],
        });

        let tagId: string;
        if (tagResult.rows.length === 0) {
          tagId = crypto.randomUUID();
          await db.execute({
            sql: 'INSERT INTO blog_tags (id, name, slug) VALUES (?, ?, ?)',
            args: [tagId, tagName, tagSlug],
          });
        } else {
          tagId = (tagResult.rows[0] as any).id;
        }

        await db.execute({
          sql: 'INSERT OR IGNORE INTO blog_post_tags (blog_post_id, tag_id) VALUES (?, ?)',
          args: [params.id, tagId],
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Update post error:', error);
    if (error.message === 'Unauthorized' || error.message === 'Admin access required') {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error.message || 'Failed to update post' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    await requireAdmin();

    // Check post exists
    const existingResult = await db.execute({
      sql: 'SELECT id FROM blog_posts WHERE id = ?',
      args: [params.id],
    });

    if (existingResult.rows.length === 0) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Delete post (cascades to tags and reads)
    await db.execute({
      sql: 'DELETE FROM blog_posts WHERE id = ?',
      args: [params.id],
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete post error:', error);
    if (error.message === 'Unauthorized' || error.message === 'Admin access required') {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error.message || 'Failed to delete post' },
      { status: 500 }
    );
  }
}
