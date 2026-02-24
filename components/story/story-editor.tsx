'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles,
  Plus,
  ArrowLeft,
  Loader2,
  Globe,
  Palette,
} from 'lucide-react';
import Link from 'next/link';
import { StorySectionCard } from './story-section-card';
import type { FarmStorySection } from '@/lib/db/schema';

const THEME_OPTIONS = [
  { value: 'earth', label: 'Earth', color: 'bg-amber-700' },
  { value: 'meadow', label: 'Meadow', color: 'bg-lime-600' },
  { value: 'forest', label: 'Forest', color: 'bg-emerald-800' },
  { value: 'water', label: 'Water', color: 'bg-sky-600' },
];

interface StoryEditorProps {
  farmId: string;
  farmName: string;
  farmDescription: string | null;
  initialSections: FarmStorySection[];
  storyPublished: boolean;
  storyTheme: string;
}

export function StoryEditor({
  farmId,
  farmName,
  farmDescription,
  initialSections,
  storyPublished: initialPublished,
  storyTheme: initialTheme,
}: StoryEditorProps) {
  const [sections, setSections] = useState<FarmStorySection[]>(initialSections);
  const [published, setPublished] = useState(initialPublished);
  const [theme, setTheme] = useState(initialTheme);
  const [generating, setGenerating] = useState(false);
  const [farmerContext, setFarmerContext] = useState('');
  const [saving, setSaving] = useState(false);

  const hasSections = sections.length > 0;

  // Generate story with AI
  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    try {
      const res = await fetch(`/api/farms/${farmId}/story/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          additionalContext: farmerContext || undefined,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        alert(`Generation failed: ${text}`);
        return;
      }
      const data = await res.json();
      setSections(data.sections);
    } catch (err) {
      alert('Failed to generate story');
    } finally {
      setGenerating(false);
    }
  }, [farmId, farmerContext]);

  // Update section
  const handleUpdateSection = useCallback(async (sectionId: string, fields: Partial<FarmStorySection>) => {
    // Optimistic update
    setSections(prev =>
      prev.map(s => (s.id === sectionId ? { ...s, ...fields } : s))
    );

    try {
      await fetch(`/api/farms/${farmId}/story/${sectionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      });
    } catch (err) {
      console.error('Failed to update section:', err);
    }
  }, [farmId]);

  // Delete section
  const handleDeleteSection = useCallback(async (sectionId: string) => {
    setSections(prev => prev.filter(s => s.id !== sectionId));
    try {
      await fetch(`/api/farms/${farmId}/story/${sectionId}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.error('Failed to delete section:', err);
    }
  }, [farmId]);

  // Move section
  const handleMove = useCallback(async (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    setSections(prev => {
      const updated = [...prev];
      [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
      return updated;
    });

    // Persist new order
    const newOrder = sections.map(s => s.id);
    if (direction === 'up') {
      [newOrder[index], newOrder[newIndex]] = [newOrder[newIndex], newOrder[index]];
    } else {
      [newOrder[index], newOrder[newIndex]] = [newOrder[newIndex], newOrder[index]];
    }

    try {
      await fetch(`/api/farms/${farmId}/story/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: newOrder }),
      });
    } catch (err) {
      console.error('Failed to reorder:', err);
    }
  }, [farmId, sections]);

  // Toggle publish
  const handleTogglePublish = useCallback(async (value: boolean) => {
    setPublished(value);
    setSaving(true);
    try {
      await fetch(`/api/farms/${farmId}/story/publish`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ published: value ? 1 : 0 }),
      });
    } catch (err) {
      setPublished(!value);
      console.error('Failed to toggle publish:', err);
    } finally {
      setSaving(false);
    }
  }, [farmId]);

  // Change theme
  const handleThemeChange = useCallback(async (newTheme: string) => {
    setTheme(newTheme);
    try {
      await fetch(`/api/farms/${farmId}/story/publish`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: newTheme }),
      });
    } catch (err) {
      console.error('Failed to update theme:', err);
    }
  }, [farmId]);

  // Add custom section
  const handleAddCustomSection = useCallback(async () => {
    try {
      const res = await fetch(`/api/farms/${farmId}/story`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section_type: 'custom',
          title: 'Custom Section',
          content: '',
        }),
      });
      if (res.ok) {
        const section = await res.json();
        setSections(prev => [...prev, section]);
      }
    } catch (err) {
      console.error('Failed to add section:', err);
    }
  }, [farmId]);

  // Regenerate single section
  const handleRegenerate = useCallback(async (sectionId: string) => {
    // For now, regenerate all and keep the section in question
    handleGenerate();
  }, [handleGenerate]);

  return (
    <div className="max-w-3xl mx-auto pb-20 md:pb-6">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href={`/farm/${farmId}`}>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-base truncate">{farmName} Story</h1>
            <p className="text-xs text-muted-foreground">Tell your farm&apos;s story</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-muted-foreground" />
              <Switch
                checked={published}
                onCheckedChange={handleTogglePublish}
                disabled={saving || !hasSections}
              />
              <Label className="text-xs">
                {published ? 'Published' : 'Draft'}
              </Label>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Theme picker */}
        {hasSections && (
          <div className="flex items-center gap-3">
            <Palette className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Theme:</span>
            <div className="flex gap-2">
              {THEME_OPTIONS.map(t => (
                <button
                  key={t.value}
                  onClick={() => handleThemeChange(t.value)}
                  className={`w-8 h-8 rounded-full ${t.color} transition-all ${
                    theme === t.value
                      ? 'ring-2 ring-offset-2 ring-primary scale-110'
                      : 'opacity-60 hover:opacity-100'
                  }`}
                  title={t.label}
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!hasSections && (
          <div className="text-center py-16 space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold">Tell Your Farm&apos;s Story</h2>
            <p className="text-muted-foreground max-w-md mx-auto text-sm">
              Let AI craft a beautiful narrative about your farm using your zones, plantings, and farm data.
              You can edit everything after generation.
            </p>
            <div className="max-w-md mx-auto space-y-3">
              <Textarea
                value={farmerContext}
                onChange={(e) => setFarmerContext(e.target.value)}
                placeholder="Optional: Tell us about your farm in your own words — how it started, what inspires you, your vision..."
                className="text-sm min-h-[80px]"
              />
              <Button
                onClick={handleGenerate}
                disabled={generating}
                className="gap-2"
                size="lg"
              >
                {generating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                {generating ? 'Generating...' : 'Generate Story with AI'}
              </Button>
            </div>
          </div>
        )}

        {/* Section list */}
        {hasSections && (
          <div className="space-y-3">
            {sections.map((section, index) => (
              <StorySectionCard
                key={section.id}
                section={section}
                onUpdate={handleUpdateSection}
                onDelete={handleDeleteSection}
                onMoveUp={() => handleMove(index, 'up')}
                onMoveDown={() => handleMove(index, 'down')}
                onRegenerate={handleRegenerate}
                isFirst={index === 0}
                isLast={index === sections.length - 1}
              />
            ))}
          </div>
        )}

        {/* Bottom actions */}
        {hasSections && (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={handleAddCustomSection}
            >
              <Plus className="w-3.5 h-3.5" />
              Add Custom Section
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={handleGenerate}
              disabled={generating}
            >
              {generating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              Regenerate All
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
