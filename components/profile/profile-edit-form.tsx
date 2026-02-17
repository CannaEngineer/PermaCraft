'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AvatarUpload } from './avatar-upload';
import { InterestSelector } from './interest-selector';
import { Loader2, Save } from 'lucide-react';

interface ProfileData {
  id: string;
  name: string;
  email: string;
  image: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  cover_image_url: string | null;
  social_links: { twitter?: string; github?: string; instagram?: string } | null;
  interests: string[] | null;
  experience_level: string | null;
  climate_zone: string | null;
  profile_visibility: string;
}

interface ProfileEditFormProps {
  profile: ProfileData;
}

export function ProfileEditForm({ profile }: ProfileEditFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: profile.name || '',
    bio: profile.bio || '',
    location: profile.location || '',
    website: profile.website || '',
    climate_zone: profile.climate_zone || '',
    experience_level: profile.experience_level || '',
    profile_visibility: profile.profile_visibility || 'public',
    interests: profile.interests || [],
    social_links: {
      twitter: profile.social_links?.twitter || '',
      github: profile.social_links?.github || '',
      instagram: profile.social_links?.instagram || '',
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        ...form,
        social_links: Object.values(form.social_links).some(Boolean)
          ? form.social_links
          : null,
        interests: form.interests.length > 0 ? form.interests : null,
        experience_level: form.experience_level || null,
        climate_zone: form.climate_zone || null,
      };

      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        router.push(`/profile/${profile.id}`);
        router.refresh();
      }
    } catch (error) {
      console.error('Failed to save profile:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/users/me/cover', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.cover_image_url) {
        router.refresh();
      }
    } catch (error) {
      console.error('Cover upload failed:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Avatar */}
      <div>
        <Label className="text-sm font-medium mb-3 block">Profile Photo</Label>
        <AvatarUpload
          currentImage={profile.image}
          name={form.name}
          onUpload={() => router.refresh()}
        />
      </div>

      {/* Cover Image */}
      <div>
        <Label className="text-sm font-medium mb-2 block">Cover Image</Label>
        <div className="relative h-32 rounded-lg overflow-hidden bg-muted">
          {profile.cover_image_url ? (
            <img src={profile.cover_image_url} alt="Cover" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-green-500/20 to-teal-500/20" />
          )}
        </div>
        <Input
          type="file"
          accept="image/*"
          onChange={handleCoverUpload}
          className="mt-2 text-sm"
        />
        <p className="text-xs text-muted-foreground mt-1">Recommended: 1500x500px. Max 10MB.</p>
      </div>

      {/* Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Display Name *</Label>
          <Input
            id="name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            placeholder="e.g. Portland, OR"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="bio">Bio</Label>
        <Textarea
          id="bio"
          value={form.bio}
          onChange={(e) => setForm({ ...form, bio: e.target.value })}
          placeholder="Tell others about your permaculture journey..."
          maxLength={500}
          rows={3}
        />
        <p className="text-xs text-muted-foreground mt-1">{form.bio.length}/500</p>
      </div>

      <div>
        <Label htmlFor="website">Website</Label>
        <Input
          id="website"
          value={form.website}
          onChange={(e) => setForm({ ...form, website: e.target.value })}
          placeholder="https://your-site.com"
        />
      </div>

      {/* Permaculture Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="climate_zone">Climate Zone</Label>
          <Input
            id="climate_zone"
            value={form.climate_zone}
            onChange={(e) => setForm({ ...form, climate_zone: e.target.value })}
            placeholder="e.g. 8b, Tropical"
          />
        </div>
        <div>
          <Label htmlFor="experience_level">Experience Level</Label>
          <Select
            value={form.experience_level}
            onValueChange={(v) => setForm({ ...form, experience_level: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="beginner">Beginner</SelectItem>
              <SelectItem value="intermediate">Intermediate</SelectItem>
              <SelectItem value="advanced">Advanced</SelectItem>
              <SelectItem value="expert">Expert</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Interests */}
      <div>
        <Label className="mb-2 block">Interests</Label>
        <InterestSelector
          value={form.interests}
          onChange={(interests) => setForm({ ...form, interests })}
        />
      </div>

      {/* Social Links */}
      <div>
        <Label className="mb-3 block">Social Links</Label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="twitter" className="text-xs text-muted-foreground">
              X / Twitter
            </Label>
            <Input
              id="twitter"
              value={form.social_links.twitter}
              onChange={(e) =>
                setForm({
                  ...form,
                  social_links: { ...form.social_links, twitter: e.target.value },
                })
              }
              placeholder="username"
            />
          </div>
          <div>
            <Label htmlFor="github" className="text-xs text-muted-foreground">
              GitHub
            </Label>
            <Input
              id="github"
              value={form.social_links.github}
              onChange={(e) =>
                setForm({
                  ...form,
                  social_links: { ...form.social_links, github: e.target.value },
                })
              }
              placeholder="username"
            />
          </div>
          <div>
            <Label htmlFor="instagram" className="text-xs text-muted-foreground">
              Instagram
            </Label>
            <Input
              id="instagram"
              value={form.social_links.instagram}
              onChange={(e) =>
                setForm({
                  ...form,
                  social_links: { ...form.social_links, instagram: e.target.value },
                })
              }
              placeholder="username"
            />
          </div>
        </div>
      </div>

      {/* Privacy */}
      <div>
        <Label htmlFor="visibility">Profile Visibility</Label>
        <Select
          value={form.profile_visibility}
          onValueChange={(v) => setForm({ ...form, profile_visibility: v })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="public">Public - visible to everyone</SelectItem>
            <SelectItem value="registered">Registered - visible to signed-in users</SelectItem>
            <SelectItem value="private">Private - only visible to you</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving} className="gap-1.5">
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
