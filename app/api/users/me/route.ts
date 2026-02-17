import { requireAuth } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { NextRequest } from 'next/server';

export async function GET() {
  try {
    const session = await requireAuth();

    const result = await db.execute({
      sql: `
        SELECT id, name, email, image, created_at,
               bio, location, website, cover_image_url,
               social_links, interests, experience_level,
               climate_zone, profile_visibility
        FROM users WHERE id = ?
      `,
      args: [session.user.id],
    });

    if (result.rows.length === 0) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const user = result.rows[0] as any;
    return Response.json({
      ...user,
      social_links: user.social_links ? JSON.parse(user.social_links) : null,
      interests: user.interests ? JSON.parse(user.interests) : null,
    });
  } catch (error) {
    console.error('Get current user error:', error);
    return Response.json({ error: 'Failed to get profile' }, { status: 500 });
  }
}

const ALLOWED_FIELDS = [
  'name', 'bio', 'location', 'website', 'social_links',
  'interests', 'experience_level', 'climate_zone', 'profile_visibility',
] as const;

const EXPERIENCE_LEVELS = ['beginner', 'intermediate', 'advanced', 'expert'];
const VISIBILITY_OPTIONS = ['public', 'registered', 'private'];

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();

    const updates: string[] = [];
    const args: any[] = [];

    for (const field of ALLOWED_FIELDS) {
      if (body[field] === undefined) continue;

      const value = body[field];

      // Validate specific fields
      if (field === 'experience_level' && value !== null && !EXPERIENCE_LEVELS.includes(value)) {
        return Response.json({ error: `Invalid experience level: ${value}` }, { status: 400 });
      }
      if (field === 'profile_visibility' && !VISIBILITY_OPTIONS.includes(value)) {
        return Response.json({ error: `Invalid visibility: ${value}` }, { status: 400 });
      }
      if (field === 'name' && (!value || typeof value !== 'string' || value.trim().length === 0)) {
        return Response.json({ error: 'Name is required' }, { status: 400 });
      }
      if (field === 'website' && value && typeof value === 'string' && value.length > 500) {
        return Response.json({ error: 'Website URL too long' }, { status: 400 });
      }
      if (field === 'bio' && value && typeof value === 'string' && value.length > 500) {
        return Response.json({ error: 'Bio too long (max 500 characters)' }, { status: 400 });
      }

      // JSON-encode object/array fields
      if (field === 'social_links' || field === 'interests') {
        updates.push(`${field} = ?`);
        args.push(value ? JSON.stringify(value) : null);
      } else {
        updates.push(`${field} = ?`);
        args.push(value === '' ? null : value);
      }
    }

    if (updates.length === 0) {
      return Response.json({ error: 'No fields to update' }, { status: 400 });
    }

    args.push(session.user.id);

    await db.execute({
      sql: `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      args,
    });

    // Return updated profile
    const result = await db.execute({
      sql: `
        SELECT id, name, email, image, created_at,
               bio, location, website, cover_image_url,
               social_links, interests, experience_level,
               climate_zone, profile_visibility
        FROM users WHERE id = ?
      `,
      args: [session.user.id],
    });

    const user = result.rows[0] as any;
    return Response.json({
      ...user,
      social_links: user.social_links ? JSON.parse(user.social_links) : null,
      interests: user.interests ? JSON.parse(user.interests) : null,
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return Response.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
