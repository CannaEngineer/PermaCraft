'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AddToCartButtonProps {
  productId: string;
  variantId?: string | null;
  disabled?: boolean;
  size?: 'sm' | 'default' | 'lg';
  className?: string;
  variant?: 'default' | 'outline';
}

export function AddToCartButton({
  productId,
  variantId,
  disabled,
  size = 'default',
  className,
  variant = 'default',
}: AddToCartButtonProps) {
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  const handleAdd = async () => {
    setAdding(true);
    try {
      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: productId,
          variant_id: variantId || undefined,
          quantity: 1,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to add to cart');
      }

      setAdded(true);
      toast.success('Added to cart');
      window.dispatchEvent(new Event('cart-updated'));
      setTimeout(() => setAdded(false), 2000);
    } catch (err: any) {
      toast.error(err.message || 'Failed to add to cart');
    } finally {
      setAdding(false);
    }
  };

  return (
    <Button
      onClick={handleAdd}
      disabled={disabled || adding}
      size={size}
      variant={variant}
      className={cn('transition-all', className)}
    >
      {adding ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : added ? (
        <Check className="w-4 h-4 mr-2" />
      ) : (
        <ShoppingCart className="w-4 h-4 mr-2" />
      )}
      {adding ? 'Adding...' : added ? 'Added!' : 'Add to Cart'}
    </Button>
  );
}
