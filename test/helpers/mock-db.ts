import { vi } from 'vitest';

interface MockExecuteResult {
  rows: any[];
  columns: string[];
  rowsAffected: number;
  lastInsertRowid: bigint;
}

const defaultResult: MockExecuteResult = {
  rows: [],
  columns: [],
  rowsAffected: 0,
  lastInsertRowid: BigInt(0),
};

/**
 * Create a controllable mock for db.execute.
 * Usage:
 *   const mockDb = createMockDb();
 *   mockDb.setResult({ rows: [{ id: '1', name: 'test' }] });
 *   // Now db.execute() returns the set result
 *
 *   mockDb.setResults([result1, result2]); // For sequential calls
 */
export function createMockDb() {
  let results: Partial<MockExecuteResult>[] = [defaultResult];
  let callIndex = 0;

  const execute = vi.fn().mockImplementation(async () => {
    const result = results[callIndex] || results[results.length - 1] || defaultResult;
    callIndex++;
    return { ...defaultResult, ...result };
  });

  return {
    execute,
    /** Set a single result for all calls */
    setResult(result: Partial<MockExecuteResult>) {
      results = [result];
      callIndex = 0;
    },
    /** Set sequential results for successive calls */
    setResults(newResults: Partial<MockExecuteResult>[]) {
      results = newResults;
      callIndex = 0;
    },
    /** Reset call index */
    reset() {
      callIndex = 0;
      execute.mockClear();
    },
  };
}

// Default mock that can be imported in vi.mock calls
export const mockDb = createMockDb();
