'use client';

import { useState, useEffect, useCallback } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { PriceDisplay } from './price-display';
import { ShoppingCart, Minus, Plus, Trash2, Loader2, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface CartItemWithProduct {
  id: string;
  product_id: string;
  variant_id: string | null;
  quantity: number;
  product_name: string;
  variant_name: string | null;
  price_cents: number;
  image_url: string | null;
  farm_id: string;
  quantity_in_stock: number;
  allow_backorder: number;
}

interface CartSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CartSheet({ open, onOpenChange }: CartSheetProps) {
  const [items, setItems] = useState<CartItemWithProduct[]>([]);
  const [totalCents, setTotalCents] = useState(0);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const router = useRouter();

  const fetchCart = useCallback(async () => {
    try {
      const res = await fetch('/api/cart');
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.items || []);
      setTotalCents(data.total_cents || 0);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setLoading(true);
      fetchCart();
    }
  }, [open, fetchCart]);

  const updateQuantity = async (itemId: string, newQty: number) => {
    setUpdating(itemId);
    try {
      if (newQty <= 0) {
        await fetch(`/api/cart/${itemId}`, { method: 'DELETE' });
      } else {
        await fetch(`/api/cart/${itemId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quantity: newQty }),
        });
      }
      await fetchCart();
      window.dispatchEvent(new Event('cart-updated'));
    } catch {
      toast.error('Failed to update cart');
    } finally {
      setUpdating(null);
    }
  };

  const removeItem = async (itemId: string) => {
    setUpdating(itemId);
    try {
      await fetch(`/api/cart/${itemId}`, { method: 'DELETE' });
      await fetchCart();
      window.dispatchEvent(new Event('cart-updated'));
    } catch {
      toast.error('Failed to remove item');
    } finally {
      setUpdating(null);
    }
  };

  const handleCheckout = () => {
    onOpenChange(false);
    router.push('/shops/checkout');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Your Cart
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ShoppingBag className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-sm font-medium">Your cart is empty</p>
              <p className="text-xs text-muted-foreground mt-1">
                Browse farm shops to find products
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-3 p-3 rounded-xl bg-accent/30"
                >
                  {/* Product image */}
                  <div className="w-16 h-16 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                    {item.image_url ? (
                      <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">🌱</div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.product_name}</p>
                    {item.variant_name && (
                      <p className="text-xs text-muted-foreground">{item.variant_name}</p>
                    )}
                    <PriceDisplay cents={item.price_cents} className="text-sm" />

                    {/* Quantity stepper */}
                    <div className="flex items-center gap-2 mt-1.5">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        disabled={updating === item.id}
                        className="flex items-center justify-center w-7 h-7 rounded-md border border-border hover:bg-accent transition-colors"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="text-sm font-medium w-6 text-center">
                        {updating === item.id ? (
                          <Loader2 className="h-3 w-3 animate-spin mx-auto" />
                        ) : (
                          item.quantity
                        )}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        disabled={updating === item.id}
                        className="flex items-center justify-center w-7 h-7 rounded-md border border-border hover:bg-accent transition-colors"
                        aria-label="Increase quantity"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => removeItem(item.id)}
                        disabled={updating === item.id}
                        className="ml-auto flex items-center justify-center w-7 h-7 rounded-md text-destructive hover:bg-destructive/10 transition-colors"
                        aria-label="Remove item"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer with total and checkout */}
        {items.length > 0 && (
          <div className="border-t border-border pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Subtotal</span>
              <PriceDisplay cents={totalCents} className="text-lg font-bold" />
            </div>
            <p className="text-xs text-muted-foreground">
              Shipping and taxes calculated at checkout
            </p>
            <Button
              onClick={handleCheckout}
              className="w-full"
              size="lg"
            >
              Checkout
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
