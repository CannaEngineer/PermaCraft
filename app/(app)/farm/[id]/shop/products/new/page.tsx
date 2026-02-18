// app/(app)/farm/[id]/shop/products/new/page.tsx
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { headers } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import { ProductForm } from '@/components/shop/seller/product-form';

export default async function NewProductPage({ params }: { params: { id: string } }) {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) redirect('/login');

  const result = await db.execute({
    sql: 'SELECT id FROM farms WHERE id = ? AND user_id = ?',
    args: [params.id, session.user.id],
  });
  if (!result.rows[0]) notFound();

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Add New Product</h1>
      <ProductForm farmId={params.id} />
    </div>
  );
}
