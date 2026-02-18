// app/(app)/farm/[id]/shop/page.tsx
import { requireAuth } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ShopSettingsForm } from '@/components/shop/seller/shop-settings-form';
import { ProductTable } from '@/components/shop/seller/product-table';
import { Plus, ExternalLink } from 'lucide-react';
import type { ShopProduct } from '@/lib/db/schema';

export default async function ShopDashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: farmId } = await params;
  const session = await requireAuth();

  const farmResult = await db.execute({
    sql: `SELECT id, name, is_shop_enabled, shop_headline, shop_banner_url, shop_policy,
                 accepts_pickup, accepts_shipping, accepts_delivery, delivery_radius_miles
          FROM farms WHERE id = ? AND user_id = ?`,
    args: [farmId, session.user.id],
  });
  if (!farmResult.rows[0]) notFound();

  const farm = farmResult.rows[0] as any;

  const productsResult = await db.execute({
    sql: 'SELECT * FROM shop_products WHERE farm_id = ? ORDER BY sort_order ASC, created_at DESC',
    args: [farmId],
  });
  const products = productsResult.rows as unknown as ShopProduct[];

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 sm:p-6 space-y-6 sm:space-y-8 pb-20 md:pb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">{farm.name} — Shop</h1>
          <p className="text-sm text-muted-foreground">Manage your farm storefront</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {farm.is_shop_enabled === 1 && (
            <Link href={`/shops/${farmId}`} target="_blank">
              <Button variant="outline" size="sm">
                <ExternalLink className="w-4 h-4 mr-2" />View Storefront
              </Button>
            </Link>
          )}
          <Link href={`/farm/${farmId}/shop/products/new`}>
            <Button size="sm"><Plus className="w-4 h-4 mr-2" />Add Product</Button>
          </Link>
        </div>
      </div>

      <ShopSettingsForm farmId={farmId} initial={farm} />

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg sm:text-xl font-semibold">Products ({products.length})</h2>
          <Link href={`/farm/${farmId}/shop/products/new`}>
            <Button variant="outline" size="sm"><Plus className="w-4 h-4 mr-2" />Add Product</Button>
          </Link>
        </div>
        <ProductTable farmId={farmId} initialProducts={products} />
      </div>
    </div>
  );
}
