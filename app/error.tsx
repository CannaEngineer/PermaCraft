'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="max-w-md text-center space-y-4">
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
      </div>
    </div>
  );
}
