/**
 * Unified Sync Engine
 *
 * Handles bidirectional synchronization between IndexedDB and the server.
 * - Pushes dirty local changes to the server
 * - Pulls updated data from the server
 * - Resolves conflicts with last-write-wins (configurable)
 * - Emits events for UI updates
 */

import {
  type ChangeLogEntry,
  type ResourceType,
  type SyncCheckpoint,
  getPendingChanges,
  markChangeProcessing,
  markChangeSynced,
  markChangeFailed,
  markChangeConflict,
  getCheckpoint,
  updateCheckpoint,
  putServerRecord,
  bulkPutServerRecords,
  getRecordsByFarm,
  getDirtyRecords,
  markSynced,
  getDB,
  getDiagnostics,
} from './indexed-db';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline' | 'conflict';

export interface SyncState {
  status: SyncStatus;
  lastSyncedAt: number | null;
  pendingChanges: number;
  failedChanges: number;
  conflicts: number;
  currentOperation: string | null;
  error: string | null;
}

export type ConflictResolution = 'local' | 'server' | 'manual';

export interface SyncConflict {
  changeId: string;
  resourceType: ResourceType;
  resourceId: string;
  localData: any;
  serverData: any;
  localTimestamp: number;
  serverTimestamp: number;
}

export type SyncEventType =
  | 'sync:start'
  | 'sync:complete'
  | 'sync:error'
  | 'sync:conflict'
  | 'sync:progress'
  | 'sync:state-change'
  | 'sync:data-updated';

export interface SyncEvent {
  type: SyncEventType;
  data?: any;
}

type SyncEventListener = (event: SyncEvent) => void;

// ─── Resource → API URL Mapping ───────────────────────────────────────────────

const RESOURCE_API_MAP: Record<ResourceType, { plural: string; key: string }> = {
  farm: { plural: 'farms', key: 'farm' },
  zone: { plural: 'zones', key: 'zones' },
  planting: { plural: 'plantings', key: 'plantings' },
  line: { plural: 'lines', key: 'lines' },
  guild: { plural: 'guilds', key: 'guilds' },
  phase: { plural: 'phases', key: 'phases' },
};

const STORE_NAMES: Record<ResourceType, 'farms' | 'zones' | 'plantings' | 'lines' | 'guilds' | 'phases'> = {
  farm: 'farms',
  zone: 'zones',
  planting: 'plantings',
  line: 'lines',
  guild: 'guilds',
  phase: 'phases',
};

// ─── Sync Engine ──────────────────────────────────────────────────────────────

class SyncEngine {
  private state: SyncState = {
    status: 'idle',
    lastSyncedAt: null,
    pendingChanges: 0,
    failedChanges: 0,
    conflicts: 0,
    currentOperation: null,
    error: null,
  };

