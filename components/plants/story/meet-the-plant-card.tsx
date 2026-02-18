'use client';

import { Badge } from '@/components/ui/badge';
import { Layers, Sun, Droplets, MapPin, Ruler, Clock, ChevronDown } from 'lucide-react';
import { LAYER_GRADIENTS, LAYER_EMOJIS, STORY_TYPOGRAPHY } from '@/lib/design/plant-story-tokens';
import type { Species } from '@/lib/db/schema';

export function MeetThePlantCard({ species }: { species: Species }) {
  const gradient = LAYER_GRADIENTS[species.layer] || LAYER_GRADIENTS.herbaceous;
  const emoji = LAYER_EMOJIS[species.layer] || '🌱';

  const functions = species.permaculture_functions
    ? JSON.parse(species.permaculture_functions)
    : [];

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className={`rounded-3xl bg-gradient-to-br ${gradient} p-8 md:p-12 text-white`}>
        <div className="text-5xl mb-4">{emoji}</div>
        <h1 className={STORY_TYPOGRAPHY.heroTitle}>
          {species.common_name}
        </h1>
        <p className={`${STORY_TYPOGRAPHY.heroSubtitle} text-white/70 mt-2`}>
          {species.scientific_name}
        </p>

        <div className="flex flex-wrap gap-2 mt-6">
          {species.is_native === 1 ? (
            <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30">
              Native
            </Badge>
          ) : (
            <Badge variant="outline" className="border-white/30 text-white/80">
              Naturalized
            </Badge>
          )}
          <Badge variant="outline" className="border-white/30 text-white/80 capitalize">
            <Layers className="w-3 h-3 mr-1" />
            {species.layer}
          </Badge>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {species.mature_height_ft && (
          <StatCard icon={<Ruler className="w-4 h-4" />} label="Height" value={`${species.mature_height_ft} ft`} />
        )}
        {species.mature_width_ft && (
          <StatCard icon={<Ruler className="w-4 h-4 rotate-90" />} label="Spread" value={`${species.mature_width_ft} ft`} />
        )}
        {species.years_to_maturity && (
          <StatCard icon={<Clock className="w-4 h-4" />} label="Maturity" value={`${species.years_to_maturity} years`} />
        )}
        {species.sun_requirements && (
          <StatCard icon={<Sun className="w-4 h-4" />} label="Sun" value={species.sun_requirements} />
        )}
        {species.water_requirements && (
          <StatCard icon={<Droplets className="w-4 h-4" />} label="Water" value={species.water_requirements} />
        )}
        {species.min_hardiness_zone && species.max_hardiness_zone && (
          <StatCard icon={<MapPin className="w-4 h-4" />} label="Zones" value={`${species.min_hardiness_zone}–${species.max_hardiness_zone}`} />
        )}
      </div>

      {/* Functions */}
      {functions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {functions.map((fn: string) => (
            <Badge key={fn} variant="secondary" className="capitalize">
              {fn.replace(/_/g, ' ')}
            </Badge>
          ))}
        </div>
      )}

      {/* Scroll hint */}
      <div className="flex justify-center pt-4 animate-bounce">
        <ChevronDown className="w-6 h-6 text-muted-foreground" />
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card p-3 space-y-1">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-xs uppercase tracking-wider">{label}</span>
      </div>
      <p className="font-semibold capitalize text-sm">{value}</p>
    </div>
  );
}
