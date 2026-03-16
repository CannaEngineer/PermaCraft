/**
 * Offline Sync System - Public API
 *
 * This module provides a complete offline-first data layer for PermaCraft.
 *
 * Architecture:
 *  ┌───────────────────────────────────────────────────┐
 *  │  React Components                                  │
 *  │  (SyncStatusBar, SyncIndicator, ConflictResolver)  │
 *  └────────────────┬──────────────────────────────────┘
 *                   │
 *  ┌────────────────▼──────────────────────────────────┐
 *  │  Context & Hooks                                   │
 *  │  (OfflineSyncProvider, useOfflineSync, useFarmSync) │
 *  └────────────────┬──────────────────────────────────┘
 *                   │
 *  ┌────────────────▼──────────────────────────────────┐
 *  │  Data Access Layer (offline-data-access.ts)        │
 *  │  - farmData.getZones(), createZone(), etc.         │
 *  │  - Automatic cache-first with server sync          │
 *  └────────────────┬──────────────────────────────────┘
 *                   │
 *  ┌────────────────▼──────────────────────────────────┐
 *  │  Sync Engine (sync-engine.ts)                      │
 *  │  - Push/Pull synchronization                       │
 *  │  - Change deduplication                            │
 *  │  - Conflict detection & resolution                 │
 *  │  - Event system                                    │
 *  └────────────────┬──────────────────────────────────┘
 *                   │
 *  ┌────────────────▼──────────────────────────────────┐
 *  │  IndexedDB Store (indexed-db.ts)                   │
 *  │  - Typed entity stores with sync metadata          │
 *  │  - Change log for pending operations               │
 *  │  - Sync checkpoints per farm                       │
 *  └──────────────────────────────────────────────────┘
 *
 * Usage:
 *
 *   // In a component (read):
 *   import { farmData } from '@/lib/offline';
 *   const zones = await farmData.getZones(farmId);
 *
 *   // In a component (write):
 *   await farmData.createZone(farmId, { name: 'Zone 1', ... });
 *   // ^ Writes to IndexedDB immediately, syncs to server in background
 *
 *   // In layout:
 *   import { OfflineSyncProvider } from '@/contexts/offline-sync-context';
 *   <OfflineSyncProvider><App /></OfflineSyncProvider>
 *
 *   // In farm editor:
 *   import { useFarmSync } from '@/contexts/offline-sync-context';
 *   const { isSyncing, hasPendingChanges, refresh } = useFarmSync(farmId);
 */

// Data access layer - primary API for components
export {
  getEntity,
  getEntities,
  createEntity,
  updateEntity,
  deleteEntity,
  saveEntities,
  farmData,
} from './offline-data-access';

// Sync engine - for advanced use / manual sync
export {
  syncEngine,
  type SyncState,
  type SyncStatus,
  type SyncConflict,
  type SyncEvent,
  type SyncEventType,
  type ConflictResolution,
} from './sync-engine';

// IndexedDB primitives - for diagnostics / testing
export {
  getDB,
  createSyncMeta,
  markDirty,
  markSynced,
  markDeleted,
  clearAllData,
  clearFarmData,
  getDiagnostics,
  type SyncMeta,
  type SyncableRecord,
  type ChangeLogEntry,
  type ChangeType,
  type ResourceType,
} from './indexed-db';

// Service worker registration
export { registerServiceWorker } from './register-sw';
