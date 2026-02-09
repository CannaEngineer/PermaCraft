import { db } from '@/lib/db';
import { getSession } from './session';

/**
 * Check if the current user is an admin
 */
export async function isAdmin(): Promise<boolean> {
  const session = await getSession();
  if (!session) return false;

  const result = await db.execute({
    sql: 'SELECT is_admin FROM users WHERE id = ?',
    args: [session.user.id],
  });

  if (result.rows.length === 0) return false;
  return (result.rows[0] as any).is_admin === 1;
}

/**
 * Require admin access - throws 403 if not admin
 */
export async function requireAdmin() {
  const session = await getSession();
  if (!session) {
    throw new Error('Unauthorized');
  }

  const admin = await isAdmin();
  if (!admin) {
    throw new Error('Forbidden: Admin access required');
  }

  return session;
}

/**
 * Set admin status for a user (for initial setup)
 */
export async function setAdminStatus(userId: string, isAdmin: boolean) {
  await db.execute({
    sql: 'UPDATE users SET is_admin = ? WHERE id = ?',
    args: [isAdmin ? 1 : 0, userId],
  });
}
