import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockDb } from '@/test/helpers/mock-db';
import { createMockSession, mockUser } from '@/test/helpers/mock-session';

const mockDb = createMockDb();
const mockAuth = createMockSession();

vi.mock('@/lib/db', () => ({ db: mockDb }));
vi.mock('@/lib/auth/session', () => ({ getSession: mockAuth.getSession }));

const { GET, POST, DELETE } = await import('@/app/api/cart/route');

describe('Cart API', () => {
  beforeEach(() => {
    mockDb.reset();
    mockAuth.reset();
  });

  // ─── GET ────────────────────────────────────────────────────────────────────

  describe('GET', () => {
    it('returns 401 when not authenticated', async () => {
      mockAuth.setAuthenticated(false);
      const res = await GET();
      expect(res.status).toBe(401);
    });

    it('returns cart items with product details', async () => {
      mockAuth.setAuthenticated(true);
      mockDb.setResult({
        rows: [
          {
            id: 'ci-1',
            product_id: 'prod-1',
            variant_id: null,
            quantity: 2,
            added_at: 1000,
            product_name: 'Comfrey Seeds',
            price_cents: 500,
            image_url: null,
            farm_id: 'farm-1',
            quantity_in_stock: 10,
            allow_backorder: 0,
            is_published: 1,
            variant_name: null,
            variant_price_cents: null,
          },
        ],
      });

      const res = await GET();
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.items).toHaveLength(1);
      expect(data.items[0].product_name).toBe('Comfrey Seeds');
      expect(data.items[0].price_cents).toBe(500);
      expect(data.total_cents).toBe(1000); // 500 * 2
    });

    it('uses variant price when available', async () => {
      mockAuth.setAuthenticated(true);
      mockDb.setResult({
        rows: [
          {
            id: 'ci-2',
            product_id: 'prod-2',
            variant_id: 'var-1',
            quantity: 1,
            added_at: 2000,
            product_name: 'Mulch Pack',
            price_cents: 1000,
            image_url: 'https://example.com/mulch.jpg',
            farm_id: 'farm-1',
            quantity_in_stock: 50,
            allow_backorder: 0,
            is_published: 1,
            variant_name: 'Large Bag',
            variant_price_cents: 1500,
          },
        ],
      });

      const res = await GET();
      const data = await res.json();
      expect(data.items[0].price_cents).toBe(1500);
      expect(data.items[0].variant_name).toBe('Large Bag');
      expect(data.total_cents).toBe(1500);
    });

    it('returns empty items and zero total when cart is empty', async () => {
      mockAuth.setAuthenticated(true);
      mockDb.setResult({ rows: [] });

      const res = await GET();
      const data = await res.json();
      expect(data.items).toHaveLength(0);
      expect(data.total_cents).toBe(0);
    });

    it('calculates total correctly for multiple items', async () => {
      mockAuth.setAuthenticated(true);
      mockDb.setResult({
        rows: [
          {
            id: 'ci-1',
            product_id: 'prod-1',
            variant_id: null,
            quantity: 3,
            added_at: 1000,
            product_name: 'Seeds',
            price_cents: 200,
            image_url: null,
            farm_id: 'farm-1',
            quantity_in_stock: 10,
            allow_backorder: 0,
            is_published: 1,
            variant_name: null,
            variant_price_cents: null,
          },
          {
            id: 'ci-2',
            product_id: 'prod-2',
            variant_id: null,
            quantity: 1,
            added_at: 2000,
            product_name: 'Fertilizer',
            price_cents: 1200,
            image_url: null,
            farm_id: 'farm-1',
            quantity_in_stock: 5,
            allow_backorder: 0,
            is_published: 1,
            variant_name: null,
            variant_price_cents: null,
          },
        ],
      });

      const res = await GET();
      const data = await res.json();
      expect(data.items).toHaveLength(2);
      // 200*3 + 1200*1 = 1800
      expect(data.total_cents).toBe(1800);
    });

    it('passes user id to the SQL query', async () => {
      mockAuth.setAuthenticated(true);
      mockDb.setResult({ rows: [] });

      await GET();

      expect(mockDb.execute).toHaveBeenCalledTimes(1);
      const call = mockDb.execute.mock.calls[0][0];
      expect(call.args).toContain(mockUser.id);
    });
  });

  // ─── POST ───────────────────────────────────────────────────────────────────

  describe('POST', () => {
    function makeRequest(body: unknown) {
      return new Request('http://localhost/api/cart', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
      });
    }

    it('returns 401 when not authenticated', async () => {
      mockAuth.setAuthenticated(false);
      const req = makeRequest({ product_id: 'prod-1', quantity: 1 });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it('returns 400 for invalid JSON body', async () => {
      mockAuth.setAuthenticated(true);
      const req = new Request('http://localhost/api/cart', {
        method: 'POST',
        body: 'not-json',
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('Invalid JSON body');
    });

    it('returns 400 when product_id is missing', async () => {
      mockAuth.setAuthenticated(true);
      const req = makeRequest({ quantity: 1 });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBeDefined();
    });

    it('returns 404 when product does not exist', async () => {
      mockAuth.setAuthenticated(true);
      // Product lookup returns empty
      mockDb.setResult({ rows: [] });

      const req = makeRequest({ product_id: 'nonexistent', quantity: 1 });
      const res = await POST(req);
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBe('Product not found');
    });

    it('returns 400 when product is not published', async () => {
      mockAuth.setAuthenticated(true);
      mockDb.setResult({ rows: [{ id: 'prod-1', is_published: 0 }] });

      const req = makeRequest({ product_id: 'prod-1', quantity: 1 });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('Product is not available');
    });

    it('adds new item to cart (returns 201)', async () => {
      mockAuth.setAuthenticated(true);

      const cartItem = {
        id: 'ci-new',
        user_id: mockUser.id,
        product_id: 'prod-1',
        variant_id: null,
        quantity: 1,
        added_at: 1000,
      };

      mockDb.setResults([
        // 1. Product lookup
        { rows: [{ id: 'prod-1', is_published: 1 }] },
        // 2. Existing cart item check (none found)
        { rows: [] },
        // 3. INSERT cart item
        { rows: [] },
        // 4. Fetch upserted item
        { rows: [cartItem] },
        // 5. Count total items
        { rows: [{ cart_count: 1 }] },
      ]);

      const req = makeRequest({ product_id: 'prod-1', quantity: 1 });
      const res = await POST(req);

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.item).toBeDefined();
      expect(data.item.product_id).toBe('prod-1');
      expect(data.cart_count).toBe(1);
    });

    it('upserts when product already in cart (UPDATE call)', async () => {
      mockAuth.setAuthenticated(true);

      mockDb.setResults([
        // 1. Product lookup
        { rows: [{ id: 'prod-1', is_published: 1 }] },
        // 2. Existing cart item found with quantity 2
        { rows: [{ id: 'ci-existing', quantity: 2 }] },
        // 3. UPDATE existing cart item
        { rows: [] },
        // 4. Fetch upserted item
        { rows: [{ id: 'ci-existing', quantity: 5, product_id: 'prod-1' }] },
        // 5. Count total items
        { rows: [{ cart_count: 5 }] },
      ]);

      const req = makeRequest({ product_id: 'prod-1', quantity: 3 });
      const res = await POST(req);

      expect(res.status).toBe(201);

      // Verify the UPDATE call was made (3rd db.execute call)
      const updateCall = mockDb.execute.mock.calls[2][0];
      expect(updateCall.sql).toContain('UPDATE');
      // New quantity should be 2 + 3 = 5
      expect(updateCall.args[0]).toBe(5);
    });

    it('returns 404 when variant does not belong to product', async () => {
      mockAuth.setAuthenticated(true);

      mockDb.setResults([
        // 1. Product lookup (published)
        { rows: [{ id: 'prod-1', is_published: 1 }] },
        // 2. Variant lookup (not found)
        { rows: [] },
      ]);

      const req = makeRequest({
        product_id: 'prod-1',
        variant_id: 'bad-variant',
        quantity: 1,
      });
      const res = await POST(req);

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBe('Variant not found for this product');
    });

    it('defaults quantity to 1 if not specified', async () => {
      mockAuth.setAuthenticated(true);

      mockDb.setResults([
        { rows: [{ id: 'prod-1', is_published: 1 }] },
        { rows: [] }, // no existing cart item
        { rows: [] }, // INSERT
        { rows: [{ id: 'ci-new', product_id: 'prod-1', quantity: 1 }] },
        { rows: [{ cart_count: 1 }] },
      ]);

      const req = makeRequest({ product_id: 'prod-1' });
      const res = await POST(req);

      expect(res.status).toBe(201);

      // Verify the INSERT included quantity = 1
      const insertCall = mockDb.execute.mock.calls[2][0];
      expect(insertCall.sql).toContain('INSERT');
      // args: [itemId, userId, product_id, variant_id, quantity]
      expect(insertCall.args[4]).toBe(1);
    });
  });

  // ─── DELETE ─────────────────────────────────────────────────────────────────

  describe('DELETE', () => {
    it('returns 401 when not authenticated', async () => {
      mockAuth.setAuthenticated(false);
      const res = await DELETE();
      expect(res.status).toBe(401);
    });

    it('clears all cart items for the user', async () => {
      mockAuth.setAuthenticated(true);
      mockDb.setResult({ rows: [] });

      const res = await DELETE();
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);

      // Verify DELETE query was called with user id
      expect(mockDb.execute).toHaveBeenCalledTimes(1);
      const call = mockDb.execute.mock.calls[0][0];
      expect(call.sql).toContain('DELETE');
      expect(call.args).toContain(mockUser.id);
    });
  });
});
