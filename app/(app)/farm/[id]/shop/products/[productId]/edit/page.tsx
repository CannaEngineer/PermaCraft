// app/(app)/farm/[id]/shop/products/[productId]/edit/page.tsx
import { requireAuth } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { notFound } from 'next/navigation';
import { ProductForm } from '@/components/shop/seller/product-form';
import type { ShopProduct } from '@/lib/db/schema';

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string; productId: string }>;
}) {
  const { id: farmId, productId } = await params;
  const session = await requireAuth();

  const farmResult = await db.execute({
    sql: 'SELECT id FROM farms WHERE id = ? AND user_id = ?',
    args: [farmId, session.user.id],
  });
  if (!farmResult.rows[0]) notFound();

  const productResult = await db.execute({
    sql: 'SELECT * FROM shop_products WHERE id = ? AND farm_id = ?',
    args: [productId, farmId],
  });
  if (!productResult.rows[0]) notFound();

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 sm:p-6 pb-20 md:pb-6">
      <h1 className="text-xl sm:text-2xl font-bold mb-6">Edit Product</h1>
      <ProductForm farmId={farmId} product={productResult.rows[0] as unknown as ShopProduct} />
    </div>
  );
}
