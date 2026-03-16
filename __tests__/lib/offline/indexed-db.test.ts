/**
 * Tests for IndexedDB offline store
 *
 * Uses fake-indexeddb to test IDB operations without a browser.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createSyncMeta,
  markDirty,
  markSynced,
  markDeleted,
} from '@/lib/offline/indexed-db';

// ─── Sync Metadata Unit Tests ─────────────────────────────────────────────────

describe('SyncMeta helpers', () => {
  describe('createSyncMeta', () => {
    it('creates local-only meta when no server version provided', () => {
      const meta = createSyncMeta();

      expect(meta.localVersion).toBe(1);
      expect(meta.serverVersion).toBe(0);
      expect(meta.dirty).toBe(true);
      expect(meta.isLocalOnly).toBe(true);
      expect(meta.isDeleted).toBe(false);
      expect(meta.lastSynced).toBeNull();
      expect(meta.lastModified).toBeGreaterThan(0);
    });

    it('creates server-synced meta when server version provided', () => {
      const serverTs = Date.now();
      const meta = createSyncMeta(serverTs);

      expect(meta.localVersion).toBe(1);
      expect(meta.serverVersion).toBe(serverTs);
      expect(meta.dirty).toBe(false);
      expect(meta.isLocalOnly).toBe(false);
      expect(meta.lastSynced).toBeGreaterThan(0);
    });
  });

  describe('markDirty', () => {
    it('increments localVersion and sets dirty flag', () => {
      const original = createSyncMeta(1000);
      const dirty = markDirty(original);

      expect(dirty.localVersion).toBe(2);
      expect(dirty.dirty).toBe(true);
      expect(dirty.lastModified).toBeGreaterThanOrEqual(original.lastModified);
      // Server version unchanged
      expect(dirty.serverVersion).toBe(1000);
    });

    it('preserves other fields', () => {
      const original = createSyncMeta(1000);
      const dirty = markDirty(original);

      expect(dirty.isLocalOnly).toBe(false);
      expect(dirty.isDeleted).toBe(false);
    });
  });

  describe('markSynced', () => {
    it('clears dirty flag and updates server version', () => {
      const dirtyMeta = markDirty(createSyncMeta());
      const synced = markSynced(dirtyMeta, 2000);

      expect(synced.dirty).toBe(false);
      expect(synced.serverVersion).toBe(2000);
      expect(synced.lastSynced).toBeGreaterThan(0);
      expect(synced.isLocalOnly).toBe(false);
    });
  });

  describe('markDeleted', () => {
    it('sets isDeleted and dirty flags', () => {
      const original = createSyncMeta(1000);
      const deleted = markDeleted(original);

      expect(deleted.isDeleted).toBe(true);
      expect(deleted.dirty).toBe(true);
      expect(deleted.localVersion).toBe(2);
    });
  });

  describe('immutability', () => {
    it('does not mutate the original meta object', () => {
      const original = createSyncMeta(1000);
      const originalCopy = { ...original };

      markDirty(original);
      expect(original).toEqual(originalCopy);

      markSynced(original, 2000);
      expect(original).toEqual(originalCopy);

      markDeleted(original);
      expect(original).toEqual(originalCopy);
    });
  });
});

describe('SyncMeta lifecycle', () => {
  it('handles full create → edit → sync → edit → delete lifecycle', () => {
    // Step 1: Create locally
    const created = createSyncMeta();
    expect(created.dirty).toBe(true);
    expect(created.isLocalOnly).toBe(true);
    expect(created.localVersion).toBe(1);

    // Step 2: Sync to server
    const synced = markSynced(created, 1000);
    expect(synced.dirty).toBe(false);
    expect(synced.isLocalOnly).toBe(false);
    expect(synced.serverVersion).toBe(1000);

    // Step 3: Local edit
    const edited = markDirty(synced);
    expect(edited.dirty).toBe(true);
    expect(edited.localVersion).toBe(2);
    expect(edited.serverVersion).toBe(1000); // unchanged

    // Step 4: Sync edit
    const reSynced = markSynced(edited, 2000);
    expect(reSynced.dirty).toBe(false);
    expect(reSynced.serverVersion).toBe(2000);

    // Step 5: Delete
    const deleted = markDeleted(reSynced);
    expect(deleted.isDeleted).toBe(true);
    expect(deleted.dirty).toBe(true);
    expect(deleted.localVersion).toBe(3);
  });
});
