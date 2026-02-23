import { requireAdmin } from '@/lib/auth/admin';
import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

async function sha256(text: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();

    const userResult = await db.execute({
      sql: 'SELECT id, email FROM users WHERE id = ?',
      args: [params.id],
    });

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = userResult.rows[0] as unknown as { id: string; email: string };

    // Invalidate any existing unused tokens for this user
    await db.execute({
      sql: 'DELETE FROM password_reset_tokens WHERE user_id = ? AND used_at IS NULL',
      args: [user.id],
    });

    // Generate a cryptographically secure token
    const rawToken = crypto.randomUUID() + '-' + crypto.randomUUID();
    const tokenHash = await sha256(rawToken);
    const tokenId = crypto.randomUUID();
    const expiresAt = Math.floor((Date.now() + TOKEN_TTL_MS) / 1000);

    await db.execute({
      sql: 'INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)',
      args: [tokenId, user.id, tokenHash, expiresAt],
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const resetUrl = `${appUrl}/reset-password?token=${rawToken}`;

    // TODO: Send resetUrl via transactional email (Resend, Postmark, etc.)
    // For now, return it in the response for admin to send manually.
    console.log(`Password reset URL for ${user.email}: ${resetUrl}`);

    return NextResponse.json({
      success: true,
      message: 'Reset token generated. Email integration pending — copy the reset URL below.',
      resetUrl,
      expiresAt: new Date(expiresAt * 1000).toISOString(),
    });
  } catch (error: any) {
    console.error('Failed to generate password reset token:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate reset token' },
      { status: 500 }
    );
  }
}
