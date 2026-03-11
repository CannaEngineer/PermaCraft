'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  ArrowLeft,
  Loader2,
  MapPin,
  Flower2,
  Droplets,
  Home,
  TreePine,
  Dog,
  Recycle,
  Flag,
  Star,
  Milestone,
  Save,
  Sparkles,
  Navigation,
  Monitor,
  HelpCircle,
  Plus,
  Trash2,
} from 'lucide-react';
import type { TourStop, TourStopType, TourType, VirtualMediaType } from '@/lib/db/schema';

const STOP_TYPES: { value: TourStopType; label: string; icon: typeof MapPin }[] = [
  { value: 'point_of_interest', label: 'Point of Interest', icon: Star },
  { value: 'garden_bed', label: 'Garden Bed', icon: Flower2 },
  { value: 'water_feature', label: 'Water Feature', icon: Droplets },
  { value: 'structure', label: 'Structure', icon: Home },
  { value: 'food_forest', label: 'Food Forest', icon: TreePine },
  { value: 'animal_area', label: 'Animal Area', icon: Dog },
  { value: 'composting', label: 'Composting', icon: Recycle },
  { value: 'welcome', label: 'Welcome Point', icon: Flag },
  { value: 'farewell', label: 'Farewell Point', icon: Milestone },
  { value: 'custom', label: 'Custom', icon: MapPin },
];

const VIRTUAL_MEDIA_TYPES: { value: VirtualMediaType; label: string }[] = [
  { value: 'photo', label: 'Photo' },
  { value: 'video', label: 'Video' },
  { value: 'photo_360', label: '360 Photo' },
  { value: 'video_360', label: '360 Video' },
  { value: 'embed', label: 'Embed (YouTube, etc.)' },
];

interface TourStopEditorProps {
  farmId: string;
  tourId: string;
  stopId: string | null;
  tourType?: TourType;
  onSaved: () => void;
  onCancel: () => void;
}

