import { NextResponse } from 'next/server';
import { generateBlogPost_Auto } from '@/lib/blog/auto-generator';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth/session';

export async function POST(request: Request) {
  try {
    // Verify admin user
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userResult = await db.execute({
      sql: 'SELECT is_admin FROM users WHERE id = ?',
      args: [session.user.id],
    });

    if (userResult.rows.length === 0 || !(userResult.rows[0] as any).is_admin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Generate post (auto-publish enabled)
    const postId = await generateBlogPost_Auto(session.user.id, true);

    // Get generated post details
    const postResult = await db.execute({
      sql: 'SELECT title, slug FROM blog_posts WHERE id = ?',
      args: [postId],
    });

    const post = postResult.rows[0] as any;

    return NextResponse.json({
      success: true,
      postId,
      title: post.title,
      slug: post.slug,
      message: 'Blog post generated and published',
    });
  } catch (error: any) {
    console.error('Manual generation failed:', error);
    return NextResponse.json(
      { error: error.message || 'Generation failed' },
      { status: 500 }
    );
  }
}
