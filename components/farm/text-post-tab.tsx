'use client';

import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface TextPostTabProps {
  farmId: string;
  onPostCreated: () => void;
}

export function TextPostTab({ farmId, onPostCreated }: TextPostTabProps) {
  const [content, setContent] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim() || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/farms/${farmId}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'text',
          content: content.trim(),
          hashtags: hashtags
            .split(',')
            .map((h) => h.trim().replace(/^#/, ''))
            .filter(Boolean),
        }),
      });

      if (!res.ok) throw new Error('Failed to create post');

      setContent('');
      setHashtags('');
      onPostCreated();
    } catch (error) {
      console.error('Failed to create post:', error);
      alert('Failed to create post');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 pt-4">
      <div className="space-y-2">
        <Label>What's happening on your farm?</Label>
        <Textarea
          placeholder="Share an update, observation, or story..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={6}
          className="resize-none"
        />
      </div>

      <div className="space-y-2">
        <Label>Hashtags (optional)</Label>
        <Input
          placeholder="permaculture, gardening, composting"
          value={hashtags}
          onChange={(e) => setHashtags(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Comma-separated tags (# symbols are optional)
        </p>
      </div>

      <Button
        className="w-full"
        onClick={handleSubmit}
        disabled={!content.trim() || submitting}
      >
        {submitting ? 'Publishing...' : 'Publish Post'}
      </Button>
    </div>
  );
}
