'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface StoryHeroSectionProps {
  farmName: string;
  tagline: string;
  imageUrl: string | null;
  owner: { name: string; image: string | null };
  theme: string;
}

const THEME_GRADIENTS: Record<string, string> = {
  earth: 'from-amber-900/30 via-transparent to-amber-950/70',
  meadow: 'from-lime-900/30 via-transparent to-lime-950/70',
  forest: 'from-emerald-900/30 via-transparent to-emerald-950/70',
  water: 'from-sky-900/30 via-transparent to-sky-950/70',
};

export function StoryHeroSection({ farmName, tagline, imageUrl, owner, theme }: StoryHeroSectionProps) {
  const gradient = THEME_GRADIENTS[theme] || THEME_GRADIENTS.earth;

  return (
    <section className="relative w-full h-[85vh] min-h-[500px] max-h-[900px] overflow-hidden">
      {/* Background image */}
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={farmName}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-green-800 to-emerald-900" />
      )}

      {/* Gradient overlay */}
      <div className={`absolute inset-0 bg-gradient-to-b ${gradient}`} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

      {/* Content */}
      <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-10 md:p-16">
        <div className="max-w-3xl">
          <div className="flex items-center gap-3 mb-4">
            <Avatar className="h-10 w-10 border-2 border-white/40">
              <AvatarImage src={owner.image || undefined} />
              <AvatarFallback className="text-sm bg-white/20 text-white">
                {owner.name?.[0]?.toUpperCase() || 'F'}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm text-white/80 font-medium">{owner.name}</span>
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif font-bold text-white mb-3 drop-shadow-lg">
            {farmName}
          </h1>
          {tagline && (
            <p className="text-lg sm:text-xl text-white/90 font-light max-w-xl drop-shadow">
              {tagline}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
