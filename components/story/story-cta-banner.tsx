'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import { ProductCard } from '@/components/shop/product-card';
import type { ShopProduct } from '@/lib/db/schema';

interface StoryCtaBannerProps {
  farmId: string;
  featuredProducts?: ShopProduct[];
  theme: string;
}

const THEME_GRADIENTS: Record<string, string> = {
  earth: 'from-amber-600 to-amber-800',
  meadow: 'from-lime-600 to-lime-800',
  forest: 'from-emerald-600 to-emerald-800',
  water: 'from-sky-600 to-sky-800',
};

export function StoryCtaBanner({ farmId, featuredProducts, theme }: StoryCtaBannerProps) {
  const gradient = THEME_GRADIENTS[theme] || THEME_GRADIENTS.earth;
  const hasProducts = featuredProducts && featuredProducts.length > 0;

  return (
    <section className="py-12 sm:py-16">
      <div className="max-w-4xl mx-auto px-6 sm:px-8">
        {/* Featured products horizontal scroll */}
        {hasProducts && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4">Featured from Our Shop</h3>
            <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 -mx-2 px-2">
              {featuredProducts.map(product => (
                <div key={product.id} className="snap-center min-w-[260px] max-w-[260px] shrink-0">
                  <ProductCard product={product} farmId={farmId} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA card */}
        <div className={`rounded-2xl bg-gradient-to-r ${gradient} p-8 sm:p-10 text-center text-white`}>
          <ShoppingBag className="w-10 h-10 mx-auto mb-4 opacity-80" />
          <h3 className="text-2xl font-bold mb-2">Shop Our Products</h3>
          <p className="text-white/80 mb-6 max-w-md mx-auto text-sm">
            Bring a piece of our farm home. Browse plants, seeds, and more from our shop.
          </p>
          <Link href={`/shops/${farmId}`}>
            <Button
              variant="secondary"
              size="lg"
              className="rounded-xl font-semibold gap-2"
            >
              Visit Shop
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
