'use client';

interface StoryProgressIndicatorProps {
  totalCards: number;
  activeCard: number;
  labels: string[];
}

export function StoryProgressIndicator({ totalCards, activeCard, labels }: StoryProgressIndicatorProps) {
  return (
    <div className="fixed right-4 top-1/2 -translate-y-1/2 z-40 hidden md:flex flex-col items-center gap-2">
      {Array.from({ length: totalCards }, (_, i) => (
        <button
          key={i}
          className="group flex items-center gap-2"
          onClick={() => {
            const sections = document.querySelectorAll('[data-story-card]');
            sections[i]?.scrollIntoView({ behavior: 'smooth' });
          }}
          aria-label={`Go to ${labels[i] || `card ${i + 1}`}`}
        >
          <span className={`text-xs transition-opacity ${
            i === activeCard ? 'opacity-100 font-medium' : 'opacity-0 group-hover:opacity-70'
          }`}>
            {labels[i]}
          </span>
          <div
            className={`rounded-full transition-all ${
              i === activeCard
                ? 'w-3 h-3 bg-primary'
                : 'w-2 h-2 bg-muted-foreground/30 group-hover:bg-muted-foreground/60'
            }`}
          />
        </button>
      ))}
    </div>
  );
}
