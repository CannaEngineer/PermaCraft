'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PriceDisplay } from '@/components/shop/price-display';
import {
  ArrowLeft, ArrowRight, ShoppingCart, Truck, CreditCard, CheckCircle2,
  Loader2, Package, AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

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
}

type Step = 'review' | 'shipping' | 'payment' | 'confirmation';

const STEPS: { id: Step; label: string; icon: typeof ShoppingCart }[] = [
  { id: 'review', label: 'Review', icon: ShoppingCart },
  { id: 'shipping', label: 'Shipping', icon: Truck },
  { id: 'payment', label: 'Payment', icon: CreditCard },
  { id: 'confirmation', label: 'Confirmed', icon: CheckCircle2 },
];

interface CheckoutClientProps {
  userId: string;
  userName: string | null;
}

export function CheckoutClient({ userId, userName }: CheckoutClientProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>('review');
  const [items, setItems] = useState<CartItemWithProduct[]>([]);
  const [totalCents, setTotalCents] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);

  // Shipping form
  const [buyerName, setBuyerName] = useState(userName || '');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [orderNotes, setOrderNotes] = useState('');

  const fetchCart = useCallback(async () => {
    try {
      const res = await fetch('/api/cart');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setItems(data.items || []);
      setTotalCents(data.total_cents || 0);
    } catch {
      toast.error('Failed to load cart');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const handlePlaceOrder = async () => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyer_name: buyerName.trim() || null,
          buyer_email: buyerEmail.trim() || null,
          buyer_phone: buyerPhone.trim() || null,
          shipping_address: shippingAddress.trim() || null,
          order_notes: orderNotes.trim() || null,
          fulfillment_type: 'shipping',
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to place order');
      }

      const data = await res.json();
      setOrders(data.orders || []);
      setStep('confirmation');
      window.dispatchEvent(new Event('cart-updated'));
      toast.success('Order placed successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to place order');
    } finally {
      setSubmitting(false);
    }
  };

  const currentStepIndex = STEPS.findIndex(s => s.id === step);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (items.length === 0 && step !== 'confirmation') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <ShoppingCart className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
        <h2 className="text-lg font-semibold mb-1">Your cart is empty</h2>
        <p className="text-sm text-muted-foreground mb-4">Add items before checking out.</p>
        <Link
          href="/shops"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Browse Shops
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 sm:p-6 pb-20 md:pb-6">
      {/* Back link */}
      {step !== 'confirmation' && (
        <Link
          href="/shops"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to shops
        </Link>
      )}

      {/* Step indicators */}
      <div className="flex items-center gap-1 mb-8">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const isActive = i === currentStepIndex;
          const isDone = i < currentStepIndex;
          return (
            <div key={s.id} className="flex items-center gap-1 flex-1">
              <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                isActive ? 'bg-primary text-primary-foreground' :
                isDone ? 'bg-primary/10 text-primary' :
                'text-muted-foreground'
              }`}>
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-px ${isDone ? 'bg-primary' : 'bg-border'}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step: Review */}
      {step === 'review' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Review Your Order</h2>
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl bg-accent/30">
                <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                  {item.image_url ? (
                    <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xl">🌱</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.product_name}</p>
                  {item.variant_name && (
                    <p className="text-xs text-muted-foreground">{item.variant_name}</p>
                  )}
                  <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                </div>
                <PriceDisplay cents={item.price_cents * item.quantity} className="text-sm font-medium" />
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between pt-3 border-t">
            <span className="font-medium">Subtotal</span>
            <PriceDisplay cents={totalCents} className="text-lg font-bold" />
          </div>
          <Button onClick={() => setStep('shipping')} className="w-full" size="lg">
            Continue to Shipping
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      )}

      {/* Step: Shipping */}
      {step === 'shipping' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Shipping Information</h2>
          <div className="space-y-3">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                placeholder="Your full name"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={buyerEmail}
                onChange={(e) => setBuyerEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone (optional)</Label>
              <Input
                id="phone"
                type="tel"
                value={buyerPhone}
                onChange={(e) => setBuyerPhone(e.target.value)}
                placeholder="+1 (555) 123-4567"
              />
            </div>
            <div>
              <Label htmlFor="address">Shipping Address</Label>
              <Textarea
                id="address"
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                placeholder="Street address, city, state, zip"
                rows={3}
                className="resize-none"
              />
            </div>
            <div>
              <Label htmlFor="notes">Order Notes (optional)</Label>
              <Textarea
                id="notes"
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                placeholder="Any special instructions..."
                rows={2}
                className="resize-none"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setStep('review')} className="flex-1">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button onClick={() => setStep('payment')} className="flex-1">
              Continue
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* Step: Payment (stub) */}
      {step === 'payment' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Payment</h2>
          <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  Payment processing coming soon
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                  Orders are placed as pending. The farmer will contact you to arrange payment.
                </p>
              </div>
            </div>
          </div>

          {/* Order summary */}
          <div className="rounded-xl bg-accent/30 p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal ({items.length} items)</span>
              <PriceDisplay cents={totalCents} />
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Shipping</span>
              <span>Calculated by farmer</span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Tax</span>
              <span>Calculated by farmer</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-medium">
              <span>Estimated Total</span>
              <PriceDisplay cents={totalCents} className="font-bold" />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setStep('shipping')} className="flex-1">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button
              onClick={handlePlaceOrder}
              disabled={submitting}
              className="flex-1"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Package className="h-4 w-4 mr-2" />
              )}
              {submitting ? 'Placing Order...' : 'Place Order'}
            </Button>
          </div>
        </div>
      )}

      {/* Step: Confirmation */}
      {step === 'confirmation' && (
        <div className="text-center space-y-6 py-8">
          <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Order Placed!</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Your order has been submitted. The farmer will confirm and arrange fulfillment.
            </p>
          </div>

          {orders.length > 0 && (
            <div className="space-y-3 text-left">
              {orders.map((order: any) => (
                <div key={order.id} className="rounded-xl bg-accent/30 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Order #{order.order_number}</span>
                    <span className="text-xs text-muted-foreground capitalize px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                      {order.status}
                    </span>
                  </div>
                  <PriceDisplay cents={order.subtotal_cents} className="text-sm" />
                  {order.items && (
                    <div className="mt-2 space-y-1">
                      {order.items.map((item: any) => (
                        <p key={item.id} className="text-xs text-muted-foreground">
                          {item.product_name} x{item.quantity}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Button onClick={() => router.push('/shops')} className="w-full">
              Continue Shopping
            </Button>
            <Button variant="outline" onClick={() => router.push('/canvas')} className="w-full">
              Back to Canvas
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
