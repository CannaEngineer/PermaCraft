import { requireAuth } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { ProfileEditForm } from '@/components/profile/profile-edit-form';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export default async function EditProfilePage() {
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
    return <div>User not found</div>;
  }

  const user = result.rows[0] as any;
  const profile = {
    ...user,
    social_links: user.social_links ? JSON.parse(user.social_links) : null,
    interests: user.interests ? JSON.parse(user.interests) : null,
    profile_visibility: user.profile_visibility || 'public',
  };

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <Link
        href={`/profile/${session.user.id}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Profile
      </Link>

      <h1 className="text-3xl font-bold mb-8">Edit Profile</h1>

      <ProfileEditForm profile={profile} />
    </div>
  );
}
