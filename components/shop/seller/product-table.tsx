'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { Pencil, Trash2, Eye, EyeOff, Plus } from 'lucide-react';
import type { ShopProduct } from '@/lib/db/schema';

const CATEGORY_LABELS: Record<string, string> = {
  nursery_stock: 'Nursery Stock', seeds: 'Seeds', vegetable_box: 'Veg Box',
  cut_flowers: 'Flowers', teas_herbs: 'Teas & Herbs', value_added: 'Value-Added',
  tour: 'Tour', event: 'Event', digital: 'Digital', other: 'Other',
};

export function ProductTable({ farmId, initialProducts }: { farmId: string; initialProducts: ShopProduct[] }) {
  const [products, setProducts] = useState(initialProducts);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const patch = async (productId: string, data: object) => {
    const res = await fetch(`/api/shops/${farmId}/products/${productId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Update failed');
    return res.json();
  };

  const togglePublished = async (product: ShopProduct) => {
    setUpdatingId(product.id);
    try {
      const updated = await patch(product.id, { is_published: product.is_published === 1 ? 0 : 1 });
      setProducts((ps) => ps.map((p) => (p.id === product.id ? updated : p)));
    } catch {
      toast({ title: 'Failed to update', variant: 'destructive' });
    } finally {
      setUpdatingId(null);
    }
  };

  const updateStock = async (product: ShopProduct, qty: number) => {
    try {
      await patch(product.id, { quantity_in_stock: qty });
      setProducts((ps) => ps.map((p) => (p.id === product.id ? { ...p, quantity_in_stock: qty } : p)));
    } catch {
      toast({ title: 'Failed to update stock', variant: 'destructive' });
    }
  };

  const deleteProduct = async (product: ShopProduct) => {
    if (!confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    try {
      await fetch(`/api/shops/${farmId}/products/${product.id}`, { method: 'DELETE' });
      setProducts((ps) => ps.filter((p) => p.id !== product.id));
      toast({ title: 'Product deleted' });
    } catch {
      toast({ title: 'Failed to delete', variant: 'destructive' });
    }
  };

  if (products.length === 0) {
    return (
      <div className="text-center py-12 border-2 border-dashed rounded-lg">
        <p className="text-muted-foreground mb-4">No products yet</p>
        <Link href={`/farm/${farmId}/shop/products/new`}>
          <Button><Plus className="w-4 h-4 mr-2" />Add Your First Product</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {products.map((product) => (
        <div key={product.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="w-12 h-12 object-cover rounded-md flex-shrink-0" />
          ) : (
            <div className="w-12 h-12 bg-muted rounded-md flex-shrink-0 flex items-center justify-center text-xl">🌱</div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{product.name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="secondary" className="text-xs">{CATEGORY_LABELS[product.category] || product.category}</Badge>
              <span className="text-sm font-semibold">${(product.price_cents / 100).toFixed(2)}</span>
              {product.is_published === 0 && <Badge variant="outline" className="text-xs text-muted-foreground">Draft</Badge>}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Input type="number" min="0" className="w-16 h-8 text-center text-sm"
              value={product.quantity_in_stock}
              onChange={(e) => updateStock(product, parseInt(e.target.value) || 0)}
              title="Stock quantity" />
            <span className="text-xs text-muted-foreground">in stock</span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" disabled={updatingId === product.id}
              onClick={() => togglePublished(product)}
              title={product.is_published === 1 ? 'Unpublish' : 'Publish'}>
              {product.is_published === 1
                ? <Eye className="w-4 h-4 text-green-600" />
                : <EyeOff className="w-4 h-4 text-muted-foreground" />}
            </Button>
            <Link href={`/farm/${farmId}/shop/products/${product.id}/edit`}>
              <Button variant="ghost" size="sm"><Pencil className="w-4 h-4" /></Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={() => deleteProduct(product)}
              className="text-destructive hover:text-destructive">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
