/**
 * Offline-Aware Data Access Layer
 *
 * Wraps all farm entity CRUD operations with offline support.
 * - When online: fetches from server, caches to IndexedDB
 * - When offline: reads from IndexedDB, queues writes
 * - All writes go through IndexedDB first (optimistic) then sync
 */

import {
  type ResourceType,
  getRecord,
  getRecordsByFarm,
  putLocalRecord,
  putServerRecord,
  bulkPutServerRecords,
} from './indexed-db';
import { syncEngine } from './sync-engine';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DataAccessOptions {
  /** Skip server fetch and use cache only */
  cacheOnly?: boolean;
  /** Skip cache and fetch from server only */
  serverOnly?: boolean;
  /** Force refresh from server even if cached */
  forceRefresh?: boolean;
}

type StoreName = 'farms' | 'zones' | 'plantings' | 'lines' | 'guilds' | 'phases';

const RESOURCE_TO_STORE: Record<ResourceType, StoreName> = {
  farm: 'farms',
  zone: 'zones',
  planting: 'plantings',
  line: 'lines',
  guild: 'guilds',
  phase: 'phases',
};

const RESOURCE_TO_API_KEY: Record<ResourceType, string> = {
  farm: 'farm',
  zone: 'zones',
  planting: 'plantings',
  line: 'lines',
  guild: 'guilds',
  phase: 'phases',
};

// ─── Read Operations ──────────────────────────────────────────────────────────

/**
 * Get a single entity by ID. Tries server first, falls back to cache.
 */
export async function getEntity<T = any>(
  resourceType: ResourceType,
  farmId: string,
  entityId: string,
  options: DataAccessOptions = {}
): Promise<T | null> {
  const store = RESOURCE_TO_STORE[resourceType];

  if (options.cacheOnly || !isOnline()) {
    const cached = await getRecord(store, entityId);
    return cached ? stripSyncMeta(cached) as T : null;
  }

  try {
    const apiPath = resourceType === 'farm'
      ? `/api/farms/${farmId}`
      : `/api/farms/${farmId}/${store}/${entityId}`;
    const response = await fetch(apiPath);

    if (response.ok) {
      const data = await response.json();
      const entity = data[RESOURCE_TO_API_KEY[resourceType]] || data;
      await putServerRecord(store, entity);
      return entity as T;
    }

    // Server error → fall back to cache
    const cached = await getRecord(store, entityId);
    return cached ? stripSyncMeta(cached) as T : null;
  } catch {
    // Network error → fall back to cache
    const cached = await getRecord(store, entityId);
    return cached ? stripSyncMeta(cached) as T : null;
  }
}

/**
 * Get all entities of a type for a farm. Tries server first, falls back to cache.
 */
export async function getEntities<T = any>(
  resourceType: ResourceType,
  farmId: string,
  options: DataAccessOptions = {}
): Promise<T[]> {
  const store = RESOURCE_TO_STORE[resourceType];
  const apiKey = RESOURCE_TO_API_KEY[resourceType];

  if (options.cacheOnly || !isOnline()) {
    const cached = await getRecordsByFarm(store, farmId);
    return cached.map(stripSyncMeta) as T[];
  }

  try {
    const apiPath = resourceType === 'farm'
      ? `/api/farms/${farmId}`
      : `/api/farms/${farmId}/${store}`;
    const response = await fetch(apiPath);

    if (response.ok) {
      const data = await response.json();
      const records = data[apiKey] || data[store] || (Array.isArray(data) ? data : [data]);

      if (Array.isArray(records)) {
        await bulkPutServerRecords(store, records);
        return records as T[];
      }
      return [];
    }

    // Fall back to cache
    const cached = await getRecordsByFarm(store, farmId);
    return cached.map(stripSyncMeta) as T[];
  } catch {
    const cached = await getRecordsByFarm(store, farmId);
    return cached.map(stripSyncMeta) as T[];
  }
}

// ─── Write Operations ─────────────────────────────────────────────────────────

/**
 * Create a new entity. Writes to IndexedDB immediately, syncs to server.
 */
export async function createEntity<T extends Record<string, any>>(
  resourceType: ResourceType,
  farmId: string,
  data: T
): Promise<T & { id: string }> {
  const store = RESOURCE_TO_STORE[resourceType];
  const id = data.id || crypto.randomUUID();
  const now = Date.now();

  const record = {
    ...data,
    id,
    farm_id: resourceType === 'farm' ? undefined : farmId,
    created_at: data.created_at || Math.floor(now / 1000),
    updated_at: data.updated_at || Math.floor(now / 1000),
  };

  // Write to IndexedDB (optimistic)
  await putLocalRecord(store, record, 'create');

  // Schedule sync
  syncEngine.scheduleSync(2000);

  return stripSyncMeta(record) as T & { id: string };
}

