/**
 * Offline Queue Indicator
 * Shows pending/failed operations with actions
 */

'use client';

import { useOfflineQueue } from '@/hooks/use-offline-queue';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { Clock, CheckCircle2, AlertCircle, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

export function OfflineQueueIndicator() {
  const {
    pending,
    processing,
    failed,
    pendingCount,
    failedCount,
    clearFailed,
    retryFailed,
    processQueue,
  } = useOfflineQueue();
  const { isOnline } = useOnlineStatus();

  // Don't show if nothing in queue
  if (pendingCount === 0 && failedCount === 0) {
    return null;
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="fixed bottom-20 md:bottom-24 right-4 z-40 shadow-lg min-h-[44px] touch-manipulation"
        >
          {pendingCount > 0 ? (
            <>
              <Clock className="h-4 w-4 mr-2 animate-pulse" />
              <span>{pendingCount} pending</span>
            </>
          ) : (
            <>
              <AlertCircle className="h-4 w-4 mr-2 text-destructive" />
              <span>{failedCount} failed</span>
            </>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Offline Queue</SheetTitle>
          <SheetDescription>
            Operations that are pending or need attention
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)] mt-6">
          <div className="space-y-4">
            {/* Pending Operations */}
            {pendingCount > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" />
                      <CardTitle className="text-sm">Pending</CardTitle>
                    </div>
                    <Badge variant="secondary">{pendingCount}</Badge>
                  </div>
                  <CardDescription className="text-xs">
                    {isOnline
                      ? 'Processing automatically...'
                      : 'Will process when back online'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {pending.map((operation) => (
                    <div
                      key={operation.id}
                      className="flex items-start gap-2 p-2 rounded-lg bg-muted/50"
                    >
                      <div
                        className={`rounded-full p-1 flex-shrink-0 ${
                          processing.includes(operation.id)
                            ? 'bg-primary/10'
                            : 'bg-muted'
                        }`}
                      >
                        {processing.includes(operation.id) ? (
                          <RefreshCw className="h-3 w-3 text-primary animate-spin" />
                        ) : (
                          <Clock className="h-3 w-3 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">
                          {operation.description}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {processing.includes(operation.id)
                            ? 'Processing...'
                            : operation.retryCount > 0
                            ? `Retry ${operation.retryCount}/${operation.maxRetries}`
                            : 'Queued'}
                        </p>
                      </div>
                    </div>
                  ))}

                  {isOnline && pendingCount > 0 && (
                    <Button
                      onClick={processQueue}
                      size="sm"
                      variant="outline"
                      className="w-full mt-2 touch-manipulation"
                    >
                      <RefreshCw className="h-3 w-3 mr-2" />
                      Process Now
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Failed Operations */}
            {failedCount > 0 && (
              <Card className="border-destructive/50">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-destructive" />
                      <CardTitle className="text-sm">Failed</CardTitle>
                    </div>
                    <Badge variant="destructive">{failedCount}</Badge>
                  </div>
                  <CardDescription className="text-xs">
                    Operations that couldn't be completed
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {failed.map(({ operation, error }) => (
                    <div
                      key={operation.id}
                      className="flex items-start gap-2 p-2 rounded-lg bg-destructive/5 border border-destructive/20"
                    >
                      <div className="rounded-full p-1 bg-destructive/10 flex-shrink-0">
                        <X className="h-3 w-3 text-destructive" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">
                          {operation.description}
                        </p>
                        <p className="text-xs text-destructive/80 truncate">
                          {error}
                        </p>
                        <Button
                          onClick={() => retryFailed(operation.id)}
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 mt-1 text-xs touch-manipulation"
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Retry
                        </Button>
                      </div>
                    </div>
                  ))}

                  <Button
                    onClick={clearFailed}
                    size="sm"
                    variant="destructive"
                    className="w-full mt-2 touch-manipulation"
                  >
                    Clear Failed
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Success State */}
            {pendingCount === 0 && failedCount === 0 && (
              <Card className="border-success/50">
                <CardContent className="pt-6 text-center">
                  <CheckCircle2 className="h-12 w-12 mx-auto text-success mb-3" />
                  <p className="text-sm font-medium">All caught up!</p>
                  <p className="text-xs text-muted-foreground">
                    No pending operations
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
