'use client';

import Link from 'next/link';
import { ShoppingBag, ExternalLink, Store } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { STORY_TYPOGRAPHY } from '@/lib/design/plant-story-tokens';
import type { Species, ShopProduct } from '@/lib/db/schema';

interface GetThisPlantCardProps {
  products: (ShopProduct & { farm_name?: string })[];
  species: Species;
}

const CATEGORY_LABELS: Record<string, string> = {
  nursery_stock: 'Nursery Stock', seeds: 'Seeds', vegetable_box: 'Veg Box',
  cut_flowers: 'Flowers', teas_herbs: 'Teas & Herbs', value_added: 'Value-Added',
  tour: 'Tour', event: 'Event', digital: 'Digital', other: 'Other',
};

export function GetThisPlantCard({ products, species }: GetThisPlantCardProps) {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <ShoppingBag className="w-6 h-6 text-emerald-600" />
          <span className={STORY_TYPOGRAPHY.label}>Availability</span>
        </div>
        <h2 className={STORY_TYPOGRAPHY.cardTitle}>
          Get This Plant
        </h2>
      </div>

      {/* PermaCraft Shop Products */}
      {products.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium flex items-center gap-2">
            <Store className="w-4 h-4" />
            Available on PermaCraft
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {products.map((product) => (
              <Link
                key={product.id}
                href={`/shops/${product.farm_id}/product/${product.slug}`}
                className="group rounded-xl border p-4 hover:shadow-md transition-all hover:border-primary/50"
              >
                <div className="flex gap-3">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-muted rounded-lg flex-shrink-0 flex items-center justify-center text-2xl">
                      🌱
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
                      {product.name}
                    </p>
                    {product.farm_name && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        by {product.farm_name}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {CATEGORY_LABELS[product.category] || product.category}
                      </Badge>
                      <span className="text-sm font-semibold text-green-700 dark:text-green-400">
                        ${(product.price_cents / 100).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Sourcing Notes Fallback */}
      {products.length === 0 && species.sourcing_notes && (
        <div className="rounded-xl border p-4 bg-muted/30">
          <h3 className="text-sm font-semibold mb-2">Sourcing Tips</h3>
          <p className="text-sm text-muted-foreground">{species.sourcing_notes}</p>
        </div>
      )}

      {products.length === 0 && !species.sourcing_notes && (
        <div className="text-center py-8 rounded-xl border border-dashed">
          <ShoppingBag className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">
            No products linked to this species yet.
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Check your local native plant nurseries.
          </p>
        </div>
      )}
    </div>
  );
}