export function TourStopEditor({ farmId, tourId, stopId, tourType = 'in_person', onSaved, onCancel }: TourStopEditorProps) {
  const isNew = !stopId;
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [aiEnhancing, setAiEnhancing] = useState(false);

  // Basic fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [stopType, setStopType] = useState<TourStopType>('point_of_interest');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState('3');
  const [isOptional, setIsOptional] = useState(false);
  const [seasonalNotes, setSeasonalNotes] = useState('');

  // Navigation fields (in-person)
  const [navigationHint, setNavigationHint] = useState('');
  const [directionFromPrevious, setDirectionFromPrevious] = useState('');

  // Virtual media fields
  const [virtualMediaUrl, setVirtualMediaUrl] = useState('');
  const [virtualMediaType, setVirtualMediaType] = useState<VirtualMediaType>('photo');

  // Quiz fields
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizQuestion, setQuizQuestion] = useState('');
  const [quizOptions, setQuizOptions] = useState<string[]>(['', '', '']);
  const [quizAnswerIndex, setQuizAnswerIndex] = useState(0);

  const isInPerson = tourType === 'in_person';
  const isVirtual = tourType === 'virtual';

  useEffect(() => {
    if (!isNew && stopId) {
      (async () => {
        try {
          const res = await fetch(`/api/farms/${farmId}/tours/${tourId}`);
          if (res.ok) {
            const data = await res.json();
            const stop = data.stops.find((s: TourStop) => s.id === stopId);
            if (stop) {
              setTitle(stop.title);
              setDescription(stop.description || '');
              setStopType(stop.stop_type);
              setLat(stop.lat != null ? String(stop.lat) : '');
              setLng(stop.lng != null ? String(stop.lng) : '');
              setEstimatedMinutes(String(stop.estimated_time_minutes));
              setIsOptional(stop.is_optional === 1);
              setSeasonalNotes(stop.seasonal_visibility || '');
              setNavigationHint(stop.navigation_hint || '');
              setDirectionFromPrevious(stop.direction_from_previous || '');
              setVirtualMediaUrl(stop.virtual_media_url || '');
              setVirtualMediaType(stop.virtual_media_type || 'photo');
              if (stop.quiz_question) {
                setShowQuiz(true);
                setQuizQuestion(stop.quiz_question);
                try {
                  setQuizOptions(JSON.parse(stop.quiz_options || '["","",""]'));
                } catch {
                  setQuizOptions(['', '', '']);
                }
                setQuizAnswerIndex(stop.quiz_answer_index || 0);
              }
            }
          }
        } catch (err) {
          console.error('Failed to fetch stop:', err);
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [isNew, stopId, farmId, tourId]);

  const handleAiEnhance = async () => {
    if (!title.trim()) {
      alert('Add a title first so the AI has context');
      return;
    }
    setAiEnhancing(true);
    try {
      // Use the tour generate endpoint's model to enhance a single stop
      const res = await fetch(`/api/farms/${farmId}/tours/${tourId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          additionalContext: `Focus only on enhancing the stop titled "${title}" of type "${stopType}". ${description ? `Current description: ${description}` : ''}`,
        }),
      });
      // This generates the full tour, but we can extract just the matching stop
      if (res.ok) {
        const data = await res.json();
        const matchingStop = data.stops?.find((s: any) =>
          s.title.toLowerCase().includes(title.toLowerCase()) ||
          title.toLowerCase().includes(s.title.toLowerCase())
        );
        if (matchingStop) {
          if (matchingStop.description && !description) setDescription(matchingStop.description);
          if (matchingStop.navigation_hint && !navigationHint) setNavigationHint(matchingStop.navigation_hint);
          if (matchingStop.direction_from_previous && !directionFromPrevious) setDirectionFromPrevious(matchingStop.direction_from_previous);
          if (matchingStop.seasonal_visibility && !seasonalNotes) setSeasonalNotes(matchingStop.seasonal_visibility);
          if (matchingStop.quiz_question && !quizQuestion) {
            setShowQuiz(true);
            setQuizQuestion(matchingStop.quiz_question);
            if (matchingStop.quiz_options) setQuizOptions(matchingStop.quiz_options);
            if (matchingStop.quiz_answer_index != null) setQuizAnswerIndex(matchingStop.quiz_answer_index);
          }
        }
      }
    } catch {
      // Silent fail
    } finally {
      setAiEnhancing(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);

    const body: Record<string, any> = {
      title: title.trim(),
      description: description.trim() || null,
      stop_type: stopType,
      lat: lat ? parseFloat(lat) : null,
      lng: lng ? parseFloat(lng) : null,
      estimated_time_minutes: parseInt(estimatedMinutes) || 3,
      is_optional: isOptional ? 1 : 0,
      seasonal_visibility: seasonalNotes.trim() || null,
      navigation_hint: navigationHint.trim() || null,
      direction_from_previous: directionFromPrevious.trim() || null,
    };

    if (isVirtual && virtualMediaUrl.trim()) {
      body.virtual_media_url = virtualMediaUrl.trim();
      body.virtual_media_type = virtualMediaType;
    }

    if (showQuiz && quizQuestion.trim()) {
      body.quiz_question = quizQuestion.trim();
      body.quiz_options = JSON.stringify(quizOptions.filter(o => o.trim()));
      body.quiz_answer_index = quizAnswerIndex;
    } else {
      body.quiz_question = null;
      body.quiz_options = null;
      body.quiz_answer_index = null;
    }

    try {
      const url = isNew
        ? `/api/farms/${farmId}/tours/${tourId}/stops`
        : `/api/farms/${farmId}/tours/${tourId}/stops/${stopId}`;

      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const text = await res.text();
        alert(`Failed to save: ${text}`);
        return;
      }

      onSaved();
    } catch {
      alert('Failed to save stop');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onCancel} className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-xl font-bold tracking-tight">
            {isNew ? 'Add Tour Stop' : 'Edit Stop'}
          </h2>
        </div>
      </div>

      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="stop-title">Stop Name</Label>
        <Input
          id="stop-title"
          placeholder="e.g., The Herb Spiral, Main Pond, Apple Guild"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
          maxLength={100}
        />
      </div>

      {/* Stop Type */}
      <div className="space-y-2">
        <Label>Type</Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {STOP_TYPES.map(type => (
            <button
              key={type.value}
              onClick={() => setStopType(type.value)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm text-left transition-colors ${
                stopType === type.value
                  ? 'border-primary bg-primary/5 font-medium'
                  : 'border-border hover:border-muted-foreground/30'
              }`}
            >
              <type.icon className={`h-4 w-4 shrink-0 ${stopType === type.value ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className="truncate">{type.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="stop-desc">Description</Label>
        <Textarea
          id="stop-desc"
          placeholder="What will visitors see here? Share the story behind this spot."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          maxLength={1000}
        />
        <p className="text-xs text-muted-foreground">{description.length}/1000</p>
      </div>

      {/* Navigation Section (In-Person only) */}
      {isInPerson && (
        <div className="border rounded-xl p-4 space-y-4 bg-blue-50/30 dark:bg-blue-950/10">
          <div className="flex items-center gap-2">
            <Navigation className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <Label className="text-sm font-semibold">Navigation & Directions</Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nav-hint" className="text-xs text-muted-foreground">
              Navigation Hint
            </Label>
            <Input
              id="nav-hint"
              placeholder="e.g., Look for the tall oak tree with the birdhouse"
              value={navigationHint}
              onChange={(e) => setNavigationHint(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="directions" className="text-xs text-muted-foreground">
              Walking Directions from Previous Stop
            </Label>
            <Textarea
              id="directions"
              placeholder="e.g., Head north along the mulched path for about 30 meters. Turn left at the compost bins."
              value={directionFromPrevious}
              onChange={(e) => setDirectionFromPrevious(e.target.value)}
              rows={2}
            />
          </div>
        </div>
      )}

      {/* Virtual Media Section (Virtual only) */}
      {isVirtual && (
        <div className="border rounded-xl p-4 space-y-4 bg-purple-50/30 dark:bg-purple-950/10">
          <div className="flex items-center gap-2">
            <Monitor className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            <Label className="text-sm font-semibold">Virtual Tour Media</Label>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Media Type</Label>
            <div className="flex flex-wrap gap-2">
              {VIRTUAL_MEDIA_TYPES.map(t => (
                <button
                  key={t.value}
                  onClick={() => setVirtualMediaType(t.value)}
                  className={`px-3 py-1.5 rounded-lg border text-xs transition-colors ${
                    virtualMediaType === t.value
                      ? 'border-purple-400 bg-purple-50 dark:bg-purple-900/20 font-medium'
                      : 'border-border hover:border-muted-foreground/30'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="media-url" className="text-xs text-muted-foreground">
              Media URL
            </Label>
            <Input
              id="media-url"
              placeholder={virtualMediaType === 'embed'
                ? 'https://youtube.com/embed/...'
                : 'https://example.com/photo.jpg'}
              value={virtualMediaUrl}
              onChange={(e) => setVirtualMediaUrl(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Location */}
      <div className="space-y-2">
        <Label>Map Location (optional)</Label>
        <p className="text-xs text-muted-foreground mb-2">
          Add coordinates to show this stop on the tour map
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="stop-lat" className="text-xs text-muted-foreground">Latitude</Label>
            <Input
              id="stop-lat"
              type="number"
              step="any"
              placeholder="e.g., 37.7749"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="stop-lng" className="text-xs text-muted-foreground">Longitude</Label>
            <Input
              id="stop-lng"
              type="number"
              step="any"
              placeholder="e.g., -122.4194"
              value={lng}
              onChange={(e) => setLng(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Estimated Time */}
      <div className="space-y-2">
        <Label htmlFor="stop-time">Estimated Time at Stop</Label>
        <div className="flex items-center gap-2">
          <Input
            id="stop-time"
            type="number"
            min="1"
            max="60"
            value={estimatedMinutes}
            onChange={(e) => setEstimatedMinutes(e.target.value)}
            className="w-20"
          />
          <span className="text-sm text-muted-foreground">minutes</span>
        </div>
      </div>

      {/* Optional toggle */}
      <div className="flex items-center justify-between">
        <div>
          <Label>Optional Stop</Label>
          <p className="text-xs text-muted-foreground">Visitors can skip this stop</p>
        </div>
        <Switch checked={isOptional} onCheckedChange={setIsOptional} />
      </div>

      {/* Quiz Section */}
      <div className="border rounded-xl p-4 space-y-4 bg-amber-50/30 dark:bg-amber-950/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <Label className="text-sm font-semibold">Quiz Question (optional)</Label>
          </div>
          <Switch checked={showQuiz} onCheckedChange={setShowQuiz} />
        </div>

        {showQuiz && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="quiz-q" className="text-xs">Question</Label>
              <Input
                id="quiz-q"
                placeholder="e.g., How many species are in a food forest guild?"
                value={quizQuestion}
                onChange={(e) => setQuizQuestion(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Answer Options</Label>
              {quizOptions.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <button
                    onClick={() => setQuizAnswerIndex(i)}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                      quizAnswerIndex === i
                        ? 'border-green-500 bg-green-500 text-white'
                        : 'border-muted-foreground/30'
                    }`}
                  >
                    {quizAnswerIndex === i && <span className="text-xs">&#10003;</span>}
                  </button>
                  <Input
                    placeholder={`Option ${i + 1}`}
                    value={opt}
                    onChange={(e) => {
                      const next = [...quizOptions];
                      next[i] = e.target.value;
                      setQuizOptions(next);
                    }}
                    className="text-sm"
                  />
                  {quizOptions.length > 2 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() => {
                        const next = quizOptions.filter((_, j) => j !== i);
                        setQuizOptions(next);
                        if (quizAnswerIndex >= next.length) setQuizAnswerIndex(0);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
              {quizOptions.length < 5 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-xs"
                  onClick={() => setQuizOptions([...quizOptions, ''])}
                >
                  <Plus className="h-3 w-3" />
                  Add Option
                </Button>
              )}
              <p className="text-xs text-muted-foreground">
                Click the circle to mark the correct answer
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Seasonal Notes */}
      <div className="space-y-2">
        <Label htmlFor="stop-season">Seasonal Notes (optional)</Label>
        <Input
          id="stop-season"
          placeholder="e.g., Best in spring when the wildflowers bloom"
          value={seasonalNotes}
          onChange={(e) => setSeasonalNotes(e.target.value)}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-between pt-2">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleSave} disabled={saving || !title.trim()} className="gap-1.5">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isNew ? 'Add Stop' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
