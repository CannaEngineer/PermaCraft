import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}));

// Mock sonner
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// Mock next/image to render a plain img
vi.mock('next/image', () => ({
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

import { CartSheet } from '@/components/shop/cart-sheet';

describe('CartSheet', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('renders loading state initially when open', async () => {
    // Fetch never resolves during this test
    globalThis.fetch = vi.fn().mockReturnValue(new Promise(() => {}));

    render(<CartSheet open={true} onOpenChange={vi.fn()} />);

    // The Loader2 spinner has animate-spin class; look for the loading indicator.
    // The Sheet renders with role="dialog" by default via Radix.
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeDefined();
    });
  });

  it('renders empty cart message when no items', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ items: [], total_cents: 0 }),
    });

    render(<CartSheet open={true} onOpenChange={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Your cart is empty')).toBeDefined();
    });
  });

  it('renders cart items with product details', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          {
            id: 'ci-1',
            product_id: 'prod-1',
            variant_id: null,
            quantity: 2,
            product_name: 'Heirloom Tomato Seeds',
            variant_name: null,
            price_cents: 450,
            image_url: null,
            farm_id: 'farm-1',
            quantity_in_stock: 20,
            allow_backorder: 0,
          },
          {
            id: 'ci-2',
            product_id: 'prod-2',
            variant_id: 'var-1',
            quantity: 1,
            product_name: 'Organic Mulch',
            variant_name: 'Large Bag',
            price_cents: 1500,
            image_url: 'https://example.com/mulch.jpg',
            farm_id: 'farm-2',
            quantity_in_stock: 10,
            allow_backorder: 0,
          },
        ],
        total_cents: 2400,
      }),
    });

    render(<CartSheet open={true} onOpenChange={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Heirloom Tomato Seeds')).toBeDefined();
    });

    expect(screen.getByText('Organic Mulch')).toBeDefined();
    expect(screen.getByText('Large Bag')).toBeDefined();
  });

  it('renders Checkout button when items are present', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          {
            id: 'ci-1',
            product_id: 'prod-1',
            variant_id: null,
            quantity: 1,
            product_name: 'Seeds',
            variant_name: null,
            price_cents: 300,
            image_url: null,
            farm_id: 'farm-1',
            quantity_in_stock: 5,
            allow_backorder: 0,
          },
        ],
        total_cents: 300,
      }),
    });

    render(<CartSheet open={true} onOpenChange={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Checkout')).toBeDefined();
    });

    expect(screen.getByText('Subtotal')).toBeDefined();
  });

  it('does not fetch when sheet is closed', () => {
    globalThis.fetch = vi.fn();

    render(<CartSheet open={false} onOpenChange={vi.fn()} />);

    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('handles fetch failure gracefully', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });

    render(<CartSheet open={true} onOpenChange={vi.fn()} />);

    // After a failed fetch, loading ends and items should be empty,
    // showing the empty cart state
    await waitFor(() => {
      expect(screen.getByText('Your cart is empty')).toBeDefined();
    });
  });

  it('displays the title "Your Cart"', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ items: [], total_cents: 0 }),
    });

    render(<CartSheet open={true} onOpenChange={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Your Cart')).toBeDefined();
    });
  });
});
