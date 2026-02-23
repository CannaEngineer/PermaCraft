import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockDb } from '@/test/helpers/mock-db';
import { createMockSession, mockUser } from '@/test/helpers/mock-session';

const mockDb = createMockDb();
const mockAuth = createMockSession();

vi.mock('@/lib/db', () => ({ db: mockDb }));
vi.mock('@/lib/auth/session', () => ({ getSession: mockAuth.getSession }));

const { GET, POST } = await import('@/app/api/journal/entries/route');

describe('Journal Entries API', () => {
  beforeEach(() => {
    mockDb.reset();
    mockAuth.reset();
  });

  // ─── GET ────────────────────────────────────────────────────────────────────

  describe('GET', () => {
    function makeRequest(params: Record<string, string> = {}) {
      const url = new URL('http://localhost/api/journal/entries');
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
      }
      return new Request(url.toString()) as any;
    }

    it('returns 401 when not authenticated', async () => {
      mockAuth.setAuthenticated(false);
      const req = makeRequest({ farm_id: 'farm-1' });
      const res = await GET(req);
      expect(res.status).toBe(401);
    });

    it('returns 400 when farm_id is missing', async () => {
      mockAuth.setAuthenticated(true);
      const req = makeRequest();
      const res = await GET(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('farm_id');
    });

    it('returns 404 when farm not found', async () => {
      mockAuth.setAuthenticated(true);
      // Farm lookup returns no rows
      mockDb.setResult({ rows: [] });

      const req = makeRequest({ farm_id: 'nonexistent' });
      const res = await GET(req);
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBe('Farm not found');
    });

    it('returns 403 when farm is private and not owned by user', async () => {
      mockAuth.setAuthenticated(true);
      // Farm exists but belongs to another user and is not public
      mockDb.setResult({
        rows: [{ id: 'farm-1', user_id: 'other-user', is_public: 0 }],
      });

      const req = makeRequest({ farm_id: 'farm-1' });
      const res = await GET(req);
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toBe('Access denied');
    });

    it('allows access to public farms owned by others', async () => {
      mockAuth.setAuthenticated(true);

      const entries = [
        {
          id: 'je-1',
          farm_id: 'farm-1',
          author_id: 'other-user',
          entry_date: 1700000000,
          title: 'First planting day',
          content: 'Planted comfrey today.',
          media_urls: null,
          weather: 'Sunny',
          tags: '["planting"]',
          is_shared_to_community: 1,
          created_at: 1700000000,
          updated_at: 1700000000,
        },
      ];

      mockDb.setResults([
        // Farm lookup: public farm owned by other-user
        { rows: [{ id: 'farm-1', user_id: 'other-user', is_public: 1 }] },
        // Entries query
        { rows: entries },
      ]);

      const req = makeRequest({ farm_id: 'farm-1' });
      const res = await GET(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.entries).toHaveLength(1);
      expect(data.entries[0].title).toBe('First planting day');
    });

    it('returns entries paginated with hasMore flag', async () => {
      mockAuth.setAuthenticated(true);

      // Create 21 entries to simulate a full page + 1 (hasMore = true)
      const entries = Array.from({ length: 21 }, (_, i) => ({
        id: `je-${i}`,
        farm_id: 'farm-1',
        author_id: mockUser.id,
        entry_date: 1700000000 - i * 86400,
        title: `Entry ${i}`,
        content: `Content for entry ${i}`,
        created_at: 1700000000,
        updated_at: 1700000000,
      }));

      mockDb.setResults([
        // Farm lookup
        { rows: [{ id: 'farm-1', user_id: mockUser.id, is_public: 0 }] },
        // Entries query (limit + 1 rows returned means hasMore = true)
        { rows: entries },
      ]);

      const req = makeRequest({ farm_id: 'farm-1', page: '1', limit: '20' });
      const res = await GET(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.entries).toHaveLength(20); // Should be sliced to limit
      expect(data.hasMore).toBe(true);
    });

    it('returns hasMore=false when fewer entries than limit', async () => {
      mockAuth.setAuthenticated(true);

      mockDb.setResults([
        { rows: [{ id: 'farm-1', user_id: mockUser.id, is_public: 0 }] },
        {
          rows: [
            {
              id: 'je-1',
              farm_id: 'farm-1',
              author_id: mockUser.id,
              entry_date: 1700000000,
              title: 'Only entry',
              content: 'Just one.',
              created_at: 1700000000,
              updated_at: 1700000000,
            },
          ],
        },
      ]);

      const req = makeRequest({ farm_id: 'farm-1' });
      const res = await GET(req);
      const data = await res.json();
      expect(data.entries).toHaveLength(1);
      expect(data.hasMore).toBe(false);
    });

    it('allows the farm owner to access their own private farm', async () => {
      mockAuth.setAuthenticated(true);

      mockDb.setResults([
        // Farm is private but owned by the current user
        { rows: [{ id: 'farm-1', user_id: mockUser.id, is_public: 0 }] },
        { rows: [] },
      ]);

      const req = makeRequest({ farm_id: 'farm-1' });
      const res = await GET(req);
      expect(res.status).toBe(200);
    });
  });

  // ─── POST ───────────────────────────────────────────────────────────────────

  describe('POST', () => {
    function makeRequest(body: unknown) {
      return new Request('http://localhost/api/journal/entries', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
      }) as any;
    }

    it('returns 401 when not authenticated', async () => {
      mockAuth.setAuthenticated(false);
      const req = makeRequest({
        farm_id: 'farm-1',
        content: 'test',
        entry_date: 1700000000,
      });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it('returns 400 when missing required fields (farm_id)', async () => {
      mockAuth.setAuthenticated(true);
      const req = makeRequest({ content: 'test', entry_date: 1700000000 });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('Missing required fields');
    });

    it('returns 400 when missing required fields (content)', async () => {
      mockAuth.setAuthenticated(true);
      const req = makeRequest({ farm_id: 'farm-1', entry_date: 1700000000 });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('Missing required fields');
    });

    it('returns 400 when missing required fields (entry_date)', async () => {
      mockAuth.setAuthenticated(true);
      const req = makeRequest({ farm_id: 'farm-1', content: 'test' });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('Missing required fields');
    });

    it('returns 403 when farm not owned by user', async () => {
      mockAuth.setAuthenticated(true);
      // Farm ownership check returns no rows
      mockDb.setResult({ rows: [] });

      const req = makeRequest({
        farm_id: 'other-farm',
        content: 'test entry',
        entry_date: 1700000000,
      });
      const res = await POST(req);
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain('Farm not found or access denied');
    });

    it('creates entry successfully', async () => {
      mockAuth.setAuthenticated(true);

      mockDb.setResults([
        // Farm ownership check passes
        { rows: [{ id: 'farm-1' }] },
        // INSERT succeeds
        { rows: [] },
      ]);

      const req = makeRequest({
        farm_id: 'farm-1',
        content: 'Observed a swarm of pollinators near the comfrey patch.',
        entry_date: 1700000000,
        title: 'Pollinator Activity',
        weather: 'Partly cloudy, 72F',
        tags: '["observation","pollinators"]',
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.id).toBeDefined();
    });

    it('creates a community post when is_shared_to_community is 1', async () => {
      mockAuth.setAuthenticated(true);

      mockDb.setResults([
        // Farm ownership check
        { rows: [{ id: 'farm-1' }] },
        // INSERT journal entry
        { rows: [] },
        // INSERT farm_posts
        { rows: [] },
      ]);

      const req = makeRequest({
        farm_id: 'farm-1',
        content: 'Shared observation.',
        entry_date: 1700000000,
        is_shared_to_community: 1,
      });
      const res = await POST(req);
      expect(res.status).toBe(200);

      // Verify 3 db calls were made (ownership check + journal entry + farm post)
      expect(mockDb.execute).toHaveBeenCalledTimes(3);
      const postInsertCall = mockDb.execute.mock.calls[2][0];
      expect(postInsertCall.sql).toContain('farm_posts');
    });

    it('does not create a community post when is_shared_to_community is 0', async () => {
      mockAuth.setAuthenticated(true);

      mockDb.setResults([
        { rows: [{ id: 'farm-1' }] },
        { rows: [] },
      ]);

      const req = makeRequest({
        farm_id: 'farm-1',
        content: 'Private note.',
        entry_date: 1700000000,
        is_shared_to_community: 0,
      });
      const res = await POST(req);
      expect(res.status).toBe(200);

      // Only 2 db calls: ownership check + journal entry insert
      expect(mockDb.execute).toHaveBeenCalledTimes(2);
    });

    it('uses provided id when given', async () => {
      mockAuth.setAuthenticated(true);

      mockDb.setResults([
        { rows: [{ id: 'farm-1' }] },
        { rows: [] },
      ]);

      const customId = 'custom-entry-id';
      const req = makeRequest({
        id: customId,
        farm_id: 'farm-1',
        content: 'Entry with custom id.',
        entry_date: 1700000000,
      });
      const res = await POST(req);
      const data = await res.json();
      expect(data.id).toBe(customId);
    });
  });
});
