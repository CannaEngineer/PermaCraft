import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface FarmPlannerDB extends DBSchema {
  farms: {
    key: string;
    value: any;
  };
  zones: {
    key: string;
    value: any;
    indexes: { 'by-farm': string };
  };
  plantings: {
    key: string;
    value: any;
    indexes: { 'by-farm': string };
  };
  lines: {
    key: string;
    value: any;
    indexes: { 'by-farm': string };
  };
  offline_queue: {
    key: string;
    value: {
      id: string;
      type: 'create' | 'update' | 'delete';
      resource: 'zone' | 'planting' | 'line';
      data: any;
      timestamp: number;
    };
  };
}

const DB_NAME = 'farm-planner-offline';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<FarmPlannerDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<FarmPlannerDB>> {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = await openDB<FarmPlannerDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Farms store
      if (!db.objectStoreNames.contains('farms')) {
        db.createObjectStore('farms', { keyPath: 'id' });
      }

      // Zones store
      if (!db.objectStoreNames.contains('zones')) {
        const zonesStore = db.createObjectStore('zones', { keyPath: 'id' });
        zonesStore.createIndex('by-farm', 'farm_id');
      }

      // Plantings store
      if (!db.objectStoreNames.contains('plantings')) {
        const plantingsStore = db.createObjectStore('plantings', { keyPath: 'id' });
        plantingsStore.createIndex('by-farm', 'farm_id');
      }

      // Lines store
      if (!db.objectStoreNames.contains('lines')) {
        const linesStore = db.createObjectStore('lines', { keyPath: 'id' });
        linesStore.createIndex('by-farm', 'farm_id');
      }

      // Offline queue
      if (!db.objectStoreNames.contains('offline_queue')) {
        db.createObjectStore('offline_queue', { keyPath: 'id' });
      }
    }
  });

  return dbInstance;
}

/**
 * Save farm data to IndexedDB
 */
export async function saveFarmOffline(farm: any) {
  const db = await getDB();
  await db.put('farms', farm);
}

/**
 * Get farm from IndexedDB
 */
export async function getFarmOffline(farmId: string) {
  const db = await getDB();
  return await db.get('farms', farmId);
}

/**
 * Save zones to IndexedDB
 */
export async function saveZonesOffline(farmId: string, zones: any[]) {
  const db = await getDB();
  const tx = db.transaction('zones', 'readwrite');

  await Promise.all(zones.map(zone => tx.store.put(zone)));
  await tx.done;
}

/**
 * Get zones from IndexedDB
 */
export async function getZonesOffline(farmId: string) {
  const db = await getDB();
  return await db.getAllFromIndex('zones', 'by-farm', farmId);
}

/**
 * Save plantings to IndexedDB
 */
export async function savePlantingsOffline(farmId: string, plantings: any[]) {
  const db = await getDB();
  const tx = db.transaction('plantings', 'readwrite');

  await Promise.all(plantings.map(planting => tx.store.put(planting)));
  await tx.done;
}

/**
 * Get plantings from IndexedDB
 */
export async function getPlantingsOffline(farmId: string) {
  const db = await getDB();
  return await db.getAllFromIndex('plantings', 'by-farm', farmId);
}

/**
 * Queue offline change
 */
export async function queueOfflineChange(
  type: 'create' | 'update' | 'delete',
  resource: 'zone' | 'planting' | 'line',
  data: any
) {
  const db = await getDB();
  const changeId = crypto.randomUUID();

  await db.put('offline_queue', {
    id: changeId,
    type,
    resource,
    data,
    timestamp: Date.now()
  });

  return changeId;
}

/**
 * Get all queued offline changes
 */
export async function getOfflineQueue() {
  const db = await getDB();
  return await db.getAll('offline_queue');
}

/**
 * Clear offline queue after sync
 */
export async function clearOfflineQueue() {
  const db = await getDB();
  const tx = db.transaction('offline_queue', 'readwrite');
  await tx.store.clear();
  await tx.done;
}
