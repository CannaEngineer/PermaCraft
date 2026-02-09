import { NextResponse } from 'next/server';
import { generateBlogPost_Auto } from '@/lib/blog/auto-generator';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get first admin user
    const adminResult = await db.execute({
      sql: 'SELECT id FROM users WHERE is_admin = 1 LIMIT 1',
      args: [],
    });

    if (adminResult.rows.length === 0) {
      return NextResponse.json({ error: 'No admin found' }, { status: 500 });
    }

    const adminId = (adminResult.rows[0] as any).id;

    // Generate post (auto-publish enabled)
    const postId = await generateBlogPost_Auto(adminId, true);

    return NextResponse.json({
      success: true,
      postId,
      message: 'Blog post generated and published',
    });
  } catch (error: any) {
    console.error('Auto-generation failed:', error);
    return NextResponse.json(
      { error: error.message || 'Generation failed' },
      { status: 500 }
    );
  }
}
