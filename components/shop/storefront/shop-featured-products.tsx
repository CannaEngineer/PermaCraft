'use client';

import { ProductCard } from '@/components/shop/product-card';
import type { ShopProduct } from '@/lib/db/schema';

interface ShopFeaturedProductsProps {
  products: ShopProduct[];
  farmId: string;
}

export function ShopFeaturedProducts({ products, farmId }: ShopFeaturedProductsProps) {
  if (products.length === 0) return null;

  return (
    <section className="py-8">
      <h2 className="text-xl font-semibold mb-4">Featured</h2>
      <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 -mx-1 px-1">
        {products.map(product => (
          <div key={product.id} className="snap-center min-w-[260px] max-w-[260px] shrink-0">
            <ProductCard product={product} farmId={farmId} />
          </div>
        ))}
      </div>
    </section>
  );
}