/**
 * Update an entity. Writes to IndexedDB immediately, syncs to server.
 */
export async function updateEntity<T extends Record<string, any>>(
  resourceType: ResourceType,
  farmId: string,
  entityId: string,
  updates: Partial<T>
): Promise<T> {
  const store = RESOURCE_TO_STORE[resourceType];

  // Get existing record from cache
  const existing = await getRecord(store, entityId);
  if (!existing) {
    throw new Error(`Entity ${entityId} not found in local cache`);
  }

  const updated = {
    ...existing,
    ...updates,
    id: entityId,
    farm_id: resourceType === 'farm' ? undefined : farmId,
    updated_at: Math.floor(Date.now() / 1000),
  };

  await putLocalRecord(store, updated, 'update');

  // Schedule sync
  syncEngine.scheduleSync(2000);

  return stripSyncMeta(updated) as T;
}

/**
 * Delete an entity. Soft-deletes in IndexedDB, syncs deletion to server.
 */
export async function deleteEntity(
  resourceType: ResourceType,
  farmId: string,
  entityId: string
): Promise<void> {
  const store = RESOURCE_TO_STORE[resourceType];

  const existing = await getRecord(store, entityId);
  if (!existing) return; // Already deleted

  await putLocalRecord(store, { ...existing, id: entityId, farm_id: farmId }, 'delete');

  // Schedule sync
  syncEngine.scheduleSync(2000);
}

// ─── Batch Operations ─────────────────────────────────────────────────────────

/**
 * Save multiple entities at once (e.g., saving all zones from draw mode).
 * All go to IndexedDB immediately, then sync.
 */
export async function saveEntities<T extends Record<string, any>>(
  resourceType: ResourceType,
  farmId: string,
  entities: T[]
): Promise<T[]> {
  const store = RESOURCE_TO_STORE[resourceType];
  const results: T[] = [];

  for (const entity of entities) {
    const id = entity.id || crypto.randomUUID();
    const existing = await getRecord(store, id);

    const record = {
      ...entity,
      id,
      farm_id: resourceType === 'farm' ? undefined : farmId,
      updated_at: Math.floor(Date.now() / 1000),
    };

    const changeType = existing ? 'update' : 'create';
    await putLocalRecord(store, record, changeType);
    results.push(stripSyncMeta(record) as T);
  }

  // Schedule sync after batch
  syncEngine.scheduleSync(3000);

  return results;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isOnline(): boolean {
  return typeof navigator === 'undefined' || navigator.onLine;
}

function stripSyncMeta(record: any): any {
  if (!record) return record;
  const { _sync, ...clean } = record;
  return clean;
}

// ─── Convenience wrappers for specific resource types ─────────────────────────

export const farmData = {
  getFarm: (farmId: string, opts?: DataAccessOptions) =>
    getEntity('farm', farmId, farmId, opts),

  getZones: (farmId: string, opts?: DataAccessOptions) =>
    getEntities('zone', farmId, opts),

  getPlantings: (farmId: string, opts?: DataAccessOptions) =>
    getEntities('planting', farmId, opts),

  getLines: (farmId: string, opts?: DataAccessOptions) =>
    getEntities('line', farmId, opts),

  getGuilds: (farmId: string, opts?: DataAccessOptions) =>
    getEntities('guild', farmId, opts),

  getPhases: (farmId: string, opts?: DataAccessOptions) =>
    getEntities('phase', farmId, opts),

  createZone: (farmId: string, data: any) =>
    createEntity('zone', farmId, data),

  updateZone: (farmId: string, zoneId: string, updates: any) =>
    updateEntity('zone', farmId, zoneId, updates),

  deleteZone: (farmId: string, zoneId: string) =>
    deleteEntity('zone', farmId, zoneId),

  createPlanting: (farmId: string, data: any) =>
    createEntity('planting', farmId, data),

  updatePlanting: (farmId: string, plantingId: string, updates: any) =>
    updateEntity('planting', farmId, plantingId, updates),

  deletePlanting: (farmId: string, plantingId: string) =>
    deleteEntity('planting', farmId, plantingId),

  createLine: (farmId: string, data: any) =>
    createEntity('line', farmId, data),

  updateLine: (farmId: string, lineId: string, updates: any) =>
    updateEntity('line', farmId, lineId, updates),

  deleteLine: (farmId: string, lineId: string) =>
    deleteEntity('line', farmId, lineId),

  saveAllZones: (farmId: string, zones: any[]) =>
    saveEntities('zone', farmId, zones),
};
