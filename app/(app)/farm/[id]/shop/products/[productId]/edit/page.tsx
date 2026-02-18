// app/(app)/farm/[id]/shop/products/[productId]/edit/page.tsx
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { headers } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import { ProductForm } from '@/components/shop/seller/product-form';
import type { ShopProduct } from '@/lib/db/schema';

export default async function EditProductPage({
  params,
}: {
  params: { id: string; productId: string };
}) {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) redirect('/login');

  const farmResult = await db.execute({
    sql: 'SELECT id FROM farms WHERE id = ? AND user_id = ?',
    args: [params.id, session.user.id],
  });
  if (!farmResult.rows[0]) notFound();

  const productResult = await db.execute({
    sql: 'SELECT * FROM shop_products WHERE id = ? AND farm_id = ?',
    args: [params.productId, params.id],
  });
  if (!productResult.rows[0]) notFound();

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Edit Product</h1>
      <ProductForm farmId={params.id} product={productResult.rows[0] as unknown as ShopProduct} />
    </div>
  );
}
