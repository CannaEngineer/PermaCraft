/**
 * Tests for Offline Data Access Layer
 *
 * Tests the offline-aware CRUD operations, cache fallback behavior,
 * and integration with the sync engine.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock indexed-db module
const mockGetRecord = vi.fn();
const mockGetRecordsByFarm = vi.fn();
const mockPutLocalRecord = vi.fn();
const mockPutServerRecord = vi.fn();
const mockBulkPutServerRecords = vi.fn();

vi.mock('@/lib/offline/indexed-db', () => ({
  getRecord: (...args: any[]) => mockGetRecord(...args),
  getRecordsByFarm: (...args: any[]) => mockGetRecordsByFarm(...args),
  putLocalRecord: (...args: any[]) => mockPutLocalRecord(...args),
  putServerRecord: (...args: any[]) => mockPutServerRecord(...args),
  bulkPutServerRecords: (...args: any[]) => mockBulkPutServerRecords(...args),
}));

// Mock sync engine
vi.mock('@/lib/offline/sync-engine', () => ({
  syncEngine: {
    scheduleSync: vi.fn(),
  },
}));

// Mock navigator
Object.defineProperty(globalThis, 'navigator', {
  value: { onLine: true },
  writable: true,
  configurable: true,
});

// Mock crypto.randomUUID
Object.defineProperty(globalThis, 'crypto', {
  value: {
    randomUUID: () => 'test-uuid-' + Math.random().toString(36).substr(2, 9),
  },
  writable: true,
});

// Mock fetch
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

import {
  getEntity,
  getEntities,
  createEntity,
  updateEntity,
  deleteEntity,
  saveEntities,
  farmData,
} from '@/lib/offline/offline-data-access';
import { syncEngine } from '@/lib/offline/sync-engine';

describe('Offline Data Access', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    (globalThis.navigator as any).onLine = true;
  });

  describe('getEntity', () => {
    it('fetches from server when online', async () => {
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ id: 'zone-1', name: 'Zone 1' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );
      mockPutServerRecord.mockResolvedValue({});

      const result = await getEntity('zone', 'farm-1', 'zone-1');

      expect(mockFetch).toHaveBeenCalled();
      expect(result).toEqual({ id: 'zone-1', name: 'Zone 1' });
    });

    it('falls back to cache when fetch fails', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));
      mockGetRecord.mockResolvedValue({
        id: 'zone-1',
        name: 'Cached Zone',
        _sync: { dirty: false },
      });

      const result = await getEntity('zone', 'farm-1', 'zone-1');

      expect(result).toEqual({ id: 'zone-1', name: 'Cached Zone' });
    });

    it('uses cache only when offline', async () => {
      (globalThis.navigator as any).onLine = false;
      mockGetRecord.mockResolvedValue({
        id: 'zone-1',
        name: 'Cached Zone',
        _sync: { dirty: false },
      });

      const result = await getEntity('zone', 'farm-1', 'zone-1');

      expect(mockFetch).not.toHaveBeenCalled();
      expect(result).toEqual({ id: 'zone-1', name: 'Cached Zone' });
    });

    it('uses cache only when cacheOnly option is set', async () => {
      mockGetRecord.mockResolvedValue({
        id: 'zone-1',
        name: 'Cached Zone',
        _sync: { dirty: false },
      });

      const result = await getEntity('zone', 'farm-1', 'zone-1', { cacheOnly: true });

      expect(mockFetch).not.toHaveBeenCalled();
      expect(result).toEqual({ id: 'zone-1', name: 'Cached Zone' });
    });

    it('returns null when entity not found', async () => {
      (globalThis.navigator as any).onLine = false;
      mockGetRecord.mockResolvedValue(undefined);

      const result = await getEntity('zone', 'farm-1', 'nonexistent');

      expect(result).toBeNull();
    });

    it('strips _sync metadata from returned data', async () => {
      mockFetch.mockRejectedValue(new Error('Offline'));
      mockGetRecord.mockResolvedValue({
        id: 'zone-1',
        name: 'Zone',
        _sync: { dirty: true, localVersion: 3 },
      });

      const result = await getEntity('zone', 'farm-1', 'zone-1');

      expect(result).not.toHaveProperty('_sync');
    });
  });

  describe('getEntities', () => {
    it('fetches all entities from server when online', async () => {
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ zones: [
          { id: 'z1', name: 'Zone 1' },
          { id: 'z2', name: 'Zone 2' },
        ]}), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const result = await getEntities('zone', 'farm-1');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ id: 'z1', name: 'Zone 1' });
    });

    it('falls back to cache on network error', async () => {
      mockFetch.mockRejectedValue(new Error('Offline'));
      mockGetRecordsByFarm.mockResolvedValue([
        { id: 'z1', name: 'Cached 1', _sync: {} },
        { id: 'z2', name: 'Cached 2', _sync: {} },
      ]);

      const result = await getEntities('zone', 'farm-1');

      expect(result).toHaveLength(2);
      expect(result[0]).not.toHaveProperty('_sync');
    });
  });

  describe('createEntity', () => {
    it('writes to IndexedDB and schedules sync', async () => {
      mockPutLocalRecord.mockResolvedValue({
        id: 'new-zone',
        name: 'New Zone',
        farm_id: 'farm-1',
        _sync: { dirty: true },
      });

      const result = await createEntity('zone', 'farm-1', { name: 'New Zone' });

      expect(mockPutLocalRecord).toHaveBeenCalledWith(
        'zones',
        expect.objectContaining({
          name: 'New Zone',
          farm_id: 'farm-1',
        }),
        'create'
      );
      expect(syncEngine.scheduleSync).toHaveBeenCalledWith(2000);
      expect(result).toHaveProperty('id');
      expect(result.name).toBe('New Zone');
    });

    it('generates UUID if not provided', async () => {
      mockPutLocalRecord.mockImplementation(async (store, data) => data);

      const result = await createEntity('zone', 'farm-1', { name: 'Zone' });

      expect(result.id).toBeDefined();
      expect(result.id).toContain('test-uuid-');
    });

    it('uses provided ID', async () => {
      mockPutLocalRecord.mockImplementation(async (store, data) => data);

      const result = await createEntity('zone', 'farm-1', {
        id: 'my-custom-id',
        name: 'Zone',
      });

      expect(result.id).toBe('my-custom-id');
    });
  });

  describe('updateEntity', () => {
    it('merges updates with existing record', async () => {
      mockGetRecord.mockResolvedValue({
        id: 'zone-1',
        name: 'Old Name',
        farm_id: 'farm-1',
        zone_type: 'zone_1',
        _sync: { dirty: false, localVersion: 1 },
      });
      mockPutLocalRecord.mockImplementation(async (store, data) => data);

      const result = await updateEntity('zone', 'farm-1', 'zone-1', {
        name: 'New Name',
      });

      expect(result.name).toBe('New Name');
      expect(result.zone_type).toBe('zone_1'); // preserved from existing
      expect(mockPutLocalRecord).toHaveBeenCalledWith(
        'zones',
        expect.objectContaining({ id: 'zone-1', name: 'New Name' }),
        'update'
      );
      expect(syncEngine.scheduleSync).toHaveBeenCalled();
    });

    it('throws if entity not found in cache', async () => {
      mockGetRecord.mockResolvedValue(undefined);

      await expect(
        updateEntity('zone', 'farm-1', 'nonexistent', { name: 'X' })
      ).rejects.toThrow('Entity nonexistent not found');
    });
  });

  describe('deleteEntity', () => {
    it('soft-deletes entity and schedules sync', async () => {
      mockGetRecord.mockResolvedValue({
        id: 'zone-1',
        farm_id: 'farm-1',
        _sync: { dirty: false },
      });
      mockPutLocalRecord.mockResolvedValue({});

      await deleteEntity('zone', 'farm-1', 'zone-1');

      expect(mockPutLocalRecord).toHaveBeenCalledWith(
        'zones',
        expect.objectContaining({ id: 'zone-1' }),
        'delete'
      );
      expect(syncEngine.scheduleSync).toHaveBeenCalled();
    });

    it('no-ops if entity already deleted', async () => {
      mockGetRecord.mockResolvedValue(undefined);

      await deleteEntity('zone', 'farm-1', 'zone-1');

      expect(mockPutLocalRecord).not.toHaveBeenCalled();
    });
  });

  describe('saveEntities (batch)', () => {
    it('saves multiple entities at once', async () => {
      mockGetRecord.mockResolvedValue(undefined); // All new
      mockPutLocalRecord.mockImplementation(async (store, data) => data);

      const zones = [
        { id: 'z1', name: 'Zone 1' },
        { id: 'z2', name: 'Zone 2' },
      ];

      const results = await saveEntities('zone', 'farm-1', zones);

      expect(results).toHaveLength(2);
      expect(mockPutLocalRecord).toHaveBeenCalledTimes(2);
      expect(syncEngine.scheduleSync).toHaveBeenCalledWith(3000);
    });

    it('detects creates vs updates', async () => {
      mockGetRecord
        .mockResolvedValueOnce(undefined) // z1 is new
        .mockResolvedValueOnce({ id: 'z2', _sync: {} }); // z2 exists
      mockPutLocalRecord.mockImplementation(async (store, data) => data);

      await saveEntities('zone', 'farm-1', [
        { id: 'z1', name: 'New' },
        { id: 'z2', name: 'Existing' },
      ]);

      expect(mockPutLocalRecord).toHaveBeenCalledWith('zones', expect.anything(), 'create');
      expect(mockPutLocalRecord).toHaveBeenCalledWith('zones', expect.anything(), 'update');
    });
  });

  describe('farmData convenience wrappers', () => {
    it('getZones calls getEntities with correct args', async () => {
      (globalThis.navigator as any).onLine = false;
      mockGetRecordsByFarm.mockResolvedValue([]);

      const result = await farmData.getZones('farm-1', { cacheOnly: true });
      expect(result).toEqual([]);
    });

    it('createZone calls createEntity correctly', async () => {
      mockPutLocalRecord.mockImplementation(async (store, data) => data);

      const result = await farmData.createZone('farm-1', { name: 'Z' });
      expect(result.name).toBe('Z');
      expect(mockPutLocalRecord).toHaveBeenCalledWith(
        'zones',
        expect.objectContaining({ farm_id: 'farm-1' }),
        'create'
      );
    });
  });
});
