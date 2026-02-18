// app/(app)/farm/[id]/shop/products/new/page.tsx
import { requireAuth } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { notFound } from 'next/navigation';
import { ProductForm } from '@/components/shop/seller/product-form';

export default async function NewProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: farmId } = await params;
  const session = await requireAuth();

  const result = await db.execute({
    sql: 'SELECT id FROM farms WHERE id = ? AND user_id = ?',
    args: [farmId, session.user.id],
  });
  if (!result.rows[0]) notFound();

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 sm:p-6 pb-20 md:pb-6">
      <h1 className="text-xl sm:text-2xl font-bold mb-6">Add New Product</h1>
      <ProductForm farmId={farmId} />
    </div>
  );
}
