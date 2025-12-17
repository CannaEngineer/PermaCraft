/**
 * React hook for offline queue
 * Subscribe to queue state changes
 */

'use client';

import { useState, useEffect } from 'react';
import { offlineQueue, QueueState } from '@/lib/offline/queue';

export function useOfflineQueue() {
  const [queueState, setQueueState] = useState<QueueState>(() =>
    offlineQueue.getState()
  );

  useEffect(() => {
    // Subscribe to queue changes
    const unsubscribe = offlineQueue.subscribe(setQueueState);

    return unsubscribe;
  }, []);

  return {
    pending: queueState.pending,
    processing: queueState.processing,
    failed: queueState.failed,
    pendingCount: queueState.pending.length,
    processingCount: queueState.processing.length,
    failedCount: queueState.failed.length,
    hasPending: queueState.pending.length > 0,
    hasFailed: queueState.failed.length > 0,
    clearFailed: () => offlineQueue.clearFailed(),
    retryFailed: (id: string) => offlineQueue.retryFailed(id),
    processQueue: () => offlineQueue.processQueue(),
  };
}
