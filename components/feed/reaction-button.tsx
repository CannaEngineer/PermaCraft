'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { HeartIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const REACTIONS = [
  { type: 'heart', emoji: '❤️', label: 'Love' },
  { type: 'seedling', emoji: '🌱', label: 'Inspired' },
  { type: 'bulb', emoji: '💡', label: 'Learned' },
  { type: 'fire', emoji: '🔥', label: 'Impressive' },
] as const;

type ReactionType = typeof REACTIONS[number]['type'];

interface ReactionButtonProps {
  currentReaction: string | null;
  reactionCount: number;
  onReact: (type: ReactionType) => Promise<void>;
  disabled?: boolean;
}

export function ReactionButton({
  currentReaction,
  reactionCount,
  onReact,
  disabled,
}: ReactionButtonProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [animating, setAnimating] = useState(false);

  const handleReact = async (type: ReactionType) => {
    setAnimating(true);
    setShowPicker(false);
    await onReact(type);
    setTimeout(() => setAnimating(false), 600);
  };

  const currentReactionEmoji = currentReaction
    ? REACTIONS.find((r) => r.type === currentReaction)?.emoji
    : null;

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowPicker(!showPicker)}
        disabled={disabled}
        className={cn(
          'gap-2',
          currentReaction && 'text-red-500 hover:text-red-600',
          animating && 'animate-bounce'
        )}
      >
        {currentReactionEmoji || <HeartIcon className="w-4 h-4" />}
        <span>{reactionCount > 0 ? reactionCount : 'React'}</span>
      </Button>

      {/* Reaction picker */}
      {showPicker && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowPicker(false)}
          />
          <div className="absolute bottom-full left-0 mb-2 bg-background border rounded-lg shadow-lg p-2 flex gap-1 z-20 animate-in fade-in zoom-in-95">
            {REACTIONS.map(({ type, emoji, label }) => (
              <button
                key={type}
                onClick={() => handleReact(type)}
                className="hover:scale-125 transition-transform p-2 rounded hover:bg-accent"
                title={label}
                disabled={disabled}
              >
                <span className="text-2xl">{emoji}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
