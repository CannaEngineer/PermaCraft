'use client';

/**
 * Sync Status Bar
 *
 * Shows a slim bar at the top/bottom of the app indicating sync status.
 * Appears when offline, syncing, or when there are pending changes.
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { useOfflineSync } from '@/contexts/offline-sync-context';

interface SyncStatusBarProps {
  position?: 'top' | 'bottom';
  className?: string;
}

export function SyncStatusBar({ position = 'bottom', className }: SyncStatusBarProps) {
  const { isOnline, wasOffline, syncState } = useOfflineSync();

  // Don't show anything when idle, online, and no pending changes
  if (isOnline && syncState.status === 'idle' && syncState.pendingChanges === 0 && !wasOffline) {
    return null;
  }

  const getStatusContent = () => {
    if (!isOnline) {
      return {
        message: 'You\'re offline. Changes will be saved locally and synced when you reconnect.',
        bgColor: 'bg-amber-500/90',
        textColor: 'text-amber-50',
        icon: (
          <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M18.364 5.636a9 9 0 010 12.728M5.636 18.364a9 9 0 010-12.728M12 9v4m0 4h.01" />
          </svg>
        ),
      };
    }

    if (wasOffline) {
      return {
        message: 'Back online! Syncing your changes...',
        bgColor: 'bg-green-500/90',
        textColor: 'text-green-50',
        icon: (
          <svg className="w-4 h-4 mr-2 flex-shrink-0 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        ),
      };
    }

    if (syncState.status === 'syncing') {
      return {
        message: syncState.currentOperation || 'Syncing...',
        bgColor: 'bg-blue-500/90',
        textColor: 'text-blue-50',
        icon: (
          <svg className="w-4 h-4 mr-2 flex-shrink-0 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        ),
      };
    }

    if (syncState.status === 'error') {
      return {
        message: `Sync error: ${syncState.error || 'Unknown error'}. Retrying...`,
        bgColor: 'bg-red-500/90',
        textColor: 'text-red-50',
        icon: (
          <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
      };
    }

    if (syncState.status === 'conflict') {
      return {
        message: `${syncState.conflicts} conflict${syncState.conflicts !== 1 ? 's' : ''} need${syncState.conflicts === 1 ? 's' : ''} resolution.`,
        bgColor: 'bg-orange-500/90',
        textColor: 'text-orange-50',
        icon: (
          <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        ),
      };
    }

    if (syncState.pendingChanges > 0) {
      return {
        message: `${syncState.pendingChanges} unsaved change${syncState.pendingChanges !== 1 ? 's' : ''}`,
        bgColor: 'bg-slate-600/90',
        textColor: 'text-slate-50',
        icon: (
          <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        ),
      };
    }

    return null;
  };

  const content = getStatusContent();
  if (!content) return null;

  return (
    <div
      className={cn(
        'fixed left-0 right-0 z-50 flex items-center justify-center px-4 py-1.5 text-sm font-medium backdrop-blur-sm transition-all duration-300',
        content.bgColor,
        content.textColor,
        position === 'top' ? 'top-0' : 'bottom-0',
        className
      )}
      role="status"
      aria-live="polite"
    >
      {content.icon}
      <span>{content.message}</span>
    </div>
  );
}
