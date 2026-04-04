'use client';
import { DashboardFarm } from '@/lib/db/queries/dashboard';
import { SeasonalContext } from '@/lib/dashboard/seasonal';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { ArrowRight, Leaf, MapPin, Thermometer, Plus, FlaskConical, Camera, Footprints } from 'lucide-react';

const SEASON_COLORS: Record<string, string> = {
  early_spring: 'from-lime-500/10 to-green-500/10',
  spring: 'from-green-500/10 to-emerald-500/10',
  late_spring: 'from-emerald-500/10 to-teal-500/10',
  early_summer: 'from-yellow-500/10 to-amber-500/10',
  summer: 'from-amber-500/10 to-orange-500/10',
  late_summer: 'from-orange-500/10 to-red-500/10',
  early_fall: 'from-orange-500/10 to-amber-500/10',
  fall: 'from-amber-500/10 to-yellow-500/10',
  late_fall: 'from-yellow-500/10 to-stone-500/10',
  early_winter: 'from-blue-500/10 to-indigo-500/10',
  winter: 'from-indigo-500/10 to-slate-500/10',
  late_winter: 'from-slate-500/10 to-blue-500/10',
};

interface Props {
  farm: DashboardFarm;
  ecoScore: number;
  ecoFunctions: Record<string, number>;
  seasonal: SeasonalContext;
}

export function FarmHeroCard({ farm, ecoScore, ecoFunctions, seasonal }: Props) {
  const lastEdited = formatDistanceToNow(new Date(farm.updated_at * 1000), { addSuffix: true });
  const coveredFunctions = Object.values(ecoFunctions).filter((v) => v > 0).length;
  const totalFunctions = Object.keys(ecoFunctions).length;
  const seasonGradient = SEASON_COLORS[seasonal.season] || 'from-green-500/10 to-emerald-500/10';

  return (
    <div className={`relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br ${seasonGradient}`}>
      <div className="flex flex-col md:flex-row">
        {/* Map preview / visual */}
        <div className="relative md:w-2/5 aspect-[16/9] md:aspect-auto md:min-h-[220px]">
          {farm.latest_screenshot ? (
            <img
              src={farm.latest_screenshot}
              alt={farm.name}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-green-200 via-emerald-200 to-teal-300 dark:from-green-900 dark:via-emerald-900 dark:to-teal-900 flex items-center justify-center">
              <div className="text-center opacity-60">
                <MapPin className="h-10 w-10 mx-auto mb-2 text-green-600 dark:text-green-400" />
                <span className="text-sm font-medium text-green-700 dark:text-green-300">No snapshot yet</span>
              </div>
            </div>
          )}
          {/* Gradient overlay for text readability on mobile */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:to-black/10" />
          {/* Season pill overlay */}
          <div className="absolute top-3 left-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 dark:bg-black/70 backdrop-blur-sm px-3 py-1 text-xs font-semibold text-foreground shadow-sm">
              {seasonal.seasonLabel}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-5 md:p-6 flex flex-col justify-between gap-4">
          {/* Top: Farm name + meta */}
          <div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl md:text-2xl font-bold tracking-tight">{farm.name}</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {[
                    farm.acres && `${farm.acres} acres`,
                    farm.climate_zone,
                    `Updated ${lastEdited}`,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
            </div>

            {/* Key metrics row */}
            <div className="flex flex-wrap gap-4 md:gap-6 mt-4">
              <div>
                <div className="text-2xl md:text-3xl font-bold text-foreground">
                  {farm.planting_count}
                </div>
                <div className="text-xs text-muted-foreground font-medium">Plants</div>
              </div>
              <div className="w-px bg-border self-stretch" />
              <div>
                <div className="text-2xl md:text-3xl font-bold text-foreground">
                  {ecoScore}<span className="text-lg text-muted-foreground font-normal">%</span>
                </div>
                <div className="text-xs text-muted-foreground font-medium">Eco Health</div>
              </div>
              <div className="w-px bg-border self-stretch" />
              <div>
                <div className="text-2xl md:text-3xl font-bold text-foreground">
                  {coveredFunctions}<span className="text-lg text-muted-foreground font-normal">/{totalFunctions}</span>
                </div>
                <div className="text-xs text-muted-foreground font-medium">Functions</div>
              </div>
              {seasonal.daysToLastFrost !== null && seasonal.daysToLastFrost > 0 && (
                <>
                  <div className="w-px bg-border self-stretch" />
                  <div>
                    <div className="flex items-baseline gap-1">
                      <div className="text-2xl md:text-3xl font-bold text-amber-600 dark:text-amber-400">
                        {seasonal.daysToLastFrost}
                      </div>
                      <Thermometer className="h-4 w-4 text-amber-500" />
                    </div>
                    <div className="text-xs text-muted-foreground font-medium">Days to Last Frost</div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Bottom: CTAs */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-3">
              <Link
                href={`/farm/${farm.id}`}
                className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-all active:scale-[0.98]"
              >
                Open Map Editor
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href={`/farm/${farm.id}?tab=ai`}
                className="inline-flex items-center gap-2 rounded-2xl bg-card border border-border px-5 py-2.5 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
              >
                <Leaf className="h-4 w-4 text-primary" />
                Ask AI
              </Link>
            </div>
            {/* GPS Quick Actions */}
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/farm/${farm.id}?gps=plant`}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600/10 border border-emerald-600/20 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-600/20 transition-colors active:scale-[0.97]"
              >
                <Plus className="h-3 w-3" />
                Plant by GPS
              </Link>
              <Link
                href={`/farm/${farm.id}?gps=pin`}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600/10 border border-blue-600/20 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-400 hover:bg-blue-600/20 transition-colors active:scale-[0.97]"
              >
                <MapPin className="h-3 w-3" />
                Drop Pin
              </Link>
              <Link
                href={`/farm/${farm.id}?gps=photo`}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600/10 border border-rose-600/20 px-3 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-400 hover:bg-rose-600/20 transition-colors active:scale-[0.97]"
              >
                <Camera className="h-3 w-3" />
                Take Photo
              </Link>
              <Link
                href={`/farm/${farm.id}?gps=soil`}
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600/10 border border-amber-600/20 px-3 py-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 hover:bg-amber-600/20 transition-colors active:scale-[0.97]"
              >
                <FlaskConical className="h-3 w-3" />
                Soil Test
              </Link>
              <Link
                href={`/farm/${farm.id}?gps=walk`}
                className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600/10 border border-teal-600/20 px-3 py-1.5 text-xs font-semibold text-teal-700 dark:text-teal-400 hover:bg-teal-600/20 transition-colors active:scale-[0.97]"
              >
                <Footprints className="h-3 w-3" />
                Walk Zone
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
