'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';

interface ShopSettings {
  id: string;
  name: string;
  is_shop_enabled: number;
  shop_headline: string | null;
  shop_policy: string | null;
  accepts_pickup: number;
  accepts_shipping: number;
  accepts_delivery: number;
}

export function ShopSettingsForm({ farmId, initial }: { farmId: string; initial: ShopSettings }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    is_shop_enabled: initial.is_shop_enabled === 1,
    shop_headline: initial.shop_headline ?? '',
    shop_policy: initial.shop_policy ?? '',
    accepts_pickup: initial.accepts_pickup === 1,
    accepts_shipping: initial.accepts_shipping === 1,
    accepts_delivery: initial.accepts_delivery === 1,
  });

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/shops/${farmId}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_shop_enabled: settings.is_shop_enabled ? 1 : 0,
          shop_headline: settings.shop_headline || null,
          shop_policy: settings.shop_policy || null,
          accepts_pickup: settings.accepts_pickup ? 1 : 0,
          accepts_shipping: settings.accepts_shipping ? 1 : 0,
          accepts_delivery: settings.accepts_delivery ? 1 : 0,
        }),
      });
      if (!res.ok) throw new Error('Save failed');
      toast({ title: 'Shop settings saved' });
      router.refresh();
    } catch {
      toast({ title: 'Failed to save', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Shop Settings</CardTitle>
        <CardDescription>Configure your farm storefront</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-base font-medium">Enable Shop</Label>
            <p className="text-sm text-muted-foreground">Make your storefront publicly visible</p>
          </div>
          <Switch
            checked={settings.is_shop_enabled}
            onCheckedChange={(v) => setSettings((s) => ({ ...s, is_shop_enabled: v }))}
          />
        </div>

        <div className="space-y-2">
          <Label>Shop Headline</Label>
          <Input
            placeholder="Fresh organic produce from our family farm"
            value={settings.shop_headline}
            onChange={(e) => setSettings((s) => ({ ...s, shop_headline: e.target.value }))}
            maxLength={200}
          />
        </div>

        <div className="space-y-2">
          <Label>Shipping & Returns Policy</Label>
          <Textarea
            placeholder="Describe your shipping times, return policy, pickup options..."
            value={settings.shop_policy}
            onChange={(e) => setSettings((s) => ({ ...s, shop_policy: e.target.value }))}
            rows={4}
          />
        </div>

        <div className="space-y-3">
          <Label className="text-base font-medium">Fulfillment Methods</Label>
          {[
            { key: 'accepts_shipping' as const, label: 'Shipping', desc: 'Ship products to customers' },
            { key: 'accepts_pickup' as const, label: 'Local Pickup', desc: 'Customers pick up from your farm' },
            { key: 'accepts_delivery' as const, label: 'Local Delivery', desc: 'You deliver to nearby customers' },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
              <Switch
                checked={settings[key]}
                onCheckedChange={(v) => setSettings((s) => ({ ...s, [key]: v }))}
              />
            </div>
          ))}
        </div>

        <Button onClick={save} disabled={saving} className="w-full">
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </CardContent>
    </Card>
  );
}
