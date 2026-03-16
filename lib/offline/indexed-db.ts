/**
 * Typed IndexedDB Store for Offline Farm Data
 *
 * Stores farm entities (farms, zones, plantings, lines, guilds, phases)
 * with sync metadata: version, dirty flags, timestamps, and a change log.
 */
import { openDB, DBSchema, IDBPDatabase } from 'idb';

// ─── Sync Metadata ────────────────────────────────────────────────────────────

export interface SyncMeta {
  /** Local version counter, incremented on every local write */
  localVersion: number;
  /** Server version (updated_at timestamp from server) */
  serverVersion: number;
  /** Whether this record has unsynced local changes */
  dirty: boolean;
  /** Timestamp of last local modification */
  lastModified: number;
  /** Timestamp of last successful sync to server */
  lastSynced: number | null;
  /** Whether this record was created locally (not yet on server) */
  isLocalOnly: boolean;
  /** Whether this record is marked for deletion */
  isDeleted: boolean;
}

export interface SyncableRecord {
  id: string;
  farm_id?: string;
  _sync: SyncMeta;
}

export type ChangeType = 'create' | 'update' | 'delete';
export type ResourceType = 'farm' | 'zone' | 'planting' | 'line' | 'guild' | 'phase';

export interface ChangeLogEntry {
  id: string;
  resourceType: ResourceType;
  resourceId: string;
  farmId: string;
  changeType: ChangeType;
  /** Snapshot of data at time of change */
  data: any;
  /** When the change was made locally */
  timestamp: number;
  /** Number of sync attempts */
  attempts: number;
  /** Last error message if sync failed */
  lastError: string | null;
  /** Status of this change */
  status: 'pending' | 'processing' | 'failed' | 'conflict';
}

export interface SyncCheckpoint {
  farmId: string;
  /** Last successful full sync timestamp */
  lastFullSync: number | null;
  /** Server-side timestamp we've synced up to */
  serverCursor: number;
}

// ─── DB Schema ────────────────────────────────────────────────────────────────

interface OfflineDB extends DBSchema {
  farms: {
    key: string;
    value: SyncableRecord & Record<string, any>;
  };
  zones: {
    key: string;
    value: SyncableRecord & Record<string, any>;
    indexes: { 'by-farm': string; 'by-dirty': number };
  };
  plantings: {
    key: string;
    value: SyncableRecord & Record<string, any>;
    indexes: { 'by-farm': string; 'by-dirty': number };
  };
  lines: {
    key: string;
    value: SyncableRecord & Record<string, any>;
    indexes: { 'by-farm': string; 'by-dirty': number };
  };
  guilds: {
    key: string;
    value: SyncableRecord & Record<string, any>;
    indexes: { 'by-farm': string; 'by-dirty': number };
  };
  phases: {
    key: string;
    value: SyncableRecord & Record<string, any>;
    indexes: { 'by-farm': string; 'by-dirty': number };
  };
  change_log: {
    key: string;
    value: ChangeLogEntry;
    indexes: {
      'by-farm': string;
      'by-status': string;
      'by-resource': [string, string]; // [resourceType, resourceId]
      'by-timestamp': number;
    };
  };
  sync_checkpoints: {
    key: string; // farmId
    value: SyncCheckpoint;
  };
}

const DB_NAME = 'farm-planner-offline';
const DB_VERSION = 2; // Bump from V1

let dbInstance: IDBPDatabase<OfflineDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<OfflineDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<OfflineDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      // V1 → V2: Drop old stores, create new typed ones
      if (oldVersion < 2) {
        // Clean up V1 stores if they exist
        const storeNames = Array.from(db.objectStoreNames);
        for (const name of storeNames) {
          db.deleteObjectStore(name);
        }

        // Entity stores with farm index and dirty index
        for (const storeName of ['zones', 'plantings', 'lines', 'guilds', 'phases'] as const) {
          const store = db.createObjectStore(storeName, { keyPath: 'id' });
          store.createIndex('by-farm', 'farm_id');
          store.createIndex('by-dirty', '_sync.dirty');
        }

        // Farms store (no farm_id index needed)
        db.createObjectStore('farms', { keyPath: 'id' });

        // Change log
        const changeLog = db.createObjectStore('change_log', { keyPath: 'id' });
        changeLog.createIndex('by-farm', 'farmId');
        changeLog.createIndex('by-status', 'status');
        changeLog.createIndex('by-resource', ['resourceType', 'resourceId']);
        changeLog.createIndex('by-timestamp', 'timestamp');

        // Sync checkpoints
        db.createObjectStore('sync_checkpoints', { keyPath: 'farmId' });
      }
    },
  });

  return dbInstance;
}

// ─── Sync Metadata Helpers ────────────────────────────────────────────────────

