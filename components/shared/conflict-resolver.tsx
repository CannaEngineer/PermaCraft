'use client';

/**
 * Conflict Resolver Dialog
 *
 * Shows when there are sync conflicts that need manual resolution.
 * Displays local vs server data and lets user choose which to keep.
 */

import React from 'react';
import { useOfflineSync } from '@/contexts/offline-sync-context';
import { cn } from '@/lib/utils';

interface ConflictResolverProps {
  className?: string;
}

export function ConflictResolver({ className }: ConflictResolverProps) {
  const { conflicts, resolveConflict } = useOfflineSync();

  if (conflicts.length === 0) return null;

  const currentConflict = conflicts[0];
  const remaining = conflicts.length - 1;

  return (
    <div className={cn(
      'fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm',
      className
    )}>
      <div className="bg-background rounded-lg shadow-xl max-w-lg w-full mx-4 overflow-hidden border">
        {/* Header */}
        <div className="bg-orange-50 dark:bg-orange-950/30 px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-orange-800 dark:text-orange-200 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            Sync Conflict
          </h2>
          <p className="text-sm text-orange-600 dark:text-orange-300 mt-1">
            A {currentConflict.resourceType} was modified both locally and on the server.
            {remaining > 0 && ` (${remaining} more conflict${remaining !== 1 ? 's' : ''})`}
          </p>
        </div>

        {/* Comparison */}
        <div className="px-6 py-4 grid grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Your Version</h3>
            <div className="bg-muted/50 rounded-md p-3 text-xs font-mono max-h-40 overflow-auto">
              <pre className="whitespace-pre-wrap break-all">
                {formatData(currentConflict.localData)}
              </pre>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Modified {formatTimestamp(currentConflict.localTimestamp)}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Server Version</h3>
            <div className="bg-muted/50 rounded-md p-3 text-xs font-mono max-h-40 overflow-auto">
              <pre className="whitespace-pre-wrap break-all">
                {formatData(currentConflict.serverData)}
              </pre>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Modified {formatTimestamp(currentConflict.serverTimestamp)}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t bg-muted/30 flex gap-3 justify-end">
          <button
            onClick={() => resolveConflict(currentConflict.changeId, 'server')}
            className="px-4 py-2 text-sm rounded-md border bg-background hover:bg-muted transition-colors"
          >
            Keep Server Version
          </button>
          <button
            onClick={() => resolveConflict(currentConflict.changeId, 'local')}
            className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Keep My Version
          </button>
        </div>
      </div>
    </div>
  );
}

function formatData(data: any): string {
  if (!data) return '(no data)';
  const { _sync, geometry, ...display } = data;
  // Truncate geometry for display
  if (geometry) {
    display.geometry = typeof geometry === 'string'
      ? `${geometry.substring(0, 80)}...`
      : '[GeoJSON]';
  }
  return JSON.stringify(display, null, 2);
}

function formatTimestamp(ts: number | undefined): string {
  if (!ts) return 'unknown';
  const date = new Date(ts);
  return date.toLocaleString();
}
