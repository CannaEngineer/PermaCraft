'use client';

/**
 * Offline Sync Context
 *
 * Provides offline/online status and sync state to the entire app.
 * Automatically initializes sync when user navigates to a farm.
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react';
import { syncEngine, type SyncState, type SyncConflict } from '@/lib/offline/sync-engine';

// ─── Types ────────────────────────────────────────────────────────────────────

interface OfflineSyncContextValue {
  /** Whether the device is online */
  isOnline: boolean;
  /** Whether the device just came back online (true for ~3s) */
  wasOffline: boolean;
  /** Current sync state */
  syncState: SyncState;
  /** List of unresolved conflicts */
  conflicts: SyncConflict[];
  /** Trigger a manual sync for a farm */
  syncFarm: (farmId: string) => Promise<void>;
  /** Trigger a full initial sync for a farm */
  initialSync: (farmId: string) => Promise<void>;
  /** Resolve a sync conflict */
  resolveConflict: (changeId: string, resolution: 'local' | 'server') => Promise<void>;
  /** Whether there are pending changes */
  hasPendingChanges: boolean;
  /** Number of pending changes */
  pendingCount: number;
}

const OfflineSyncContext = createContext<OfflineSyncContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function OfflineSyncProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [wasOffline, setWasOffline] = useState(false);
  const [syncState, setSyncState] = useState<SyncState>(syncEngine.getState());
  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);
  const wasOfflineTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Online/offline detection
  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      setWasOffline(true);
      if (wasOfflineTimerRef.current) clearTimeout(wasOfflineTimerRef.current);
      wasOfflineTimerRef.current = setTimeout(() => setWasOffline(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (wasOfflineTimerRef.current) clearTimeout(wasOfflineTimerRef.current);
    };
  }, []);

  // Subscribe to sync engine events
  useEffect(() => {
    const unsubscribe = syncEngine.on((event) => {
      if (event.type === 'sync:state-change') {
        setSyncState(event.data);
      }
      if (event.type === 'sync:conflict') {
        setConflicts(prev => [...prev, event.data]);
      }
    });

    return unsubscribe;
  }, []);

  const syncFarm = useCallback(async (farmId: string) => {
    await syncEngine.sync(farmId);
  }, []);

  const initialSync = useCallback(async (farmId: string) => {
    await syncEngine.initialSync(farmId);
  }, []);

  const resolveConflict = useCallback(async (changeId: string, resolution: 'local' | 'server') => {
    await syncEngine.resolveConflict(changeId, resolution);
    setConflicts(prev => prev.filter(c => c.changeId !== changeId));
  }, []);

  const value: OfflineSyncContextValue = {
    isOnline,
    wasOffline,
    syncState,
    conflicts,
    syncFarm,
    initialSync,
    resolveConflict,
    hasPendingChanges: syncState.pendingChanges > 0,
    pendingCount: syncState.pendingChanges,
  };

  return (
    <OfflineSyncContext.Provider value={value}>
      {children}
    </OfflineSyncContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useOfflineSync() {
  const context = useContext(OfflineSyncContext);
  if (!context) {
    throw new Error('useOfflineSync must be used within an OfflineSyncProvider');
  }
  return context;
}

// ─── Hook for farm-specific sync ──────────────────────────────────────────────

export function useFarmSync(farmId: string | undefined) {
  const sync = useOfflineSync();

  useEffect(() => {
    if (!farmId) return;
    // Do initial sync when component mounts
    sync.initialSync(farmId);
  }, [farmId]); // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = useCallback(() => {
    if (farmId) sync.syncFarm(farmId);
  }, [farmId, sync]);

  return {
    ...sync,
    refresh,
    isSyncing: sync.syncState.status === 'syncing',
    hasConflicts: sync.syncState.status === 'conflict',
    hasErrors: sync.syncState.status === 'error',
    lastSynced: sync.syncState.lastSyncedAt,
  };
}