export function createSyncMeta(serverVersion?: number): SyncMeta {
  return {
    localVersion: 1,
    serverVersion: serverVersion ?? 0,
    dirty: serverVersion === undefined, // dirty if created locally
    lastModified: Date.now(),
    lastSynced: serverVersion !== undefined ? Date.now() : null,
    isLocalOnly: serverVersion === undefined,
    isDeleted: false,
  };
}

export function markDirty(meta: SyncMeta): SyncMeta {
  return {
    ...meta,
    localVersion: meta.localVersion + 1,
    dirty: true,
    lastModified: Date.now(),
  };
}

export function markSynced(meta: SyncMeta, serverVersion: number): SyncMeta {
  return {
    ...meta,
    serverVersion,
    dirty: false,
    lastSynced: Date.now(),
    isLocalOnly: false,
    isDeleted: false,
  };
}

export function markDeleted(meta: SyncMeta): SyncMeta {
  return {
    ...meta,
    localVersion: meta.localVersion + 1,
    dirty: true,
    lastModified: Date.now(),
    isDeleted: true,
  };
}

// ─── Generic CRUD for Entity Stores ───────────────────────────────────────────

type EntityStoreName = 'farms' | 'zones' | 'plantings' | 'lines' | 'guilds' | 'phases';

/**
 * Get a single record from a store
 */
export async function getRecord(store: EntityStoreName, id: string) {
  const db = await getDB();
  const record = await db.get(store, id);
  // Filter out soft-deleted records
  if (record?._sync?.isDeleted) return undefined;
  return record;
}

/**
 * Get all records for a farm from a store (excluding soft-deleted)
 */
export async function getRecordsByFarm(store: EntityStoreName, farmId: string) {
  const db = await getDB();
  if (store === 'farms') {
    const farm = await db.get('farms', farmId);
    return farm && !farm._sync?.isDeleted ? [farm] : [];
  }
  const all = await db.getAllFromIndex(store, 'by-farm', farmId);
  return all.filter(r => !r._sync?.isDeleted);
}

/**
 * Get all dirty records from a store
 */
export async function getDirtyRecords(store: EntityStoreName) {
  const db = await getDB();
  if (store === 'farms') {
    const all = await db.getAll('farms');
    return all.filter(r => r._sync?.dirty);
  }
  // IDB doesn't index booleans well, so we filter in JS
  const all = await db.getAll(store);
  return all.filter(r => r._sync?.dirty);
}

/**
 * Put a record from the server (not dirty)
 */
export async function putServerRecord(store: EntityStoreName, data: Record<string, any>) {
  const db = await getDB();
  const existing = await db.get(store, data.id);

  // Don't overwrite dirty local changes
  if (existing?._sync?.dirty) {
    return existing;
  }

  const record = {
    ...data,
    _sync: createSyncMeta(data.updated_at || data.created_at || Date.now()),
  };
  await db.put(store, record);
  return record;
}

/**
 * Put a record from a local change (marks dirty, logs change)
 */
export async function putLocalRecord(
  store: EntityStoreName,
  data: Record<string, any>,
  changeType: ChangeType
) {
  const db = await getDB();
  const existing = await db.get(store, data.id);

  const syncMeta = existing?._sync
    ? changeType === 'delete' ? markDeleted(existing._sync) : markDirty(existing._sync)
    : createSyncMeta();

  const record = {
    ...data,
    _sync: syncMeta,
  };

  const tx = db.transaction([store, 'change_log'], 'readwrite');
  await tx.objectStore(store).put(record);

  // Log the change
  const resourceType = store === 'farms' ? 'farm' : store.slice(0, -1) as ResourceType;
  await tx.objectStore('change_log').put({
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    resourceType,
    resourceId: data.id,
    farmId: data.farm_id || data.id, // farms use their own id
    changeType,
    data: { ...data },
    timestamp: Date.now(),
    attempts: 0,
    lastError: null,
    status: 'pending',
  });

  await tx.done;
  return record;
}

/**
 * Bulk put records from server (for initial load / full sync)
 */
export async function bulkPutServerRecords(store: EntityStoreName, records: Record<string, any>[]) {
  const db = await getDB();
  const tx = db.transaction(store, 'readwrite');

  for (const data of records) {
    const existing = await tx.store.get(data.id);
    // Don't overwrite dirty local changes
    if (existing?._sync?.dirty) continue;

    await tx.store.put({
      ...data,
      _sync: createSyncMeta(data.updated_at || data.created_at || Date.now()),
    });
  }

  await tx.done;
}

// ─── Change Log Operations ────────────────────────────────────────────────────

