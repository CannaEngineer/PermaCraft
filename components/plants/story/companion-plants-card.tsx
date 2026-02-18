'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Users, ArrowRight, Layers } from 'lucide-react';
import { LAYER_EMOJIS, LAYER_COLORS, STORY_TYPOGRAPHY } from '@/lib/design/plant-story-tokens';
import type { Species } from '@/lib/db/schema';

interface CompanionPlantsCardProps {
  companions: Species[];
  species: Species;
}

export function CompanionPlantsCard({ companions, species }: CompanionPlantsCardProps) {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Users className="w-6 h-6 text-purple-600" />
          <span className={STORY_TYPOGRAPHY.label}>Plant Guild</span>
        </div>
        <h2 className={STORY_TYPOGRAPHY.cardTitle}>
          Companion Plants
        </h2>
        <p className={STORY_TYPOGRAPHY.cardSubtitle}>
          Species that thrive alongside {species.common_name}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {companions.map((companion) => {
          const emoji = LAYER_EMOJIS[companion.layer] || '🌱';
          const colors = LAYER_COLORS[companion.layer] || LAYER_COLORS.herbaceous;

          return (
            <Link
              key={companion.id}
              href={`/plants/${companion.id}`}
              className="group rounded-xl border p-4 hover:shadow-md transition-all hover:border-primary/50"
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{emoji}</span>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm group-hover:text-primary transition-colors truncate">
                    {companion.common_name}
                  </h3>
                  <p className="text-xs text-muted-foreground italic truncate">
                    {companion.scientific_name}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className={`text-xs capitalize ${colors.bg} ${colors.text}`}>
                      <Layers className="w-3 h-3 mr-1" />
                      {companion.layer}
                    </Badge>
                    {companion.is_native === 1 && (
                      <Badge className="bg-green-600 text-white text-xs">
                        Native
                      </Badge>
                    )}
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 mt-1" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
