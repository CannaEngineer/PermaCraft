'use client';

import { useState, useEffect } from 'react';
import { ChevronRight, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface CurrentUserProfile {
  id: string;
  name: string | null;
  image: string | null;
  bio: string | null;
}

// Deterministic color from user ID for initials circle
function avatarColor(userId: string): string {
  const colors = [
    'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500',
    'bg-lime-500', 'bg-green-500', 'bg-emerald-500', 'bg-teal-500',
    'bg-cyan-500', 'bg-sky-500', 'bg-blue-500', 'bg-indigo-500',
    'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500', 'bg-pink-500',
  ];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash + userId.charCodeAt(i)) | 0;
  }
  return colors[Math.abs(hash) % colors.length];
}

export function MyProfileCard() {
  const router = useRouter();
  const [profile, setProfile] = useState<CurrentUserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/users/me')
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(data => setProfile(data))
      .catch(() => { /* silently fail — card just won't show */ })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl bg-accent/30 p-3 flex items-center justify-center">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  const initial = (profile.name || 'U')[0].toUpperCase();

  return (
    <button
      onClick={() => router.push(`/profile/${profile.id}`)}
      className="w-full rounded-xl bg-accent/30 hover:bg-accent/50 transition-colors p-3 flex items-center gap-3 text-left group"
    >
      {/* Avatar */}
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
          profile.image ? '' : avatarColor(profile.id)
        }`}
      >
        {profile.image ? (
          <img
            src={profile.image}
            alt={profile.name || 'You'}
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <span className="text-sm font-bold text-white">{initial}</span>
        )}
      </div>

      {/* Name + bio snippet */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{profile.name || 'Your Profile'}</p>
        {profile.bio ? (
          <p className="text-xs text-muted-foreground truncate">{profile.bio}</p>
        ) : (
          <p className="text-xs text-muted-foreground">View Profile</p>
        )}
      </div>

      {/* Arrow */}
      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
    </button>
  );
}
