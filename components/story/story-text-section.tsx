'use client';

interface StoryTextSectionProps {
  title: string;
  content: string;
  mediaUrl?: string | null;
  accent?: boolean;
  theme: string;
  farmStats?: {
    acres?: number | null;
    climateZone?: string | null;
    soilType?: string | null;
  };
}

const THEME_ACCENTS: Record<string, string> = {
  earth: 'bg-amber-50 dark:bg-amber-950/20',
  meadow: 'bg-lime-50 dark:bg-lime-950/20',
  forest: 'bg-emerald-50 dark:bg-emerald-950/20',
  water: 'bg-sky-50 dark:bg-sky-950/20',
};

export function StoryTextSection({
  title,
  content,
  mediaUrl,
  accent,
  theme,
  farmStats,
}: StoryTextSectionProps) {
  const bgClass = accent ? (THEME_ACCENTS[theme] || THEME_ACCENTS.earth) : '';

  return (
    <section className={`py-16 sm:py-20 ${bgClass}`}>
      <div className="max-w-3xl mx-auto px-6 sm:px-8">
        <div className={mediaUrl ? 'md:grid md:grid-cols-5 md:gap-10 items-center' : ''}>
          <div className={mediaUrl ? 'md:col-span-3' : ''}>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold mb-6">{title}</h2>
            <div className="prose prose-lg text-muted-foreground leading-relaxed space-y-4">
              {content.split('\n').map((paragraph, i) => (
                paragraph.trim() ? <p key={i}>{paragraph}</p> : null
              ))}
            </div>
            {farmStats && (
              <div className="flex flex-wrap gap-4 mt-6 pt-6 border-t">
                {farmStats.acres && (
                  <div>
                    <div className="text-2xl font-bold">{farmStats.acres}</div>
                    <div className="text-xs text-muted-foreground">Acres</div>
                  </div>
                )}
                {farmStats.climateZone && (
                  <div>
                    <div className="text-2xl font-bold">{farmStats.climateZone}</div>
                    <div className="text-xs text-muted-foreground">Climate Zone</div>
                  </div>
                )}
                {farmStats.soilType && (
                  <div>
                    <div className="text-2xl font-bold capitalize">{farmStats.soilType}</div>
                    <div className="text-xs text-muted-foreground">Soil Type</div>
                  </div>
                )}
              </div>
            )}
          </div>
          {mediaUrl && (
            <div className="md:col-span-2 mt-8 md:mt-0">
              <img
                src={mediaUrl}
                alt={title}
                className="rounded-xl shadow-lg w-full object-cover aspect-[4/3]"
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
