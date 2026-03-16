/**
 * Tests for the existing OfflineQueueManager in queue.ts
 *
 * Verifies the localStorage-based queue works correctly.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock localStorage
const store: Record<string, string> = {};
Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); },
  },
  writable: true,
});

// Mock navigator.onLine
Object.defineProperty(globalThis, 'navigator', {
  value: { onLine: true },
  writable: true,
  configurable: true,
});

// Mock window.addEventListener
Object.defineProperty(globalThis, 'window', {
  value: {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  },
  writable: true,
  configurable: true,
});

// Mock fetch
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

// Mock apiFetch
vi.mock('@/lib/api/fetch-with-retry', () => ({
  apiFetch: vi.fn().mockResolvedValue({}),
  fetchWithRetry: vi.fn().mockResolvedValue(new Response()),
  parseApiResponse: vi.fn().mockResolvedValue({}),
  ApiError: class extends Error {
    statusCode?: number;
    code?: string;
    constructor(msg: string) { super(msg); this.name = 'ApiError'; }
  },
}));

import { offlineQueue, queueOperation, executeOrQueue } from '@/lib/offline/queue';

describe('OfflineQueueManager', () => {
  beforeEach(() => {
    localStorage.clear();
    offlineQueue.clearAll();
    vi.clearAllMocks();
  });

  describe('enqueue', () => {
    it('adds operation to pending queue', () => {
      const id = offlineQueue.enqueue(
        '/api/farms/1/zones',
        { method: 'POST', body: '{}' },
        'Create zone'
      );

      expect(id).toBeDefined();
      expect(offlineQueue.getPendingCount()).toBe(1);
    });

    it('returns unique IDs for each operation', () => {
      const id1 = offlineQueue.enqueue('/url1', {}, 'Op 1');
      const id2 = offlineQueue.enqueue('/url2', {}, 'Op 2');

      expect(id1).not.toBe(id2);
    });

    it('throws when queue is full', () => {
      // Fill up the queue (max 50)
      for (let i = 0; i < 50; i++) {
        offlineQueue.enqueue(`/url${i}`, {}, `Op ${i}`);
      }

      expect(() => {
        offlineQueue.enqueue('/url-overflow', {}, 'Overflow');
      }).toThrow('Queue is full');
    });

    it('persists queue to localStorage', () => {
      offlineQueue.enqueue('/url', {}, 'Test op');

      const stored = localStorage.getItem('offline_queue');
      expect(stored).toBeTruthy();

      const parsed = JSON.parse(stored!);
      expect(parsed.pending).toHaveLength(1);
    });
  });

  describe('subscribe', () => {
    it('calls listener immediately with current state', () => {
      const listener = vi.fn();
      offlineQueue.subscribe(listener);

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          pending: expect.any(Array),
          processing: expect.any(Array),
          failed: expect.any(Array),
        })
      );
    });

    it('calls listener on enqueue', () => {
      const listener = vi.fn();
      offlineQueue.subscribe(listener);
      listener.mockClear();

      offlineQueue.enqueue('/url', {}, 'Test');

      expect(listener).toHaveBeenCalled();
    });

    it('returns unsubscribe function', () => {
      const listener = vi.fn();
      const unsub = offlineQueue.subscribe(listener);
      listener.mockClear();

      unsub();
      offlineQueue.enqueue('/url', {}, 'Test');

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('clearAll', () => {
    it('resets all queue state', () => {
      offlineQueue.enqueue('/url', {}, 'Test');
      expect(offlineQueue.getPendingCount()).toBe(1);

      offlineQueue.clearAll();
      expect(offlineQueue.getPendingCount()).toBe(0);
      expect(offlineQueue.getFailedCount()).toBe(0);
    });
  });

  describe('getState', () => {
    it('returns snapshot of current state', () => {
      const state = offlineQueue.getState();
      expect(state).toHaveProperty('pending');
      expect(state).toHaveProperty('processing');
      expect(state).toHaveProperty('failed');
    });
  });
});

describe('queueOperation', () => {
  beforeEach(() => {
    localStorage.clear();
    offlineQueue.clearAll();
  });

  it('delegates to offlineQueue.enqueue', () => {
    const id = queueOperation('/url', { method: 'POST' }, 'Test');
    expect(id).toBeDefined();
    expect(offlineQueue.getPendingCount()).toBe(1);
  });
});

describe('executeOrQueue', () => {
  beforeEach(() => {
    localStorage.clear();
    offlineQueue.clearAll();
  });

  it('queues when offline', async () => {
    (globalThis.navigator as any).onLine = false;

    await expect(
      executeOrQueue('/url', { method: 'POST' }, 'Test')
    ).rejects.toThrow('Operation queued');

    expect(offlineQueue.getPendingCount()).toBe(1);

    // Reset
    (globalThis.navigator as any).onLine = true;
  });
});
