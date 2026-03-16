/**
 * Tests for sync status computation logic
 *
 * These are pure logic tests that verify the status display decisions
 * without needing to render React components.
 */
import { describe, it, expect } from 'vitest';
import type { SyncState } from '@/lib/offline/sync-engine';

/**
 * Determines what status message to show based on sync state and connectivity.
 * Extracted logic from SyncStatusBar component for testability.
 */
function computeStatusDisplay(
  isOnline: boolean,
  wasOffline: boolean,
  syncState: SyncState
): { show: boolean; type: string; message: string } | null {
  if (!isOnline) {
    return {
      show: true,
      type: 'offline',
      message: "You're offline. Changes will be saved locally and synced when you reconnect.",
    };
  }

  if (wasOffline) {
    return {
      show: true,
      type: 'reconnected',
      message: 'Back online! Syncing your changes...',
    };
  }

  if (syncState.status === 'syncing') {
    return {
      show: true,
      type: 'syncing',
      message: syncState.currentOperation || 'Syncing...',
    };
  }

  if (syncState.status === 'error') {
    return {
      show: true,
      type: 'error',
      message: `Sync error: ${syncState.error || 'Unknown error'}. Retrying...`,
    };
  }

  if (syncState.status === 'conflict') {
    return {
      show: true,
      type: 'conflict',
      message: `${syncState.conflicts} conflict${syncState.conflicts !== 1 ? 's' : ''} need${syncState.conflicts === 1 ? 's' : ''} resolution.`,
    };
  }

  if (syncState.pendingChanges > 0) {
    return {
      show: true,
      type: 'pending',
      message: `${syncState.pendingChanges} unsaved change${syncState.pendingChanges !== 1 ? 's' : ''}`,
    };
  }

  return null; // Don't show status bar
}

const defaultState: SyncState = {
  status: 'idle',
  lastSyncedAt: null,
  pendingChanges: 0,
  failedChanges: 0,
  conflicts: 0,
  currentOperation: null,
  error: null,
};

describe('computeStatusDisplay', () => {
  it('returns null when idle, online, no pending changes', () => {
    const result = computeStatusDisplay(true, false, defaultState);
    expect(result).toBeNull();
  });

  it('shows offline message when not online', () => {
    const result = computeStatusDisplay(false, false, defaultState);
    expect(result).not.toBeNull();
    expect(result!.type).toBe('offline');
    expect(result!.message).toContain('offline');
  });

  it('shows reconnected message when wasOffline', () => {
    const result = computeStatusDisplay(true, true, defaultState);
    expect(result).not.toBeNull();
    expect(result!.type).toBe('reconnected');
    expect(result!.message).toContain('Back online');
  });

  it('shows syncing status', () => {
    const state = { ...defaultState, status: 'syncing' as const, currentOperation: 'Pushing 3 changes...' };
    const result = computeStatusDisplay(true, false, state);
    expect(result!.type).toBe('syncing');
    expect(result!.message).toBe('Pushing 3 changes...');
  });

  it('shows syncing fallback message when no current operation', () => {
    const state = { ...defaultState, status: 'syncing' as const };
    const result = computeStatusDisplay(true, false, state);
    expect(result!.message).toBe('Syncing...');
  });

  it('shows error status', () => {
    const state = { ...defaultState, status: 'error' as const, error: 'Network timeout' };
    const result = computeStatusDisplay(true, false, state);
    expect(result!.type).toBe('error');
    expect(result!.message).toContain('Network timeout');
  });

  it('shows conflict status - singular', () => {
    const state = { ...defaultState, status: 'conflict' as const, conflicts: 1 };
    const result = computeStatusDisplay(true, false, state);
    expect(result!.type).toBe('conflict');
    expect(result!.message).toBe('1 conflict needs resolution.');
  });

  it('shows conflict status - plural', () => {
    const state = { ...defaultState, status: 'conflict' as const, conflicts: 3 };
    const result = computeStatusDisplay(true, false, state);
    expect(result!.message).toBe('3 conflicts need resolution.');
  });

  it('shows pending changes count - singular', () => {
    const state = { ...defaultState, pendingChanges: 1 };
    const result = computeStatusDisplay(true, false, state);
    expect(result!.type).toBe('pending');
    expect(result!.message).toBe('1 unsaved change');
  });

  it('shows pending changes count - plural', () => {
    const state = { ...defaultState, pendingChanges: 5 };
    const result = computeStatusDisplay(true, false, state);
    expect(result!.message).toBe('5 unsaved changes');
  });

  it('prioritizes offline over other states', () => {
    const state = { ...defaultState, status: 'error' as const, pendingChanges: 5 };
    const result = computeStatusDisplay(false, false, state);
    expect(result!.type).toBe('offline');
  });

  it('prioritizes wasOffline over syncing', () => {
    const state = { ...defaultState, status: 'syncing' as const };
    const result = computeStatusDisplay(true, true, state);
    expect(result!.type).toBe('reconnected');
  });
});
