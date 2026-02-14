import { getOfflineQueue, clearOfflineQueue } from './indexed-db';

export async function syncOfflineChanges() {
  if (!navigator.onLine) {
    console.log('Cannot sync: offline');
    return { success: false, error: 'Device is offline' };
  }

  const queue = await getOfflineQueue();

  if (queue.length === 0) {
    console.log('No offline changes to sync');
    return { success: true, synced: 0 };
  }

  console.log(`Syncing ${queue.length} offline changes...`);

  const errors: any[] = [];

  for (const change of queue) {
    try {
      await syncChange(change);
    } catch (error) {
      console.error('Failed to sync change:', change, error);
      errors.push({ change, error });
    }
  }

  if (errors.length === 0) {
    // All synced successfully
    await clearOfflineQueue();
    console.log('All offline changes synced successfully');
    return { success: true, synced: queue.length };
  } else {
    console.warn(`${errors.length} changes failed to sync`);
    return { success: false, synced: queue.length - errors.length, errors };
  }
}

async function syncChange(change: any) {
  const { type, resource, data } = change;

  let url = '';
  let method = '';

  switch (type) {
    case 'create':
      url = `/api/farms/${data.farm_id}/${resource}s`;
      method = 'POST';
      break;

    case 'update':
      url = `/api/farms/${data.farm_id}/${resource}s/${data.id}`;
      method = 'PATCH';
      break;

    case 'delete':
      url = `/api/farms/${data.farm_id}/${resource}s/${data.id}`;
      method = 'DELETE';
      break;

    default:
      throw new Error(`Unknown change type: ${type}`);
  }

  const response = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: type !== 'delete' ? JSON.stringify(data) : undefined
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  return await response.json();
}

/**
 * Listen for online/offline events
 */
export function setupOfflineSync() {
  window.addEventListener('online', () => {
    console.log('Device came online. Syncing...');
    syncOfflineChanges();
  });

  window.addEventListener('offline', () => {
    console.log('Device went offline. Changes will be queued.');
  });
}
