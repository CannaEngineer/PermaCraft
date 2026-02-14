'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';
import { syncOfflineChanges } from '@/lib/offline/sync-manager';
import { getOfflineQueue } from '@/lib/offline/indexed-db';
import { useToast } from '@/hooks/use-toast';

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true);
  const [queueCount, setQueueCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    updateOnlineStatus();
    updateQueueCount();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const interval = setInterval(updateQueueCount, 5000); // Check queue every 5s

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  function updateOnlineStatus() {
    setIsOnline(navigator.onLine);
  }

  async function updateQueueCount() {
    const queue = await getOfflineQueue();
    setQueueCount(queue.length);
  }

  function handleOnline() {
    setIsOnline(true);
    toast({ title: 'Back online', description: 'Syncing changes...' });
    handleSync();
  }

  function handleOffline() {
    setIsOnline(false);
    toast({
      title: 'You are offline',
      description: 'Changes will be saved locally',
      variant: 'destructive'
    });
  }

  async function handleSync() {
    setSyncing(true);

    try {
      const result = await syncOfflineChanges();

      if (result.success) {
        toast({
          title: 'Sync complete',
          description: `${result.synced} change${result.synced !== 1 ? 's' : ''} synced`
        });
        updateQueueCount();
      } else {
        toast({
          title: 'Sync failed',
          description: 'Some changes could not be synced',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast({
        title: 'Sync error',
        variant: 'destructive'
      });
    } finally {
      setSyncing(false);
    }
  }

  if (isOnline && queueCount === 0) {
    return null; // Hide when online and no pending changes
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2">
      {!isOnline && (
        <Badge variant="destructive" className="flex items-center gap-1">
          <WifiOff className="h-3 w-3" />
          Offline
        </Badge>
      )}

      {queueCount > 0 && (
        <Badge variant="secondary" className="flex items-center gap-1">
          {queueCount} change{queueCount !== 1 ? 's' : ''} pending
        </Badge>
      )}

      {isOnline && queueCount > 0 && (
        <Button
          size="sm"
          variant="outline"
          onClick={handleSync}
          disabled={syncing}
        >
          {syncing ? (
            <>
              <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <Wifi className="h-4 w-4 mr-1" />
              Sync Now
            </>
          )}
        </Button>
      )}
    </div>
  );
}
