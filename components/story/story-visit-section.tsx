'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Truck, Package, Car, Footprints } from 'lucide-react';
import Link from 'next/link';

interface StoryVisitSectionProps {
  title: string;
  content: string;
  centerLat: number;
  centerLng: number;
  farmName: string;
  fulfillment?: {
    shipping?: boolean;
    pickup?: boolean;
    delivery?: boolean;
  };
  isShopEnabled?: boolean;
  farmId: string;
  theme: string;
  publishedTours?: { id: string; title: string; share_slug: string; estimated_duration_minutes: number | null; stop_count: number }[];
}

const THEME_ACCENTS: Record<string, string> = {
  earth: 'bg-amber-50 dark:bg-amber-950/20',
  meadow: 'bg-lime-50 dark:bg-lime-950/20',
  forest: 'bg-emerald-50 dark:bg-emerald-950/20',
  water: 'bg-sky-50 dark:bg-sky-950/20',
};

export function StoryVisitSection({
  title,
  content,
  centerLat,
  centerLng,
  farmName,
  fulfillment,
  isShopEnabled,
  farmId,
  theme,
  publishedTours = [],
}: StoryVisitSectionProps) {
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${centerLng - 0.01},${centerLat - 0.01},${centerLng + 0.01},${centerLat + 0.01}&layer=mapnik&marker=${centerLat},${centerLng}`;
  const directionsUrl = `https://www.openstreetmap.org/directions?to=${centerLat},${centerLng}`;

  return (
    <section className={`py-16 sm:py-20 ${THEME_ACCENTS[theme] || THEME_ACCENTS.earth}`}>
      <div className="max-w-4xl mx-auto px-6 sm:px-8">
        <h2 className="text-2xl sm:text-3xl font-serif font-bold mb-8">{title}</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Map */}
          <div className="rounded-xl overflow-hidden shadow-lg border bg-card">
            <iframe
              src={mapUrl}
              className="w-full h-[300px]"
              style={{ border: 0 }}
              title={`${farmName} location`}
              loading="lazy"
            />
          </div>

          {/* Info */}
          <div className="space-y-4">
            <div className="prose prose-sm text-muted-foreground">
              {content.split('\n').map((p, i) => (
                p.trim() ? <p key={i}>{p}</p> : null
              ))}
            </div>

            {/* Fulfillment badges */}
            {fulfillment && (
              <div className="flex flex-wrap gap-2">
                {fulfillment.shipping && (
                  <Badge variant="secondary" className="gap-1.5 py-1">
                    <Truck className="w-3.5 h-3.5" />Ships Nationwide
                  </Badge>
                )}
                {fulfillment.pickup && (
                  <Badge variant="secondary" className="gap-1.5 py-1">
                    <Package className="w-3.5 h-3.5" />Local Pickup
                  </Badge>
                )}
                {fulfillment.delivery && (
                  <Badge variant="secondary" className="gap-1.5 py-1">
                    <Car className="w-3.5 h-3.5" />Local Delivery
                  </Badge>
                )}
              </div>
            )}

            {/* Tour links */}
            {publishedTours.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Self-Guided Tours</p>
                <div className="flex flex-wrap gap-2">
                  {publishedTours.map(tour => (
                    <Link key={tour.id} href={`/tour/${tour.share_slug}`}>
                      <Button variant="secondary" className="gap-2">
                        <Footprints className="w-4 h-4" />
                        {tour.title}
                      </Button>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-2">
              <a href={directionsUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="gap-2">
                  <MapPin className="w-4 h-4" />
                  Get Directions
                </Button>
              </a>
              {isShopEnabled && (
                <a href={`/shops/${farmId}`}>
                  <Button className="gap-2">
                    Visit Shop
                  </Button>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
