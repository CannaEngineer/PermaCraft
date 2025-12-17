/**
 * Global offline indicator
 * Shows banner when user loses connection
 */

'use client';

import { useOnlineStatus } from '@/hooks/use-online-status';
import { WifiOff, Wifi } from 'lucide-react';
import { useEffect, useState } from 'react';

export function OfflineIndicator() {
  const { isOffline, wasOffline } = useOnlineStatus();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isOffline) {
      setShow(true);
    } else if (wasOffline) {
      // Show reconnected message briefly
      setShow(true);
      const timer = setTimeout(() => setShow(false), 3000);
      return () => clearTimeout(timer);
    } else {
      setShow(false);
    }
  }, [isOffline, wasOffline]);

  if (!show) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 transition-transform duration-300 ${
        show ? 'translate-y-0' : '-translate-y-full'
      }`}
    >
      {isOffline ? (
        <div className="bg-destructive text-destructive-foreground px-4 py-3 text-center">
          <div className="flex items-center justify-center gap-2">
            <WifiOff className="h-4 w-4" />
            <span className="text-sm font-medium">
              You're offline. Some features may not work.
            </span>
          </div>
        </div>
      ) : (
        <div className="bg-success text-success-foreground px-4 py-3 text-center">
          <div className="flex items-center justify-center gap-2">
            <Wifi className="h-4 w-4" />
            <span className="text-sm font-medium">
              Back online!
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
