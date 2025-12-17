/**
 * Offline Queue System
 * Queues operations when offline, executes when back online
 */

import { apiFetch } from '@/lib/api/fetch-with-retry';

export interface QueuedOperation {
  id: string;
  url: string;
  options: RequestInit;
  description: string; // User-friendly description
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

export interface QueueState {
  pending: QueuedOperation[];
  processing: string[]; // IDs currently being processed
  failed: { operation: QueuedOperation; error: string }[];
}

const QUEUE_STORAGE_KEY = 'offline_queue';
const MAX_QUEUE_SIZE = 50;

/**
 * Load queue state from localStorage
 */
function loadQueue(): QueueState {
  if (typeof window === 'undefined') {
    return { pending: [], processing: [], failed: [] };
  }

  try {
    const stored = localStorage.getItem(QUEUE_STORAGE_KEY);
    if (!stored) {
      return { pending: [], processing: [], failed: [] };
    }

    const parsed = JSON.parse(stored);
    return {
      pending: parsed.pending || [],
      processing: [],
      failed: parsed.failed || [],
    };
  } catch (error) {
    console.error('Failed to load queue from storage:', error);
    return { pending: [], processing: [], failed: [] };
  }
}

/**
 * Save queue state to localStorage
 */
function saveQueue(state: QueueState): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(
      QUEUE_STORAGE_KEY,
      JSON.stringify({
        pending: state.pending,
        failed: state.failed,
      })
    );
  } catch (error) {
    console.error('Failed to save queue to storage:', error);
  }
}

/**
 * Offline Queue Manager
 */
class OfflineQueueManager {
  private state: QueueState;
  private listeners: Set<(state: QueueState) => void> = new Set();
  private processingInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.state = loadQueue();

    // Listen for online events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.processQueue();
      });
    }
  }

  /**
   * Subscribe to queue state changes
   */
  subscribe(listener: (state: QueueState) => void): () => void {
    this.listeners.add(listener);
    // Immediately call with current state
    listener(this.state);

    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of state change
   */
  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener(this.state));
  }

  /**
   * Add operation to queue
   */
  enqueue(
    url: string,
    options: RequestInit,
    description: string,
    maxRetries = 3
  ): string {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const operation: QueuedOperation = {
      id,
      url,
      options: {
        ...options,
        // Don't store signal or other non-serializable options
        signal: undefined,
      },
      description,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries,
    };

    // Check queue size limit
    if (this.state.pending.length >= MAX_QUEUE_SIZE) {
      throw new Error('Queue is full. Please try again later.');
    }

    this.state.pending.push(operation);
    saveQueue(this.state);
    this.notifyListeners();

    return id;
  }

  /**
   * Remove operation from queue
   */
  private dequeue(id: string): void {
    this.state.pending = this.state.pending.filter((op) => op.id !== id);
    this.state.processing = this.state.processing.filter(
      (opId) => opId !== id
    );
    saveQueue(this.state);
    this.notifyListeners();
  }

  /**
   * Mark operation as failed
   */
  private markFailed(operation: QueuedOperation, error: string): void {
    this.state.failed.push({ operation, error });
    this.dequeue(operation.id);
    saveQueue(this.state);
    this.notifyListeners();
  }

  /**
   * Clear failed operations
   */
  clearFailed(): void {
    this.state.failed = [];
    saveQueue(this.state);
    this.notifyListeners();
  }

  /**
   * Retry a failed operation
   */
  retryFailed(operationId: string): void {
    const failedIndex = this.state.failed.findIndex(
      (f) => f.operation.id === operationId
    );

    if (failedIndex === -1) return;

    const { operation } = this.state.failed[failedIndex];
    this.state.failed.splice(failedIndex, 1);

    // Reset retry count and re-enqueue
    operation.retryCount = 0;
    operation.timestamp = Date.now();
    this.state.pending.push(operation);

    saveQueue(this.state);
    this.notifyListeners();

    // Try to process immediately
    this.processQueue();
  }

  /**
   * Process all pending operations
   */
  async processQueue(): Promise<void> {
    // Don't process if offline
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return;
    }

    // Don't start multiple processing loops
    if (this.processingInterval) {
      return;
    }

    // Process operations one at a time
    while (this.state.pending.length > 0) {
      const operation = this.state.pending[0];

      // Skip if already processing
      if (this.state.processing.includes(operation.id)) {
        break;
      }

      // Mark as processing
      this.state.processing.push(operation.id);
      this.notifyListeners();

      try {
        await apiFetch(operation.url, {
          ...operation.options,
          maxRetries: 0, // Don't retry here, we're already in a queue
        });

        // Success - remove from queue
        this.dequeue(operation.id);
      } catch (error: any) {
        // Increment retry count
        operation.retryCount++;

        if (operation.retryCount >= operation.maxRetries) {
          // Max retries reached - move to failed
          this.markFailed(
            operation,
            error.message || 'Failed after maximum retries'
          );
        } else {
          // Retry later - move to end of queue
          this.state.pending.shift();
          this.state.pending.push(operation);
          this.state.processing = this.state.processing.filter(
            (id) => id !== operation.id
          );
          saveQueue(this.state);
          this.notifyListeners();
        }
      }
    }

    this.processingInterval = null;
  }

  /**
   * Get current queue state
   */
  getState(): QueueState {
    return { ...this.state };
  }

  /**
   * Get pending count
   */
  getPendingCount(): number {
    return this.state.pending.length;
  }

  /**
   * Get failed count
   */
  getFailedCount(): number {
    return this.state.failed.length;
  }

  /**
   * Clear entire queue (for testing/debugging)
   */
  clearAll(): void {
    this.state = { pending: [], processing: [], failed: [] };
    saveQueue(this.state);
    this.notifyListeners();
  }
}

// Singleton instance
export const offlineQueue = new OfflineQueueManager();

/**
 * Queue an operation for offline execution
 * Returns operation ID
 */
export function queueOperation(
  url: string,
  options: RequestInit,
  description: string,
  maxRetries = 3
): string {
  return offlineQueue.enqueue(url, options, description, maxRetries);
}

/**
 * Attempt to execute operation, queue if offline
 */
export async function executeOrQueue<T>(
  url: string,
  options: RequestInit,
  description: string
): Promise<T> {
  // If online, try to execute immediately
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    return apiFetch<T>(url, options);
  }

  // If offline, queue the operation
  const operationId = queueOperation(url, options, description);

  // Return a pending promise (will resolve when online and processed)
  throw new Error(
    `Operation queued (ID: ${operationId}). It will be executed when you're back online.`
  );
}
