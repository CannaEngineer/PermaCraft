'use client';

import { useState } from 'react';
import { ProductCard } from '@/components/shop/product-card';
import { ShopCategoryPills } from './shop-category-pills';
import { Package } from 'lucide-react';
import type { ShopProduct } from '@/lib/db/schema';

interface ShopProductGridProps {
  products: ShopProduct[];
  farmId: string;
}

export function ShopProductGrid({ products, farmId }: ShopProductGridProps) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const categories = [...new Set(products.map(p => p.category))];
  const productCounts: Record<string, number> = {};
  products.forEach(p => {
    productCounts[p.category] = (productCounts[p.category] || 0) + 1;
  });

  const filtered = activeCategory
    ? products.filter(p => p.category === activeCategory)
    : products;

  return (
    <section id="shop-products" className="py-8 scroll-mt-4">
      <h2 className="text-xl font-semibold mb-4">All Products</h2>

      {categories.length > 1 && (
        <div className="mb-4">
          <ShopCategoryPills
            categories={categories}
            activeCategory={activeCategory}
            onSelect={setActiveCategory}
            productCounts={productCounts}
          />
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No products in this category</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(product => (
            <div key={product.id} className="animate-in fade-in duration-300">
              <ProductCard product={product} farmId={farmId} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
