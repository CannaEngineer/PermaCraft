import { NextResponse } from 'next/server';
import { generateBlogPost_Auto } from '@/lib/blog/auto-generator';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth/session';

export async function POST(request: Request) {
  try {
    // Verify admin user
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized - please log in as an admin' },
        { status: 401 }
      );
    }

    const userResult = await db.execute({
      sql: 'SELECT is_admin FROM users WHERE id = ?',
      args: [session.user.id],
    });

    if (userResult.rows.length === 0 || !(userResult.rows[0] as any).is_admin) {
      return NextResponse.json(
        { error: 'Admin access required - your account does not have admin privileges' },
        { status: 403 }
      );
    }

    // Check for OpenRouter API key
    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: 'OpenRouter API key not configured - add OPENROUTER_API_KEY to environment variables' },
        { status: 500 }
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

    // Provide specific error messages
    let errorMessage = 'Generation failed';
    let statusCode = 500;

    if (error.message?.includes('API key')) {
      errorMessage = 'OpenRouter API key is invalid or missing';
    } else if (error.message?.includes('rate limit') || error.status === 429) {
      errorMessage = 'Rate limit exceeded - please wait a moment and try again';
      statusCode = 429;
    } else if (error.message?.includes('timeout')) {
      errorMessage = 'AI generation timed out - please try again';
      statusCode = 504;
    } else if (error.message?.includes('No endpoints found') || error.status === 404) {
      errorMessage = 'AI model not available - check model configuration';
      statusCode = 503;
    } else if (error.message?.includes('insufficient credits') || error.message?.includes('quota')) {
      errorMessage = 'Insufficient OpenRouter credits - please add credits to your account';
    } else if (error.message) {
      errorMessage = error.message;
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: statusCode }
    );
  }
}
