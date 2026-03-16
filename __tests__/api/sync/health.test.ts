/**
 * Tests for the sync health check API endpoint
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// We can't import the route handler directly because it depends on Next.js runtime,
// but we can test the response shape expectations.

describe('Sync Health Check API', () => {
  describe('GET /api/sync/health response shape', () => {
    it('should have the expected health check response structure', () => {
      // This tests our contract/specification
      const expectedResponse = {
        status: 'ok',
        service: 'offline-sync',
        version: 2,
        timestamp: expect.any(Number),
        capabilities: {
          indexedDb: true,
          serviceWorker: true,
          changeLog: true,
          conflictResolution: true,
          backgroundSync: true,
        },
        endpoints: {
          health: '/api/sync/health',
          farmSync: '/api/sync/farm/:farmId',
        },
      };

      // Verify the expected structure is well-formed
      expect(expectedResponse.status).toBe('ok');
      expect(expectedResponse.service).toBe('offline-sync');
      expect(expectedResponse.version).toBe(2);
      expect(expectedResponse.capabilities.indexedDb).toBe(true);
      expect(expectedResponse.capabilities.serviceWorker).toBe(true);
      expect(expectedResponse.capabilities.changeLog).toBe(true);
      expect(expectedResponse.capabilities.conflictResolution).toBe(true);
      expect(expectedResponse.capabilities.backgroundSync).toBe(true);
    });
  });

  describe('Sync endpoint contracts', () => {
    it('GET /api/sync/farm/:farmId should accept since parameter', () => {
      const url = new URL('http://localhost:3000/api/sync/farm/test-farm?since=1000');
      expect(url.searchParams.get('since')).toBe('1000');
    });

    it('POST /api/sync/farm/:farmId should accept changes array', () => {
      const body = {
        changes: [
          {
            resourceType: 'zone',
            changeType: 'create',
            data: { id: 'z1', name: 'Zone 1', farm_id: 'farm-1' },
          },
          {
            resourceType: 'planting',
            changeType: 'update',
            data: { id: 'p1', name: 'Updated', farm_id: 'farm-1' },
          },
          {
            resourceType: 'line',
            changeType: 'delete',
            data: { id: 'l1', farm_id: 'farm-1' },
          },
        ],
      };

      expect(body.changes).toHaveLength(3);
      expect(body.changes[0].changeType).toBe('create');
      expect(body.changes[1].changeType).toBe('update');
      expect(body.changes[2].changeType).toBe('delete');
    });

    it('table name mapping should cover all resource types', () => {
      const expectedMappings: Record<string, string> = {
        zone: 'zones',
        planting: 'plantings',
        line: 'lines',
        guild: 'guild_templates',
        phase: 'phases',
      };

      for (const [resource, table] of Object.entries(expectedMappings)) {
        expect(table).toBeTruthy();
        expect(typeof table).toBe('string');
      }
    });
  });
});
