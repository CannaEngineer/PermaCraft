import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PriceDisplay } from './price-display';
import { ShoppingCart } from 'lucide-react';
import type { ShopProduct } from '@/lib/db/schema';

const CATEGORY_LABELS: Record<string, string> = {
  nursery_stock: 'Nursery Stock', seeds: 'Seeds', vegetable_box: 'Veg Box',
  cut_flowers: 'Flowers', teas_herbs: 'Teas & Herbs', value_added: 'Value-Added',
  tour: 'Tour', event: 'Event', digital: 'Digital', other: 'Other',
};

export function ProductCard({ product, farmId }: { product: ShopProduct; farmId: string }) {
  const inStock = product.quantity_in_stock > 0 || product.allow_backorder === 1;
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full flex flex-col">
      <Link href={`/shops/${farmId}/product/${product.slug}`} className="flex-1">
        <div className="aspect-square bg-muted relative overflow-hidden">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                const parent = (e.target as HTMLImageElement).parentElement;
                if (parent) {
                  const fallback = document.createElement('div');
                  fallback.className = 'w-full h-full flex items-center justify-center text-4xl';
                  fallback.textContent = '🌱';
                  parent.appendChild(fallback);
                }
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl">🌱</div>
          )}
          {!inStock && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Badge variant="secondary">Out of Stock</Badge>
            </div>
          )}
          {product.is_featured === 1 && (
            <Badge className="absolute top-2 left-2 bg-amber-500">Featured</Badge>
          )}
        </div>
        <CardContent className="p-3">
          <p className="font-medium text-sm line-clamp-2 mb-1">{product.name}</p>
          <Badge variant="secondary" className="text-xs mb-2">
            {CATEGORY_LABELS[product.category] || product.category}
          </Badge>
          <PriceDisplay cents={product.price_cents} compareAtCents={product.compare_at_price_cents} />
        </CardContent>
      </Link>
      <div className="px-3 pb-3">
        <Button className="w-full" size="sm" disabled title="Payments coming soon" variant="outline">
          <ShoppingCart className="w-4 h-4 mr-2" />Add to Cart
        </Button>
      </div>
    </Card>
  );
}