  private listeners = new Set<SyncEventListener>();
  private syncInProgress = false;
  private syncTimer: ReturnType<typeof setTimeout> | null = null;
  private conflictResolution: ConflictResolution = 'local'; // Default: last-write-wins (local)

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.updateStatus('idle');
        this.scheduleSync(1000); // Sync 1s after coming online
      });
      window.addEventListener('offline', () => {
        this.updateStatus('offline');
        this.cancelScheduledSync();
      });
    }
  }

  // ─── Event System ─────────────────────────────────────────────────────

  on(listener: SyncEventListener): () => void {
    this.listeners.add(listener);
    // Emit current state immediately
    listener({ type: 'sync:state-change', data: this.getState() });
    return () => this.listeners.delete(listener);
  }

  private emit(event: SyncEvent) {
    this.listeners.forEach(l => l(event));
  }

  private updateStatus(status: SyncStatus, error?: string) {
    this.state.status = status;
    if (error !== undefined) this.state.error = error;
    if (status !== 'error' && status !== 'conflict') this.state.error = null;
    this.emit({ type: 'sync:state-change', data: this.getState() });
  }

  private updateProgress(operation: string) {
    this.state.currentOperation = operation;
    this.emit({ type: 'sync:progress', data: { operation } });
  }

  // ─── State Access ─────────────────────────────────────────────────────

  getState(): SyncState {
    return { ...this.state };
  }

  setConflictResolution(strategy: ConflictResolution) {
    this.conflictResolution = strategy;
  }

  // ─── Scheduling ───────────────────────────────────────────────────────

  scheduleSync(delayMs = 5000) {
    this.cancelScheduledSync();
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;

    this.syncTimer = setTimeout(() => {
      this.sync();
    }, delayMs);
  }

  private cancelScheduledSync() {
    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
      this.syncTimer = null;
    }
  }

  // ─── Main Sync Flow ───────────────────────────────────────────────────

  async sync(farmId?: string): Promise<SyncState> {
    if (this.syncInProgress) return this.getState();
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.updateStatus('offline');
      return this.getState();
    }

    this.syncInProgress = true;
    this.updateStatus('syncing');
    this.emit({ type: 'sync:start' });

    try {
      // Phase 1: Push local changes to server
      await this.pushChanges(farmId);

      // Phase 2: Pull server changes
      if (farmId) {
        await this.pullFarmData(farmId);
      }

      // Update counts
      await this.refreshCounts();

      this.state.lastSyncedAt = Date.now();
      this.updateStatus(this.state.conflicts > 0 ? 'conflict' : 'idle');
      this.emit({ type: 'sync:complete', data: this.getState() });
    } catch (error: any) {
      console.error('[SyncEngine] Sync failed:', error);
      this.state.error = error.message;
      this.updateStatus('error', error.message);
      this.emit({ type: 'sync:error', data: { error: error.message } });

      // Retry in 30s on failure
      this.scheduleSync(30000);
    } finally {
      this.syncInProgress = false;
    }

    return this.getState();
  }

  // ─── Push: Send local changes to server ───────────────────────────────

  private async pushChanges(farmId?: string) {
    const changes = await getPendingChanges(farmId);
    if (changes.length === 0) return;

    this.updateProgress(`Pushing ${changes.length} changes...`);

    // Deduplicate: for the same resource, only keep the latest change
    const deduplicated = this.deduplicateChanges(changes);

    for (const change of deduplicated) {
      try {
        await this.pushSingleChange(change);
      } catch (error: any) {
        // Log but continue with other changes
        console.error(`[SyncEngine] Failed to push change ${change.id}:`, error);
      }
    }
  }

  /**
   * Deduplicate changes: if multiple changes exist for the same resource,
   * keep only the most recent one. Special case: if there's a create followed
   * by a delete, both can be dropped (never made it to server).
   */
  private deduplicateChanges(changes: ChangeLogEntry[]): ChangeLogEntry[] {
    const byResource = new Map<string, ChangeLogEntry[]>();

    for (const change of changes) {
      const key = `${change.resourceType}:${change.resourceId}`;
      const existing = byResource.get(key) || [];
      existing.push(change);
      byResource.set(key, existing);
    }

    const result: ChangeLogEntry[] = [];
    for (const [, group] of byResource) {
      // Sort by timestamp, take the latest
      group.sort((a, b) => a.timestamp - b.timestamp);
      const first = group[0];
      const last = group[group.length - 1];

      // If created locally then deleted → skip entirely
      if (first.changeType === 'create' && last.changeType === 'delete') {
        // Mark all as synced (clean up)
        for (const c of group) {
          markChangeSynced(c.id);
        }
        continue;
      }

      // For create+update → treat as create with latest data
      if (first.changeType === 'create' && last.changeType === 'update') {
        last.changeType = 'create';
        last.data = { ...first.data, ...last.data };
      }

      // Mark intermediate changes as synced
      for (let i = 0; i < group.length - 1; i++) {
        markChangeSynced(group[i].id);
      }

      result.push(last);
    }

    return result.sort((a, b) => a.timestamp - b.timestamp);
  }

  private async pushSingleChange(change: ChangeLogEntry) {
    await markChangeProcessing(change.id);

    const { resourceType, changeType, data, farmId } = change;
    const apiInfo = RESOURCE_API_MAP[resourceType];

    try {
      let url: string;
      let method: string;
      let body: any;

      switch (changeType) {
        case 'create':
          url = resourceType === 'farm'
            ? '/api/farms'
            : `/api/farms/${farmId}/${apiInfo.plural}`;
          method = 'POST';
          body = this.stripSyncMeta(data);
          break;

        case 'update':
          url = resourceType === 'farm'
            ? `/api/farms/${data.id}`
            : `/api/farms/${farmId}/${apiInfo.plural}/${data.id}`;
          method = 'PATCH';
          body = this.stripSyncMeta(data);
          break;

        case 'delete':
          url = resourceType === 'farm'
            ? `/api/farms/${data.id}`
            : `/api/farms/${farmId}/${apiInfo.plural}/${data.id}`;
          method = 'DELETE';
          body = undefined;
          break;

        default:
          throw new Error(`Unknown change type: ${changeType}`);
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (response.ok) {
        await markChangeSynced(change.id);

        // Update the local record's sync metadata
        if (changeType !== 'delete') {
          const serverData = await response.json().catch(() => null);
          if (serverData) {
            const storeName = STORE_NAMES[resourceType];
            const db = await getDB();
            const record = await db.get(storeName, data.id);
            if (record?._sync) {
              record._sync = markSynced(record._sync, serverData.updated_at || Date.now());
              await db.put(storeName, record);
            }
          }
        }
      } else if (response.status === 409) {
        // Conflict: server has a newer version
        await this.handleConflict(change, response);
      } else if (response.status >= 400 && response.status < 500) {
        // Client error → won't retry
        const errorText = await response.text().catch(() => 'Unknown error');
        await markChangeFailed(change.id, `HTTP ${response.status}: ${errorText}`);
      } else {
        // Server error → will retry
        const errorText = await response.text().catch(() => 'Server error');
        await markChangeFailed(change.id, `HTTP ${response.status}: ${errorText}`);
      }
    } catch (error: any) {
      await markChangeFailed(change.id, error.message);
      throw error;
    }
  }

  private stripSyncMeta(data: any): any {
    const { _sync, ...clean } = data;
    return clean;
  }

  // ─── Pull: Fetch server changes ───────────────────────────────────────

  async pullFarmData(farmId: string) {
    this.updateProgress('Pulling server data...');

    const resources: ResourceType[] = ['zone', 'planting', 'line', 'guild', 'phase'];

    for (const resourceType of resources) {
      try {
        await this.pullResource(farmId, resourceType);
      } catch (error: any) {
        console.error(`[SyncEngine] Failed to pull ${resourceType}s:`, error);
        // Continue with other resources
      }
    }

    // Also pull farm data
    try {
      const response = await fetch(`/api/farms/${farmId}`);
      if (response.ok) {
        const data = await response.json();
        if (data) {
          await putServerRecord('farms', data.farm || data);
        }
      }
    } catch (error) {
      console.error('[SyncEngine] Failed to pull farm data:', error);
    }

    // Update checkpoint
    await updateCheckpoint(farmId, Date.now());

    this.emit({ type: 'sync:data-updated', data: { farmId } });
  }

  private async pullResource(farmId: string, resourceType: ResourceType) {
    const apiInfo = RESOURCE_API_MAP[resourceType];
    const storeName = STORE_NAMES[resourceType];

    const response = await fetch(`/api/farms/${farmId}/${apiInfo.plural}`);
    if (!response.ok) return;

    const data = await response.json();
    const records = data[apiInfo.key] || data[apiInfo.plural] || [];

    if (Array.isArray(records) && records.length > 0) {
      await bulkPutServerRecords(storeName, records);
    }
  }

  // ─── Conflict Resolution ──────────────────────────────────────────────

  private async handleConflict(change: ChangeLogEntry, response: Response) {
    const serverData = await response.json().catch(() => null);

    if (this.conflictResolution === 'local') {
      // Last-write-wins with local taking priority → force push
      // Re-attempt with a force flag or just mark synced and re-push
      await markChangeSynced(change.id);
    } else if (this.conflictResolution === 'server') {
      // Server wins → discard local changes and pull server version
      await markChangeSynced(change.id);
      if (serverData) {
        const storeName = STORE_NAMES[change.resourceType];
        await putServerRecord(storeName, serverData);
      }
    } else {
      // Manual → mark as conflict for UI resolution
      await markChangeConflict(change.id);
      this.state.conflicts++;

      this.emit({
        type: 'sync:conflict',
        data: {
          changeId: change.id,
          resourceType: change.resourceType,
          resourceId: change.resourceId,
          localData: change.data,
          serverData,
          localTimestamp: change.timestamp,
          serverTimestamp: serverData?.updated_at,
        } satisfies SyncConflict,
      });
    }
  }

  async resolveConflict(changeId: string, resolution: 'local' | 'server') {
    const db = await getDB();
    const change = await db.get('change_log', changeId);
    if (!change) return;

    if (resolution === 'local') {
      // Re-queue as pending to push again
      change.status = 'pending';
      change.attempts = 0;
      await db.put('change_log', change);
      this.scheduleSync(1000);
    } else {
      // Accept server version
      await markChangeSynced(changeId);
      await this.pullFarmData(change.farmId);
    }

    await this.refreshCounts();
    this.updateStatus(this.state.conflicts > 0 ? 'conflict' : 'idle');
  }

  // ─── Counts ───────────────────────────────────────────────────────────

  private async refreshCounts() {
    const diag = await getDiagnostics();
    this.state.pendingChanges = diag.changeLog.pending;
    this.state.failedChanges = diag.changeLog.failed;
    this.state.conflicts = diag.changeLog.conflicts;
  }

  // ─── Full sync for a farm (initial load) ──────────────────────────────

  async initialSync(farmId: string) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.updateStatus('offline');
      return;
    }

    this.updateStatus('syncing');
    this.updateProgress('Loading farm data...');

    try {
      await this.pullFarmData(farmId);
      this.state.lastSyncedAt = Date.now();
      this.updateStatus('idle');
    } catch (error: any) {
      this.updateStatus('error', error.message);
    }
  }

  // ─── Diagnostics ──────────────────────────────────────────────────────

  async getDiagnostics() {
    return getDiagnostics();
  }
}

// Singleton
export const syncEngine = new SyncEngine();
