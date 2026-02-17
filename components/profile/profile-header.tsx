'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FollowUserButton } from './follow-user-button';
import Link from 'next/link';
import {
  MapPin,
  Globe,
  Calendar,
  Thermometer,
  Pencil,
  ExternalLink,
} from 'lucide-react';

interface ProfileHeaderProps {
  profile: {
    id: string;
    name: string;
    image: string | null;
    created_at: number;
    bio: string | null;
    location: string | null;
    website: string | null;
    cover_image_url: string | null;
    social_links: { twitter?: string; github?: string; instagram?: string } | null;
    interests: string[] | null;
    experience_level: string | null;
    climate_zone: string | null;
    follower_count: number;
    following_count: number;
    is_following: boolean;
    is_own_profile: boolean;
  };
}

export function ProfileHeader({ profile }: ProfileHeaderProps) {
  const joinedDate = new Date(profile.created_at * 1000).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="relative">
      {/* Cover Image */}
      <div className="h-48 md:h-64 w-full rounded-xl overflow-hidden">
        {profile.cover_image_url ? (
          <img
            src={profile.cover_image_url}
            alt="Cover"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-green-500/30 via-emerald-500/20 to-teal-500/30" />
        )}
      </div>

      {/* Profile Info */}
      <div className="px-4 md:px-6 -mt-16 relative">
        <div className="flex flex-col md:flex-row md:items-end gap-4">
          {/* Avatar */}
          <Avatar className="w-32 h-32 border-4 border-background shadow-lg">
            <AvatarImage src={profile.image || undefined} />
            <AvatarFallback className="text-4xl font-bold bg-gradient-to-br from-primary to-primary/70 text-primary-foreground">
              {profile.name?.[0]?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>

          {/* Name + Actions */}
          <div className="flex-1 flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">{profile.name}</h1>
              {profile.experience_level && (
                <Badge variant="secondary" className="mt-1 capitalize">
                  {profile.experience_level}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {profile.is_own_profile ? (
                <Link href="/profile/edit">
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Pencil className="w-3.5 h-3.5" />
                    Edit Profile
                  </Button>
                </Link>
              ) : (
                <FollowUserButton
                  userId={profile.id}
                  initialFollowing={profile.is_following}
                  initialCount={profile.follower_count}
                  showCount
                  size="default"
                />
              )}
            </div>
          </div>
        </div>

        {/* Bio */}
        {profile.bio && (
          <p className="mt-4 text-muted-foreground max-w-2xl">{profile.bio}</p>
        )}

        {/* Meta Info */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 text-sm text-muted-foreground">
          {profile.location && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {profile.location}
            </span>
          )}
          {profile.climate_zone && (
            <span className="flex items-center gap-1">
              <Thermometer className="w-3.5 h-3.5" />
              {profile.climate_zone}
            </span>
          )}
          {profile.website && (
            <a
              href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-primary hover:underline"
            >
              <Globe className="w-3.5 h-3.5" />
              {profile.website.replace(/^https?:\/\//, '')}
            </a>
          )}
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            Joined {joinedDate}
          </span>
        </div>

        {/* Social Links */}
        {profile.social_links && (
          <div className="flex items-center gap-3 mt-2">
            {profile.social_links.twitter && (
              <a
                href={`https://x.com/${profile.social_links.twitter}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                @{profile.social_links.twitter}
              </a>
            )}
            {profile.social_links.github && (
              <a
                href={`https://github.com/${profile.social_links.github}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <ExternalLink className="w-3 h-3" />
                GitHub
              </a>
            )}
          </div>
        )}

        {/* Interests */}
        {profile.interests && profile.interests.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {profile.interests.map((interest) => (
              <Badge key={interest} variant="outline" className="text-xs">
                {interest}
              </Badge>
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 mt-4 text-sm">
          <span>
            <strong>{profile.follower_count}</strong>{' '}
            <span className="text-muted-foreground">followers</span>
          </span>
          <span>
            <strong>{profile.following_count}</strong>{' '}
            <span className="text-muted-foreground">following</span>
          </span>
        </div>
      </div>
    </div>
  );
}
