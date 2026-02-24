'use client';

interface StorySeasonsProps {
  title: string;
  content: string;
  theme: string;
}

const SEASONS = [
  { name: 'Spring', color: 'from-green-400 to-emerald-500', icon: '🌱', bg: 'bg-green-50 dark:bg-green-950/20' },
  { name: 'Summer', color: 'from-amber-400 to-yellow-500', icon: '☀️', bg: 'bg-amber-50 dark:bg-amber-950/20' },
  { name: 'Autumn', color: 'from-orange-400 to-red-500', icon: '🍂', bg: 'bg-orange-50 dark:bg-orange-950/20' },
  { name: 'Winter', color: 'from-blue-400 to-indigo-500', icon: '❄️', bg: 'bg-blue-50 dark:bg-blue-950/20' },
];

export function StorySeasonsSection({ title, content, theme }: StorySeasonsProps) {
  // Try to split content into 4 season paragraphs (by double newline or by searching for season names)
  const paragraphs = content.split(/\n\n+/).filter(p => p.trim());

  // If we have exactly 4 paragraphs, map them to seasons
  const seasonTexts = paragraphs.length >= 4
    ? paragraphs.slice(0, 4)
    : [content, '', '', ''];

  return (
    <section className="py-16 sm:py-20">
      <div className="max-w-4xl mx-auto px-6 sm:px-8">
        <h2 className="text-2xl sm:text-3xl font-serif font-bold mb-8 text-center">{title}</h2>

        {paragraphs.length >= 4 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {SEASONS.map((season, i) => (
              <div
                key={season.name}
                className={`rounded-xl p-6 ${season.bg} transition-shadow hover:shadow-md`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">{season.icon}</span>
                  <h3 className="font-semibold text-lg">{season.name}</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {seasonTexts[i]}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="prose prose-lg text-muted-foreground max-w-2xl mx-auto">
            {paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
