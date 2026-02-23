import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockDb } from '@/test/helpers/mock-db';
import { createMockSession, mockUser } from '@/test/helpers/mock-session';

const mockDb = createMockDb();
const mockAuth = createMockSession();

vi.mock('@/lib/db', () => ({ db: mockDb }));
vi.mock('@/lib/auth/session', () => ({ getSession: mockAuth.getSession }));

const { POST } = await import('@/app/api/orders/route');

describe('Orders API', () => {
  beforeEach(() => {
    mockDb.reset();
    mockAuth.reset();
  });

  function makeRequest(body?: unknown) {
    return new Request('http://localhost/api/orders', {
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // ─── POST ───────────────────────────────────────────────────────────────────

  describe('POST', () => {
    it('returns 401 when not authenticated', async () => {
      mockAuth.setAuthenticated(false);
      const req = makeRequest({});
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it('returns 400 when cart is empty', async () => {
      mockAuth.setAuthenticated(true);
      // Cart query returns empty rows
      mockDb.setResult({ rows: [] });

      const req = makeRequest({});
      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('Cart is empty');
    });

    it('returns 400 when a product is no longer published', async () => {
      mockAuth.setAuthenticated(true);
      mockDb.setResult({
        rows: [
          {
            id: 'ci-1',
            product_id: 'prod-1',
            variant_id: null,
            quantity: 1,
            product_name: 'Discontinued Seeds',
            variant_name: null,
            price_cents: 500,
            variant_price_cents: null,
            farm_id: 'farm-1',
            quantity_in_stock: 10,
            allow_backorder: 0,
            is_published: 0, // Not published
          },
        ],
      });

      const req = makeRequest({});
      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('no longer available');
    });

    it('returns 400 when insufficient stock and no backorder', async () => {
      mockAuth.setAuthenticated(true);
      mockDb.setResult({
        rows: [
          {
            id: 'ci-1',
            product_id: 'prod-1',
            variant_id: null,
            quantity: 20,
            product_name: 'Rare Seeds',
            variant_name: null,
            price_cents: 300,
            variant_price_cents: null,
            farm_id: 'farm-1',
            quantity_in_stock: 5, // Less than quantity requested
            allow_backorder: 0,
            is_published: 1,
          },
        ],
      });

      const req = makeRequest({});
      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('Insufficient stock');
      expect(data.error).toContain('Available: 5');
    });

    it('creates orders grouped by farm', async () => {
      mockAuth.setAuthenticated(true);

      const cartRows = [
        {
          id: 'ci-1',
          product_id: 'prod-1',
          variant_id: null,
          quantity: 2,
          product_name: 'Comfrey Seeds',
          variant_name: null,
          price_cents: 500,
          variant_price_cents: null,
          farm_id: 'farm-a',
          quantity_in_stock: 100,
          allow_backorder: 0,
          is_published: 1,
        },
        {
          id: 'ci-2',
          product_id: 'prod-2',
          variant_id: null,
          quantity: 1,
          product_name: 'Mulch Pack',
          variant_name: null,
          price_cents: 1200,
          variant_price_cents: null,
          farm_id: 'farm-b',
          quantity_in_stock: 50,
          allow_backorder: 0,
          is_published: 1,
        },
        {
          id: 'ci-3',
          product_id: 'prod-3',
          variant_id: null,
          quantity: 3,
          product_name: 'Cover Crop Mix',
          variant_name: null,
          price_cents: 800,
          variant_price_cents: null,
          farm_id: 'farm-a', // Same farm as ci-1
          quantity_in_stock: 200,
          allow_backorder: 0,
          is_published: 1,
        },
      ];

      // Build the sequence of db calls:
      // 1. Cart fetch
      // Then per farm group (2 farms):
      //   - INSERT order
      //   - INSERT order_items (one per cart item in that farm)
      //   - SELECT order
      //   - SELECT order_items
      // Then: DELETE cart
      const orderRow1 = {
        id: 'order-1',
        order_number: 'ORD-test-1',
        farm_id: 'farm-a',
        buyer_id: mockUser.id,
        status: 'pending',
        subtotal_cents: 3400,
        total_cents: 3400,
      };
      const orderRow2 = {
        id: 'order-2',
        order_number: 'ORD-test-2',
        farm_id: 'farm-b',
        buyer_id: mockUser.id,
        status: 'pending',
        subtotal_cents: 1200,
        total_cents: 1200,
      };

      mockDb.setResults([
        // 1. Cart fetch
        { rows: cartRows },
        // Farm A order:
        { rows: [] },                        // INSERT shop_orders
        { rows: [] },                        // INSERT order_items (ci-1)
        { rows: [] },                        // INSERT order_items (ci-3)
        { rows: [orderRow1] },               // SELECT order
        { rows: [{ id: 'oi-1' }, { id: 'oi-3' }] }, // SELECT order_items
        // Farm B order:
        { rows: [] },                        // INSERT shop_orders
        { rows: [] },                        // INSERT order_items (ci-2)
        { rows: [orderRow2] },               // SELECT order
        { rows: [{ id: 'oi-2' }] },          // SELECT order_items
        // Clear cart
        { rows: [] },
      ]);

      const req = makeRequest({ buyer_name: 'Jane Doe' });
      const res = await POST(req);
      expect(res.status).toBe(201);

      const data = await res.json();
      expect(data.orders).toHaveLength(2);

      // Verify the two orders correspond to the two farms
      const farmIds = data.orders.map((o: any) => o.farm_id);
      expect(farmIds).toContain('farm-a');
      expect(farmIds).toContain('farm-b');
    });

    it('clears cart after successful order creation', async () => {
      mockAuth.setAuthenticated(true);

      mockDb.setResults([
        // Cart fetch: single item
        {
          rows: [
            {
              id: 'ci-1',
              product_id: 'prod-1',
              variant_id: null,
              quantity: 1,
              product_name: 'Seeds',
              variant_name: null,
              price_cents: 500,
              variant_price_cents: null,
              farm_id: 'farm-1',
              quantity_in_stock: 100,
              allow_backorder: 0,
              is_published: 1,
            },
          ],
        },
        // INSERT shop_orders
        { rows: [] },
        // INSERT order_items
        { rows: [] },
        // SELECT order
        { rows: [{ id: 'order-1', farm_id: 'farm-1', total_cents: 500 }] },
        // SELECT order_items
        { rows: [{ id: 'oi-1' }] },
        // DELETE cart_items
        { rows: [] },
      ]);

      const req = makeRequest({});
      const res = await POST(req);
      expect(res.status).toBe(201);

      // Verify the last db call was a DELETE on cart_items
      const lastCall = mockDb.execute.mock.calls[mockDb.execute.mock.calls.length - 1][0];
      expect(lastCall.sql).toContain('DELETE');
      expect(lastCall.sql).toContain('cart_items');
      expect(lastCall.args).toContain(mockUser.id);
    });

    it('allows backorder when allow_backorder is enabled', async () => {
      mockAuth.setAuthenticated(true);

      mockDb.setResults([
        {
          rows: [
            {
              id: 'ci-1',
              product_id: 'prod-1',
              variant_id: null,
              quantity: 50,
              product_name: 'Bulk Seeds',
              variant_name: null,
              price_cents: 100,
              variant_price_cents: null,
              farm_id: 'farm-1',
              quantity_in_stock: 5, // Much less than quantity
              allow_backorder: 1, // But backorder is allowed
              is_published: 1,
            },
          ],
        },
        { rows: [] }, // INSERT order
        { rows: [] }, // INSERT order_item
        { rows: [{ id: 'order-1', farm_id: 'farm-1', total_cents: 5000 }] },
        { rows: [{ id: 'oi-1' }] },
        { rows: [] }, // DELETE cart
      ]);

      const req = makeRequest({});
      const res = await POST(req);
      // Should succeed because backorder is allowed
      expect(res.status).toBe(201);
    });

    it('uses variant pricing when variant_price_cents is set', async () => {
      mockAuth.setAuthenticated(true);

      mockDb.setResults([
        {
          rows: [
            {
              id: 'ci-1',
              product_id: 'prod-1',
              variant_id: 'var-1',
              quantity: 2,
              product_name: 'Seed Pack',
              variant_name: 'Premium',
              price_cents: 500,
              variant_price_cents: 800, // Should use 800 not 500
              farm_id: 'farm-1',
              quantity_in_stock: 10,
              allow_backorder: 0,
              is_published: 1,
            },
          ],
        },
        { rows: [] }, // INSERT order
        { rows: [] }, // INSERT order_item
        { rows: [{ id: 'order-1', farm_id: 'farm-1', total_cents: 1600 }] },
        { rows: [{ id: 'oi-1' }] },
        { rows: [] }, // DELETE cart
      ]);

      const req = makeRequest({});
      const res = await POST(req);
      expect(res.status).toBe(201);

      // Verify that the order INSERT used the correct subtotal (800 * 2 = 1600)
      const orderInsertCall = mockDb.execute.mock.calls[1][0];
      expect(orderInsertCall.sql).toContain('shop_orders');
      // subtotal_cents is the 5th arg (index 4)
      expect(orderInsertCall.args[4]).toBe(1600);
    });

    it('returns 400 for invalid fulfillment_type', async () => {
      mockAuth.setAuthenticated(true);

      const req = makeRequest({ fulfillment_type: 'teleportation' });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });
  });
});
