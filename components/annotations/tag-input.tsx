'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  farmId: string; // For auto-suggest
}

export function TagInput({ value, onChange, farmId }: TagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // Load existing tags for auto-suggest
  useEffect(() => {
    async function loadExistingTags() {
      try {
        const response = await fetch(`/api/farms/${farmId}/annotations`);
        const data = await response.json();

        const allTags = new Set<string>();
        data.annotations.forEach((annotation: any) => {
          if (annotation.tags) {
            annotation.tags.forEach((tag: string) => allTags.add(tag));
          }
        });

        setSuggestions(Array.from(allTags));
      } catch (error) {
        console.error('Failed to load tags:', error);
      }
    }

    loadExistingTags();
  }, [farmId]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      const newTag = inputValue.trim().toLowerCase();

      if (!value.includes(newTag)) {
        onChange([...value, newTag]);
      }

      setInputValue('');
    }
  }

  function removeTag(tagToRemove: string) {
    onChange(value.filter(tag => tag !== tagToRemove));
  }

  const filteredSuggestions = suggestions.filter(
    s => s.includes(inputValue.toLowerCase()) && !value.includes(s)
  );

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 mb-2">
        {value.map(tag => (
          <Badge key={tag} variant="secondary" className="gap-1">
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="ml-1 hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>

      <Input
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type a tag and press Enter..."
        className="text-sm"
      />

      {/* Auto-suggest */}
      {inputValue && filteredSuggestions.length > 0 && (
        <div className="border rounded-md p-2 space-y-1">
          <p className="text-xs text-muted-foreground mb-1">Suggestions:</p>
          {filteredSuggestions.slice(0, 5).map(suggestion => (
            <button
              key={suggestion}
              type="button"
              onClick={() => {
                if (!value.includes(suggestion)) {
                  onChange([...value, suggestion]);
                }
                setInputValue('');
              }}
              className="block w-full text-left px-2 py-1 text-sm hover:bg-accent rounded"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
