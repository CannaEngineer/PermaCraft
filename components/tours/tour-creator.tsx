'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft,
  Loader2,
  Globe,
  Link as LinkIcon,
  Lock,
  Footprints,
  TreePine,
  Mountain,
  Image,
  Sun,
  Sparkles,
} from 'lucide-react';
import type { FarmTour, TourAccessType, TourDifficulty } from '@/lib/db/schema';

interface TourCreatorProps {
  farmId: string;
  onCreated: (tour: FarmTour) => void;
  onCancel: () => void;
}

const STEP_LABELS = ['Basics', 'Experience', 'Access'] as const;

export function TourCreator({ farmId, onCreated, onCancel }: TourCreatorProps) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 1: Basics
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');

  // Step 2: Experience
  const [difficulty, setDifficulty] = useState<TourDifficulty>('easy');
  const [seasonalNotes, setSeasonalNotes] = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [completionMessage, setCompletionMessage] = useState('');

  // Step 3: Access
  const [accessType, setAccessType] = useState<TourAccessType>('public');
  const [accessPassword, setAccessPassword] = useState('');

  const handleCreate = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/farms/${farmId}/tours`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          cover_image_url: coverImageUrl.trim() || null,
          access_type: accessType,
          access_password: accessType === 'password' ? accessPassword : null,
          difficulty,
          seasonal_notes: seasonalNotes.trim() || null,
          welcome_message: welcomeMessage.trim() || null,
          completion_message: completionMessage.trim() || null,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        alert(`Failed to create tour: ${text}`);
        return;
      }
      const tour = await res.json();
      onCreated(tour);
    } catch {
      alert('Failed to create tour');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onCancel} className="h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-xl font-bold tracking-tight">Create a Tour</h2>
          <p className="text-muted-foreground text-sm">
            Step {step} of 3 — {STEP_LABELS[step - 1]}
          </p>
        </div>
      </div>

      {/* Progress */}
      <div className="flex gap-2">
        {STEP_LABELS.map((_, i) => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${step >= i + 1 ? 'bg-primary' : 'bg-muted'}`} />
        ))}
      </div>

      {/* Step 1: Basics */}
      {step === 1 && (
        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="tour-title">Tour Name</Label>
            <Input
              id="tour-title"
              placeholder="e.g., Seasonal Farm Walk, Food Forest Discovery Tour"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              maxLength={100}
            />
            <p className="text-xs text-muted-foreground">
              Give your tour a name visitors will remember
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tour-desc">Description</Label>
            <Textarea
              id="tour-desc"
              placeholder="What will visitors see and learn on this tour? What makes it special?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">
              {description.length}/500 — This shows on the tour landing page
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cover-img" className="flex items-center gap-1.5">
              <Image className="h-3.5 w-3.5" />
              Cover Image URL (optional)
            </Label>
            <Input
              id="cover-img"
              placeholder="https://example.com/my-farm-photo.jpg"
              value={coverImageUrl}
              onChange={(e) => setCoverImageUrl(e.target.value)}
              type="url"
            />
            <p className="text-xs text-muted-foreground">
              A photo to display on the tour landing page
            </p>
          </div>

          <div className="flex justify-end">
            <Button onClick={() => setStep(2)} disabled={!title.trim()}>
              Continue
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Experience */}
      {step === 2 && (
        <div className="space-y-5">
          {/* Difficulty */}
          <div className="space-y-3">
            <Label>Difficulty Level</Label>
            <div className="flex gap-2">
              {([
                { value: 'easy' as const, icon: Footprints, label: 'Easy', desc: 'Flat, accessible paths' },
                { value: 'moderate' as const, icon: TreePine, label: 'Moderate', desc: 'Some uneven terrain' },
                { value: 'challenging' as const, icon: Mountain, label: 'Challenging', desc: 'Steep hills, rough ground' },
              ]).map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setDifficulty(opt.value)}
                  className={`flex-1 flex flex-col items-center gap-1 px-3 py-3 rounded-lg border text-sm transition-colors ${
                    difficulty === opt.value
                      ? 'border-primary bg-primary/5 font-medium'
                      : 'border-border hover:border-muted-foreground/30'
                  }`}
                >
                  <opt.icon className="h-5 w-5" />
                  <span className="font-medium">{opt.label}</span>
                  <span className="text-[10px] text-muted-foreground">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Seasonal Notes */}
          <div className="space-y-2">
            <Label htmlFor="seasonal" className="flex items-center gap-1.5">
              <Sun className="h-3.5 w-3.5" />
              Seasonal Notes (optional)
            </Label>
            <Textarea
              id="seasonal"
              placeholder="e.g., Best visited in spring when the wildflowers bloom. The food forest is especially interesting in late summer."
              value={seasonalNotes}
              onChange={(e) => setSeasonalNotes(e.target.value)}
              rows={2}
            />
          </div>

          {/* Welcome Message */}
          <div className="space-y-2">
            <Label htmlFor="welcome-msg" className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              Welcome Message (optional)
            </Label>
            <Textarea
              id="welcome-msg"
              placeholder="Welcome! We're glad you're here. A few things to know before you start..."
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Shown when visitors first arrive — great for safety tips or parking info
            </p>
          </div>

          {/* Completion Message */}
          <div className="space-y-2">
            <Label htmlFor="done-msg">Completion Message (optional)</Label>
            <Textarea
              id="done-msg"
              placeholder="Thanks for visiting! We hope you enjoyed the tour. Come back anytime."
              value={completionMessage}
              onChange={(e) => setCompletionMessage(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
            <Button onClick={() => setStep(3)}>Continue</Button>
          </div>
        </div>
      )}

      {/* Step 3: Access */}
      {step === 3 && (
        <div className="space-y-5">
          <div className="space-y-3">
            <Label>Who can access this tour?</Label>
            <div className="grid gap-2">
              {([
                { value: 'public' as const, icon: Globe, label: 'Public', desc: 'Anyone can find and take this tour' },
                { value: 'link_only' as const, icon: LinkIcon, label: 'Link Only', desc: 'Only people with the link can access' },
                { value: 'password' as const, icon: Lock, label: 'Password Protected', desc: 'Visitors need a password to enter' },
              ]).map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setAccessType(opt.value)}
                  className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                    accessType === opt.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-muted-foreground/30'
                  }`}
                >
                  <opt.icon className={`h-5 w-5 shrink-0 ${accessType === opt.value ? 'text-primary' : 'text-muted-foreground'}`} />
                  <div>
                    <p className="text-sm font-medium">{opt.label}</p>
                    <p className="text-xs text-muted-foreground">{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>
            {accessType === 'password' && (
              <div className="space-y-1.5 pl-8">
                <Label htmlFor="tour-pw">Tour Password</Label>
                <Input
                  id="tour-pw"
                  type="text"
                  placeholder="Enter a password for visitors"
                  value={accessPassword}
                  onChange={(e) => setAccessPassword(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Summary Preview */}
          <div className="border rounded-xl p-4 bg-muted/30">
            <h3 className="text-sm font-semibold mb-2">Tour Summary</h3>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <dt className="text-muted-foreground">Name</dt>
              <dd className="font-medium truncate">{title}</dd>
              <dt className="text-muted-foreground">Difficulty</dt>
              <dd className="capitalize">{difficulty}</dd>
              <dt className="text-muted-foreground">Access</dt>
              <dd className="capitalize">{accessType.replace('_', ' ')}</dd>
            </dl>
          </div>

          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep(2)}>Back</Button>
            <Button
              onClick={handleCreate}
              disabled={saving || !title.trim() || (accessType === 'password' && !accessPassword.trim())}
              className="gap-2"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Create Tour & Add Stops
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
