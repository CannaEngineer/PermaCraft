import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { db } from '@/lib/db';
import { z } from 'zod';

const postSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().optional(),
  metaDescription: z.string().optional(),
  excerpt: z.string().optional(),
  content: z.string().min(1),
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

export async function POST(request: Request) {
  try {
    const userId = await requireAdmin();
    const body = await request.json();
    const data = postSchema.parse(body);

    // Generate slug if not provided
    const slug =
      data.slug ||
      data.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .substring(0, 100);

    // Check slug uniqueness
    const existingResult = await db.execute({
      sql: 'SELECT id FROM blog_posts WHERE slug = ?',
      args: [slug],
    });

    if (existingResult.rows.length > 0) {
      return NextResponse.json(
        { error: 'A post with this slug already exists' },
        { status: 400 }
      );
    }

    const postId = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);

    // Create blog post
    await db.execute({
      sql: `
        INSERT INTO blog_posts (
          id, title, slug, meta_description, excerpt, content,
          author_id, is_published, is_ai_generated, published_at,
          read_time_minutes, xp_reward, seo_keywords, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        postId,
        data.title,
        slug,
        data.metaDescription || '',
        data.excerpt || '',
        data.content,
        userId,
        data.isPublished ? 1 : 0,
        0, // Not AI-generated (manual post)
        data.isPublished ? now : null,
        data.readTimeMinutes || 5,
        data.xpReward || 15,
        data.seoKeywords || '',
        now,
      ],
    });

    // Add tags
    if (data.tags && data.tags.length > 0) {
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
          args: [postId, tagId],
        });
      }
    }

    return NextResponse.json({ success: true, postId, slug });
  } catch (error: any) {
    console.error('Create post error:', error);
    if (error.message === 'Unauthorized' || error.message === 'Admin access required') {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error.message || 'Failed to create post' },
      { status: 500 }
    );
  }
}
