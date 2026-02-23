'use client';

import { useState, useEffect } from 'react';
import { PanelHeader } from './panel-header';
import {
  Loader2, MapPin, ArrowRight, UserPlus, UserCheck,
  AlertCircle, Globe, Award, Calendar, Leaf
} from 'lucide-react';
import { useUnifiedCanvas } from '@/contexts/unified-canvas-context';

interface UserProfileData {
  id: string;
  name: string | null;
  image: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  experience_level: string | null;
  climate_zone: string | null;
  created_at: number;
  farm_count: number;
  post_count: number;
  follower_count: number;
  following_count: number;
  is_following: boolean;
  is_own_profile: boolean;
  badges: Array<{
    id: string;
    name: string;
    description: string;
    icon_name: string;
    badge_type: string;
    tier: number;
    earned_at: number;
  }>;
}

interface UserFarm {
  id: string;
  name: string;
  description: string | null;
  acres: number | null;
  climate_zone: string | null;
  zone_count: number;
  planting_count: number;
}

interface ProfileSubPanelProps {
  userId: string;
}

const experienceBadge: Record<string, { label: string; color: string }> = {
  beginner: { label: 'Beginner', color: 'bg-green-500/10 text-green-600' },
  intermediate: { label: 'Intermediate', color: 'bg-blue-500/10 text-blue-600' },
  advanced: { label: 'Advanced', color: 'bg-purple-500/10 text-purple-600' },
  expert: { label: 'Expert', color: 'bg-amber-500/10 text-amber-600' },
};

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

function initials(name: string | null): string {
  if (!name) return '?';
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('');
}

export function ProfileSubPanel({ userId }: ProfileSubPanelProps) {
  const { setActiveFarmId, setActiveSection } = useUnifiedCanvas();
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [farms, setFarms] = useState<UserFarm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);

    Promise.all([
      fetch(`/api/users/${userId}`)
        .then(r => { if (!r.ok) throw new Error(); return r.json(); })
        .catch(() => null),
      fetch(`/api/users/${userId}/farms`)
        .then(r => { if (!r.ok) throw new Error(); return r.json(); })
        .catch(() => ({ farms: [] })),
    ]).then(([profileData, farmsData]) => {
      if (!profileData || profileData.error) {
        setError(true);
      } else {
        setProfile(profileData);
      }
      setFarms(farmsData?.farms || []);
    }).finally(() => {
      setLoading(false);
    });
  }, [userId]);

  const handleFollow = async () => {
    if (followLoading || !profile) return;
    setFollowLoading(true);
    try {
      const res = await fetch(`/api/users/${userId}/follow`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setProfile(prev =>
          prev
            ? {
                ...prev,
                is_following: data.following,
                follower_count: data.follower_count,
              }
            : prev
        );
      }
    } catch {
      // silently fail
    } finally {
      setFollowLoading(false);
    }
  };

  const handleFarmClick = (farmId: string) => {
    setActiveFarmId(farmId);
    setActiveSection('farm');
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <PanelHeader title="Profile" />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex flex-col h-full">
        <PanelHeader title="Profile" />
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <AlertCircle className="h-10 w-10 text-destructive/40 mb-3" />
          <p className="text-sm font-medium mb-1">Could not load profile</p>
          <p className="text-xs text-muted-foreground">This user may not exist or the profile is private.</p>
        </div>
      </div>
    );
  }

  const memberSince = new Date(profile.created_at * 1000).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="flex flex-col h-full">
      <PanelHeader title={profile.name || 'Profile'} />

      <div className="flex-1 overflow-y-auto">
        {/* Profile header */}
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-start gap-3">
            {/* Avatar */}
            <div
              className={`w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 ${
                profile.image ? '' : avatarColor(profile.id)
              }`}
            >
              {profile.image ? (
                <img
                  src={profile.image}
                  alt={profile.name || 'User'}
                  className="w-14 h-14 rounded-full object-cover"
                />
              ) : (
                <span className="text-lg font-bold text-white">
                  {initials(profile.name)}
                </span>
              )}
            </div>

            {/* Name + meta */}
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold truncate">
                {profile.name || 'Anonymous'}
              </h3>

              {profile.location && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{profile.location}</span>
                </p>
              )}

              {profile.experience_level && experienceBadge[profile.experience_level] && (
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${experienceBadge[profile.experience_level].color}`}
                >
                  <Leaf className="h-2.5 w-2.5" />
                  {experienceBadge[profile.experience_level].label}
                </span>
              )}
            </div>
          </div>

          {/* Bio */}
          {profile.bio && (
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              {profile.bio}
            </p>
          )}

          {/* Stats row */}
          <div className="flex items-center gap-4 mt-3 text-center">
            <div>
              <p className="text-sm font-bold">{profile.farm_count}</p>
              <p className="text-xs text-muted-foreground">Farms</p>
            </div>
            <div>
              <p className="text-sm font-bold">{profile.follower_count}</p>
              <p className="text-xs text-muted-foreground">Followers</p>
            </div>
            <div>
              <p className="text-sm font-bold">{profile.following_count}</p>
              <p className="text-xs text-muted-foreground">Following</p>
            </div>
            <div>
              <p className="text-sm font-bold">{profile.post_count}</p>
              <p className="text-xs text-muted-foreground">Posts</p>
            </div>
          </div>

          {/* Follow button (not for own profile) */}
          {!profile.is_own_profile && (
            <button
              onClick={handleFollow}
              disabled={followLoading}
              className={`w-full mt-3 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
                profile.is_following
                  ? 'bg-accent hover:bg-accent/70 text-foreground'
                  : 'bg-primary hover:bg-primary/90 text-primary-foreground'
              }`}
            >
              {followLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : profile.is_following ? (
                <>
                  <UserCheck className="h-3.5 w-3.5" />
                  Following
                </>
              ) : (
                <>
                  <UserPlus className="h-3.5 w-3.5" />
                  Follow
                </>
              )}
            </button>
          )}

          {/* Member since + website */}
          <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Joined {memberSince}
            </span>
            {profile.website && (
              <a
                href={profile.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-primary hover:underline truncate"
                onClick={(e) => e.stopPropagation()}
              >
                <Globe className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{profile.website.replace(/^https?:\/\//, '')}</span>
              </a>
            )}
          </div>
        </div>

        {/* Badges */}
        {profile.badges && profile.badges.length > 0 && (
          <div className="px-4 py-3 border-t border-border/30">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Badges
            </h4>
            <div className="flex flex-wrap gap-2">
              {profile.badges.slice(0, 6).map((badge) => (
                <div
                  key={badge.id}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-accent/50 text-xs font-medium"
                  title={badge.description}
                >
                  <Award className="h-3 w-3 text-amber-500" />
                  {badge.name}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Public farms */}
        <div className="px-4 py-3 border-t border-border/30">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Public Farms
          </h4>

          {farms.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">
              No public farms yet.
            </p>
          ) : (
            <div className="space-y-1">
              {farms.map((farm) => (
                <button
                  key={farm.id}
                  onClick={() => handleFarmClick(farm.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-accent/50 transition-colors text-left group"
                >
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <MapPin className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{farm.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {[
                        farm.acres ? `${farm.acres} acres` : null,
                        farm.climate_zone ? `Zone ${farm.climate_zone}` : null,
                        farm.planting_count ? `${farm.planting_count} plantings` : null,
                      ]
                        .filter(Boolean)
                        .join(' \u00b7') || 'No details'}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
