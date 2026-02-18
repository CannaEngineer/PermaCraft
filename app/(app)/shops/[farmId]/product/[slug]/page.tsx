// app/(app)/shops/[farmId]/product/[slug]/page.tsx
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PriceDisplay } from '@/components/shop/price-display';
import { ShoppingCart, ArrowLeft, Package } from 'lucide-react';
import type { ShopProduct } from '@/lib/db/schema';

const CATEGORY_LABELS: Record<string, string> = {
  nursery_stock: 'Nursery Stock', seeds: 'Seeds', vegetable_box: 'Vegetable Box',
  cut_flowers: 'Cut Flowers', teas_herbs: 'Teas & Herbs', value_added: 'Value-Added',
  tour: 'Tour', event: 'Event', digital: 'Digital', other: 'Other',
};

async function getProductBySlug(farmId: string, slug: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/shops/${farmId}`, {
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const data = await res.json();
  const product = data.products.find((p: ShopProduct) => p.slug === slug);
  if (!product) return null;
  return { product, farmName: data.shop.name as string };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ farmId: string; slug: string }>;
}) {
  const { farmId, slug } = await params;
  const result = await getProductBySlug(farmId, slug);
  if (!result) notFound();

  const { product, farmName } = result;
  const inStock = product.quantity_in_stock > 0 || product.allow_backorder === 1;

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 sm:p-6 pb-20 md:pb-6">
      <Link href={`/shops/${farmId}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="w-4 h-4" />Back to {farmName}
      </Link>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="aspect-square bg-muted rounded-xl overflow-hidden">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-6xl">🌱</div>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <Badge variant="secondary" className="mb-2">
              {CATEGORY_LABELS[product.category] || product.category}
            </Badge>
            <h1 className="text-2xl font-bold">{product.name}</h1>
          </div>

          <PriceDisplay cents={product.price_cents} compareAtCents={product.compare_at_price_cents}
            className="text-2xl" />

          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-muted-foreground" />
            {inStock
              ? <span className="text-sm text-green-600 font-medium">In Stock ({product.quantity_in_stock} available)</span>
              : <span className="text-sm text-destructive font-medium">Out of Stock</span>}
          </div>

          <Button className="w-full" size="lg" disabled title="Payments coming soon — check back shortly!">
            <ShoppingCart className="w-5 h-5 mr-2" />
            Add to Cart
            <span className="ml-2 text-xs opacity-70">(Coming Soon)</span>
          </Button>

          {product.tags && (
            <div className="flex gap-2 flex-wrap">
              {product.tags.split(',').map((tag: string) => (
                <Badge key={tag.trim()} variant="outline" className="text-xs">{tag.trim()}</Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {product.description && (
        <div className="mt-8 border-t pt-6">
          <h2 className="text-lg font-semibold mb-3">Description</h2>
          <p className="text-muted-foreground whitespace-pre-wrap">{product.description}</p>
        </div>
      )}
    </div>
  );
}
