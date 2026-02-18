'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import type { ShopProduct } from '@/lib/db/schema';

const CATEGORIES = [
  { value: 'nursery_stock', label: 'Nursery Stock' },
  { value: 'seeds', label: 'Seeds' },
  { value: 'vegetable_box', label: 'Vegetable Box' },
  { value: 'cut_flowers', label: 'Cut Flowers' },
  { value: 'teas_herbs', label: 'Teas & Herbs' },
  { value: 'value_added', label: 'Value-Added' },
  { value: 'tour', label: 'Tour' },
  { value: 'event', label: 'Event' },
  { value: 'digital', label: 'Digital' },
  { value: 'other', label: 'Other' },
] as const;

interface ProductFormProps {
  farmId: string;
  product?: ShopProduct;
}

export function ProductForm({ farmId, product }: ProductFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    name: product?.name ?? '',
    description: product?.description ?? '',
    category: product?.category ?? 'other',
    price: product ? (product.price_cents / 100).toFixed(2) : '',
    compare_at_price: product?.compare_at_price_cents
      ? (product.compare_at_price_cents / 100).toFixed(2)
      : '',
    quantity_in_stock: product?.quantity_in_stock ?? 0,
    image_url: product?.image_url ?? '',
    tags: product?.tags ?? '',
    is_published: product ? product.is_published === 1 : true,
  });

  const uploadImage = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`/api/shops/${farmId}/products/upload`, { method: 'POST', body: fd });
      if (!res.ok) throw new Error('Upload failed');
      const { url } = await res.json();
      setForm((f) => ({ ...f, image_url: url }));
      toast({ title: 'Image uploaded' });
    } catch {
      toast({ title: 'Upload failed', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!form.name.trim() || !form.price || !form.category) {
      toast({ title: 'Name, price, and category are required', variant: 'destructive' });
      return;
    }
    const price_cents = Math.round(parseFloat(form.price) * 100);
    if (isNaN(price_cents) || price_cents <= 0) {
      toast({ title: 'Invalid price', variant: 'destructive' });
      return;
    }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      category: form.category,
      price_cents,
      compare_at_price_cents: form.compare_at_price
        ? Math.round(parseFloat(form.compare_at_price) * 100)
        : null,
      quantity_in_stock: form.quantity_in_stock,
      image_url: form.image_url || null,
      tags: form.tags.trim() || null,
      is_published: form.is_published ? 1 : 0,
    };

    setSaving(true);
    try {
      const url = product
        ? `/api/shops/${farmId}/products/${product.id}`
        : `/api/shops/${farmId}/products`;
      const res = await fetch(url, {
        method: product ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Save failed');
      toast({ title: product ? 'Product updated' : 'Product created' });
      router.push(`/farm/${farmId}/shop`);
      router.refresh();
    } catch {
      toast({ title: 'Failed to save product', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{product ? 'Edit Product' : 'New Product'}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Product Name *</Label>
          <Input
            placeholder="Heritage Tomato Seeds"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            maxLength={200}
          />
        </div>

        <div className="space-y-2">
          <Label>Category *</Label>
          <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v as typeof CATEGORIES[number]['value'] }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Price (USD) *</Label>
            <Input type="number" min="0.01" step="0.01" placeholder="24.99"
              value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Compare-at Price</Label>
            <Input type="number" min="0.01" step="0.01" placeholder="34.99"
              value={form.compare_at_price}
              onChange={(e) => setForm((f) => ({ ...f, compare_at_price: e.target.value }))} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea placeholder="Describe your product..." value={form.description} rows={4}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
        </div>

        <div className="space-y-2">
          <Label>Product Image</Label>
          {form.image_url && (
            <img src={form.image_url} alt="Product" className="w-32 h-32 object-cover rounded-lg border" />
          )}
          <Input type="file" accept="image/*" disabled={uploading}
            onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadImage(file); }} />
          {uploading && <p className="text-sm text-muted-foreground">Uploading...</p>}
        </div>

        <div className="space-y-2">
          <Label>Stock Quantity</Label>
          <Input type="number" min="0" value={form.quantity_in_stock}
            onChange={(e) => setForm((f) => ({ ...f, quantity_in_stock: parseInt(e.target.value) || 0 }))} />
        </div>

        <div className="space-y-2">
          <Label>Tags (comma-separated)</Label>
          <Input placeholder="heirloom, organic, native" value={form.tags}
            onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label className="text-base font-medium">Published</Label>
            <p className="text-sm text-muted-foreground">Visible on your public storefront</p>
          </div>
          <Switch checked={form.is_published}
            onCheckedChange={(v) => setForm((f) => ({ ...f, is_published: v }))} />
        </div>

        <div className="flex gap-3 pt-2">
          <Button onClick={save} disabled={saving || uploading} className="flex-1">
            {saving ? 'Saving...' : product ? 'Update Product' : 'Create Product'}
          </Button>
          <Button variant="outline" onClick={() => router.push(`/farm/${farmId}/shop`)}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
