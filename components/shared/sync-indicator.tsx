'use client';

/**
 * Sync Indicator
 *
 * A small inline indicator showing sync status. Can be placed
 * in headers, toolbars, or next to save buttons.
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { useOfflineSync } from '@/contexts/offline-sync-context';

interface SyncIndicatorProps {
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

export function SyncIndicator({ className, showLabel = true, size = 'sm' }: SyncIndicatorProps) {
  const { isOnline, syncState } = useOfflineSync();

  const dotSize = size === 'sm' ? 'w-2 h-2' : 'w-3 h-3';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  const getIndicator = () => {
    if (!isOnline) {
      return {
        dotColor: 'bg-amber-400',
        label: 'Offline',
        pulse: false,
      };
    }

    switch (syncState.status) {
      case 'syncing':
        return {
          dotColor: 'bg-blue-400',
          label: 'Syncing',
          pulse: true,
        };
      case 'error':
        return {
          dotColor: 'bg-red-400',
          label: 'Sync error',
          pulse: false,
        };
      case 'conflict':
        return {
          dotColor: 'bg-orange-400',
          label: `${syncState.conflicts} conflict${syncState.conflicts !== 1 ? 's' : ''}`,
          pulse: true,
        };
      default:
        if (syncState.pendingChanges > 0) {
          return {
            dotColor: 'bg-yellow-400',
            label: `${syncState.pendingChanges} pending`,
            pulse: false,
          };
        }
        return {
          dotColor: 'bg-green-400',
          label: 'Synced',
          pulse: false,
        };
    }
  };

  const indicator = getIndicator();

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <span className="relative flex">
        <span
          className={cn(
            dotSize,
            'rounded-full',
            indicator.dotColor,
            indicator.pulse && 'animate-ping absolute inline-flex h-full w-full opacity-75'
          )}
        />
        <span className={cn(dotSize, 'rounded-full relative inline-flex', indicator.dotColor)} />
      </span>
      {showLabel && (
        <span className={cn(textSize, 'text-muted-foreground whitespace-nowrap')}>
          {indicator.label}
        </span>
      )}
    </div>
  );
}