export async function getPendingChanges(farmId?: string): Promise<ChangeLogEntry[]> {
  const db = await getDB();
  if (farmId) {
    const all = await db.getAllFromIndex('change_log', 'by-farm', farmId);
    return all
      .filter(c => c.status === 'pending' || c.status === 'failed')
      .sort((a, b) => a.timestamp - b.timestamp);
  }
  const all = await db.getAllFromIndex('change_log', 'by-status', 'pending');
  const failed = await db.getAllFromIndex('change_log', 'by-status', 'failed');
  return [...all, ...failed].sort((a, b) => a.timestamp - b.timestamp);
}

export async function markChangeProcessing(changeId: string) {
  const db = await getDB();
  const change = await db.get('change_log', changeId);
  if (!change) return;
  change.status = 'processing';
  change.attempts += 1;
  await db.put('change_log', change);
}

export async function markChangeSynced(changeId: string) {
  const db = await getDB();
  await db.delete('change_log', changeId);
}

export async function markChangeFailed(changeId: string, error: string) {
  const db = await getDB();
  const change = await db.get('change_log', changeId);
  if (!change) return;
  change.status = change.attempts >= 5 ? 'failed' : 'pending';
  change.lastError = error;
  await db.put('change_log', change);
}

export async function markChangeConflict(changeId: string) {
  const db = await getDB();
  const change = await db.get('change_log', changeId);
  if (!change) return;
  change.status = 'conflict';
  await db.put('change_log', change);
}

export async function clearSyncedChanges() {
  const db = await getDB();
  const tx = db.transaction('change_log', 'readwrite');
  const all = await tx.store.getAll();
  for (const change of all) {
    if (change.status !== 'pending' && change.status !== 'processing') {
      await tx.store.delete(change.id);
    }
  }
  await tx.done;
}

export async function getConflicts(): Promise<ChangeLogEntry[]> {
  const db = await getDB();
  return db.getAllFromIndex('change_log', 'by-status', 'conflict');
}

// ─── Sync Checkpoint Operations ───────────────────────────────────────────────

export async function getCheckpoint(farmId: string): Promise<SyncCheckpoint | undefined> {
  const db = await getDB();
  return db.get('sync_checkpoints', farmId);
}

export async function updateCheckpoint(farmId: string, serverCursor: number) {
  const db = await getDB();
  await db.put('sync_checkpoints', {
    farmId,
    lastFullSync: Date.now(),
    serverCursor,
  });
}

// ─── Utilities ────────────────────────────────────────────────────────────────

/**
 * Clear all data for a specific farm (used on logout or farm removal)
 */
export async function clearFarmData(farmId: string) {
  const db = await getDB();
  const stores: EntityStoreName[] = ['zones', 'plantings', 'lines', 'guilds', 'phases'];

  for (const store of stores) {
    const tx = db.transaction(store, 'readwrite');
    const records = await tx.store.index('by-farm').getAll(farmId);
    for (const record of records) {
      await tx.store.delete(record.id);
    }
    await tx.done;
  }

  // Clear farm itself
  await db.delete('farms', farmId);

  // Clear change log for this farm
  const changeLogTx = db.transaction('change_log', 'readwrite');
  const changes = await changeLogTx.store.index('by-farm').getAll(farmId);
  for (const change of changes) {
    await changeLogTx.store.delete(change.id);
  }
  await changeLogTx.done;

  // Clear checkpoint
  await db.delete('sync_checkpoints', farmId);
}

/**
 * Clear entire database (nuclear option)
 */
export async function clearAllData() {
  const db = await getDB();
  const stores: (EntityStoreName | 'change_log' | 'sync_checkpoints')[] = [
    'farms', 'zones', 'plantings', 'lines', 'guilds', 'phases',
    'change_log', 'sync_checkpoints',
  ];

  for (const store of stores) {
    const tx = db.transaction(store, 'readwrite');
    await tx.store.clear();
    await tx.done;
  }
}

/**
 * Get counts for diagnostics
 */
export async function getDiagnostics() {
  const db = await getDB();
  const stores: EntityStoreName[] = ['farms', 'zones', 'plantings', 'lines', 'guilds', 'phases'];
  const counts: Record<string, { total: number; dirty: number }> = {};

  for (const store of stores) {
    const all = await db.getAll(store);
    counts[store] = {
      total: all.filter(r => !r._sync?.isDeleted).length,
      dirty: all.filter(r => r._sync?.dirty).length,
    };
  }

  const pendingChanges = await db.getAllFromIndex('change_log', 'by-status', 'pending');
  const failedChanges = await db.getAllFromIndex('change_log', 'by-status', 'failed');
  const conflicts = await db.getAllFromIndex('change_log', 'by-status', 'conflict');

  return {
    stores: counts,
    changeLog: {
      pending: pendingChanges.length,
      failed: failedChanges.length,
      conflicts: conflicts.length,
    },
  };
}
