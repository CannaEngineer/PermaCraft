'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  const [showDetails, setShowDetails] = useState(false);
  const [authDebug, setAuthDebug] = useState<Record<string, unknown> | null>(null);
  const [loadingDebug, setLoadingDebug] = useState(false);

  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  const runDiagnostics = async () => {
    setLoadingDebug(true);
    try {
      const res = await fetch('/api/auth/debug');
      const data = await res.json();
      setAuthDebug(data);
    } catch (err: any) {
      setAuthDebug({ fetchError: err.message });
    } finally {
      setLoadingDebug(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="max-w-lg w-full text-center space-y-4">
        <h2 className="text-xl font-semibold">Something went wrong</h2>
        <p className="text-muted-foreground">
          An unexpected error occurred. Please try again.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
          >
            Try again
          </button>
          <button
            onClick={() => router.push('/login')}
            className="px-4 py-2 rounded-lg border border-border font-medium hover:bg-muted transition-colors"
          >
            Back to login
          </button>
        </div>

        <div className="pt-4 border-t border-border mt-4 space-y-3">
          <button
            onClick={() => setShowDetails((v) => !v)}
            className="text-xs text-muted-foreground hover:text-foreground underline transition-colors"
          >
            {showDetails ? 'Hide' : 'Show'} error details
          </button>

          {showDetails && (
            <div className="text-left space-y-3">
              <div className="rounded-lg border border-border bg-muted/50 p-3 space-y-1">
                <p className="text-xs font-mono font-semibold text-muted-foreground">Error</p>
                <p className="text-sm font-mono break-all">{error.message}</p>
                {error.digest && (
                  <p className="text-xs font-mono text-muted-foreground">Digest: {error.digest}</p>
                )}
              </div>

              {error.stack && (
                <div className="rounded-lg border border-border bg-muted/50 p-3">
                  <p className="text-xs font-mono font-semibold text-muted-foreground mb-1">Stack trace</p>
                  <pre className="text-xs font-mono text-muted-foreground overflow-x-auto whitespace-pre-wrap break-all max-h-48 overflow-y-auto">
                    {error.stack}
                  </pre>
                </div>
              )}

              <button
                onClick={runDiagnostics}
                disabled={loadingDebug}
                className="text-xs px-3 py-1.5 rounded border border-border hover:bg-muted transition-colors font-mono"
              >
                {loadingDebug ? 'Running...' : 'Run auth diagnostics'}
              </button>

              {authDebug && (
                <div className="rounded-lg border border-border bg-muted/50 p-3">
                  <p className="text-xs font-mono font-semibold text-muted-foreground mb-1">Auth diagnostics</p>
                  <pre className="text-xs font-mono text-muted-foreground overflow-x-auto whitespace-pre-wrap break-all max-h-64 overflow-y-auto">
                    {JSON.stringify(authDebug, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
