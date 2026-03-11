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
  Monitor,
  Map,
  Sparkles,
  Car,
  Bike,
} from 'lucide-react';
import type { FarmTour, TourAccessType, TourDifficulty, TourType, TourRouteMode } from '@/lib/db/schema';

interface TourCreatorProps {
  farmId: string;
  onCreated: (tour: FarmTour) => void;
  onCancel: () => void;
}

export function TourCreator({ farmId, onCreated, onCancel }: TourCreatorProps) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);

  // Step 1: Tour Type
  const [tourType, setTourType] = useState<TourType>('in_person');

  // Step 2: Basics
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // Step 3: Settings
  const [accessType, setAccessType] = useState<TourAccessType>('public');
  const [accessPassword, setAccessPassword] = useState('');
  const [difficulty, setDifficulty] = useState<TourDifficulty>('easy');
  const [routeMode, setRouteMode] = useState<TourRouteMode>('walking');
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [completionMessage, setCompletionMessage] = useState('');
  const [aiContext, setAiContext] = useState('');
  const [useAi, setUseAi] = useState(false);

  const totalSteps = 3;

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
          access_type: accessType,
          access_password: accessType === 'password' ? accessPassword : null,
          difficulty,
          tour_type: tourType,
          route_mode: tourType === 'in_person' ? routeMode : null,
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

      // If AI assist is enabled, generate stops
      if (useAi) {
        setAiGenerating(true);
        try {
          const genRes = await fetch(`/api/farms/${farmId}/tours/${tour.id}/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              additionalContext: aiContext.trim() || undefined,
            }),
          });
          if (genRes.ok) {
            const genData = await genRes.json();
            // Use the AI-updated tour data
            onCreated(genData.tour);
            return;
          }
        } catch {
          // If AI fails, still proceed with the empty tour
        } finally {
          setAiGenerating(false);
        }
      }

      onCreated(tour);
    } catch (err) {
      alert('Failed to create tour');
    } finally {
      setSaving(false);
    }
  };

  const isLoading = saving || aiGenerating;

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
            Step {step} of {totalSteps} —{' '}
            {step === 1 ? 'Tour type' : step === 2 ? 'Name & description' : 'Settings & AI'}
          </p>
        </div>
      </div>

      {/* Progress */}
      <div className="flex gap-2">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div key={i} className={`h-1 flex-1 rounded-full ${step >= i + 1 ? 'bg-primary' : 'bg-muted'}`} />
        ))}
      </div>

      {/* Step 1: Tour Type */}
      {step === 1 && (
        <div className="space-y-5">
          <div className="space-y-3">
            <Label>What kind of tour are you creating?</Label>
            <div className="grid gap-3">
              <button
                onClick={() => setTourType('in_person')}
                className={`flex items-start gap-4 p-4 rounded-xl border text-left transition-all ${
                  tourType === 'in_person'
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                    : 'border-border hover:border-muted-foreground/30'
                }`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                  tourType === 'in_person' ? 'bg-primary/10' : 'bg-muted'
                }`}>
                  <Map className={`h-6 w-6 ${tourType === 'in_person' ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>
                <div>
                  <p className="font-semibold">In-Person Tour</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Visitors physically walk your farm with turn-by-turn navigation between waypoints.
                    Includes walking directions, distance tracking, and compass headings.
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Footprints className="h-3 w-3" /> Waypoint navigation</span>
                    <span className="flex items-center gap-1"><Map className="h-3 w-3" /> Live map</span>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setTourType('virtual')}
                className={`flex items-start gap-4 p-4 rounded-xl border text-left transition-all ${
                  tourType === 'virtual'
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                    : 'border-border hover:border-muted-foreground/30'
                }`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                  tourType === 'virtual' ? 'bg-primary/10' : 'bg-muted'
                }`}>
                  <Monitor className={`h-6 w-6 ${tourType === 'virtual' ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>
                <div>
                  <p className="font-semibold">Virtual Tour</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    An online experience visitors can take from anywhere. Rich with photos, videos,
                    and immersive descriptions of your farm.
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Monitor className="h-3 w-3" /> Rich media</span>
                    <span className="flex items-center gap-1"><Globe className="h-3 w-3" /> Accessible anywhere</span>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Route mode for in-person */}
          {tourType === 'in_person' && (
            <div className="space-y-3">
              <Label>How will visitors travel?</Label>
              <div className="flex gap-2">
                {([
                  { value: 'walking' as const, icon: Footprints, label: 'Walking' },
                  { value: 'cycling' as const, icon: Bike, label: 'Cycling' },
                  { value: 'driving' as const, icon: Car, label: 'Driving' },
                ]).map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setRouteMode(opt.value)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-colors ${
                      routeMode === opt.value
                        ? 'border-primary bg-primary/5 font-medium'
                        : 'border-border hover:border-muted-foreground/30'
                    }`}
                  >
                    <opt.icon className="h-4 w-4" />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={() => setStep(2)}>
              Continue
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Name & Description */}
      {step === 2 && (
        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="tour-title">Tour Name</Label>
            <Input
              id="tour-title"
              placeholder={tourType === 'in_person'
                ? 'e.g., Seasonal Farm Walk, Permaculture Discovery Trail'
                : 'e.g., Virtual Food Forest Tour, Farm From Home'}
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

          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
            <Button
              onClick={() => setStep(3)}
              disabled={!title.trim()}
            >
              Continue
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Settings & AI */}
      {step === 3 && (
        <div className="space-y-5">
          {/* AI Assist */}
          <div className="border rounded-xl p-4 space-y-3 bg-gradient-to-br from-violet-50/50 to-blue-50/50 dark:from-violet-950/20 dark:to-blue-950/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-violet-500" />
                <div>
                  <p className="font-semibold text-sm">AI Tour Builder</p>
                  <p className="text-xs text-muted-foreground">
                    Let AI create tour stops based on your farm's zones and plantings
                  </p>
                </div>
              </div>
              <button
                onClick={() => setUseAi(!useAi)}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  useAi ? 'bg-violet-500' : 'bg-muted'
                }`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                  useAi ? 'translate-x-5' : ''
                }`} />
              </button>
            </div>
            {useAi && (
              <div className="space-y-2 pt-1">
                <Label htmlFor="ai-context" className="text-xs">
                  Tell the AI about your tour (optional)
                </Label>
                <Textarea
                  id="ai-context"
                  placeholder="e.g., Focus on the food forest and water systems. Our visitors are mostly families with kids. We want them to learn about companion planting."
                  value={aiContext}
                  onChange={(e) => setAiContext(e.target.value)}
                  rows={3}
                  className="text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  The AI will use your farm data (zones, plantings, species) to generate relevant tour stops
                </p>
              </div>
            )}
          </div>

          {/* Access Type */}
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

          {/* Difficulty */}
          <div className="space-y-3">
            <Label>Difficulty Level</Label>
            <div className="flex gap-2">
              {([
                { value: 'easy' as const, icon: Footprints, label: 'Easy' },
                { value: 'moderate' as const, icon: TreePine, label: 'Moderate' },
                { value: 'challenging' as const, icon: Mountain, label: 'Challenging' },
              ]).map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setDifficulty(opt.value)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-colors ${
                    difficulty === opt.value
                      ? 'border-primary bg-primary/5 font-medium'
                      : 'border-border hover:border-muted-foreground/30'
                  }`}
                >
                  <opt.icon className="h-4 w-4" />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Welcome/Completion Messages (collapsed unless not using AI) */}
          {!useAi && (
            <>
              <div className="space-y-2">
                <Label htmlFor="welcome-msg">Welcome Message (optional)</Label>
                <Textarea
                  id="welcome-msg"
                  placeholder="Welcome! We're glad you're here. A few things to know before you start..."
                  value={welcomeMessage}
                  onChange={(e) => setWelcomeMessage(e.target.value)}
                  rows={3}
                />
              </div>
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
            </>
          )}

          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep(2)}>
              Back
            </Button>
            <Button
              onClick={handleCreate}
              disabled={isLoading || !title.trim() || (accessType === 'password' && !accessPassword.trim())}
              className="gap-2"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {aiGenerating ? 'AI is building your tour...' : useAi ? 'Create & Generate with AI' : 'Create Tour & Add Stops'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
