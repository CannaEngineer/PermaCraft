'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Sprout, Sun, Droplets, MapPin, Ruler, Clock } from 'lucide-react';
import { STORY_TYPOGRAPHY } from '@/lib/design/plant-story-tokens';
import type { Species, SpeciesContent } from '@/lib/db/schema';

interface HowToGrowCardProps {
  species: Species;
  content: SpeciesContent | null;
}

export function HowToGrowCard({ species, content }: HowToGrowCardProps) {
  const hasAIGuide = content?.growing_guide || content?.growing_guide_summary;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Sprout className="w-6 h-6 text-green-600" />
          <span className={STORY_TYPOGRAPHY.label}>Growing Guide</span>
        </div>
        <h2 className={STORY_TYPOGRAPHY.cardTitle}>
          How to Grow {species.common_name}
        </h2>
      </div>

      {hasAIGuide ? (
        <div className="space-y-4">
          {content?.growing_guide_summary && (
            <div className="rounded-xl border bg-green-50/50 dark:bg-green-950/20 p-4">
              <h3 className="text-sm font-semibold mb-2">Quick Reference</h3>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {content.growing_guide_summary}
                </ReactMarkdown>
              </div>
            </div>
          )}
          {content?.growing_guide && (
            <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content.growing_guide}
              </ReactMarkdown>
            </div>
          )}
        </div>
      ) : (
        <FallbackGrowingInfo species={species} />
      )}
    </div>
  );
}

function FallbackGrowingInfo({ species }: { species: Species }) {
  const items: { icon: React.ReactNode; label: string; value: string }[] = [];

  if (species.sun_requirements) {
    items.push({ icon: <Sun className="w-4 h-4" />, label: 'Sun', value: species.sun_requirements });
  }
  if (species.water_requirements) {
    items.push({ icon: <Droplets className="w-4 h-4" />, label: 'Water', value: species.water_requirements });
  }
  if (species.min_hardiness_zone && species.max_hardiness_zone) {
    items.push({ icon: <MapPin className="w-4 h-4" />, label: 'Hardiness Zones', value: `${species.min_hardiness_zone} – ${species.max_hardiness_zone}` });
  }
  if (species.mature_height_ft) {
    items.push({ icon: <Ruler className="w-4 h-4" />, label: 'Mature Height', value: `${species.mature_height_ft} ft` });
  }
  if (species.years_to_maturity) {
    items.push({ icon: <Clock className="w-4 h-4" />, label: 'Years to Maturity', value: `${species.years_to_maturity}` });
  }

  const edibleParts = species.edible_parts ? JSON.parse(species.edible_parts) : null;
  const zonePlacement = species.zone_placement_notes;

  return (
    <div className="space-y-4">
      {items.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg border p-3">
              <div className="text-muted-foreground">{item.icon}</div>
              <div>
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="text-sm font-medium capitalize">{item.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {zonePlacement && (
        <div className="rounded-xl border p-4">
          <h3 className="text-sm font-semibold mb-2">Zone Placement</h3>
          <p className="text-sm text-muted-foreground">{zonePlacement}</p>
        </div>
      )}

      {edibleParts && typeof edibleParts === 'object' && Object.keys(edibleParts).length > 0 && (
        <div className="rounded-xl border p-4">
          <h3 className="text-sm font-semibold mb-2">Edible Parts</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(edibleParts).map(([part, detail]) => (
              <span key={part} className="text-sm bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full px-3 py-1 capitalize">
                {part}{detail ? `: ${detail}` : ''}
              </span>
            ))}
          </div>
        </div>
      )}

      {items.length === 0 && !zonePlacement && !edibleParts && (
        <p className="text-muted-foreground text-center py-8">
          Growing information will be available soon.
        </p>
      )}
    </div>
  );
}
