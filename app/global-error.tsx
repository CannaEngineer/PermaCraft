'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global error:', error);
    import('@sentry/nextjs').then((Sentry) => {
      Sentry.captureException(error);
    }).catch(() => {
      // Sentry not available
    });
  }, [error]);

  return (
    <html>
      <body>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '1rem', fontFamily: 'system-ui, sans-serif' }}>
          <div style={{ maxWidth: '28rem', textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>Something went wrong</h2>
            <p style={{ color: '#666', marginBottom: '1rem' }}>An unexpected error occurred. Please try again.</p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                onClick={reset}
                style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', backgroundColor: '#16a34a', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 500 }}
              >
                Try again
              </button>
              <button
                onClick={() => window.location.href = '/login'}
                style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', backgroundColor: 'transparent', color: '#333', border: '1px solid #ccc', cursor: 'pointer', fontWeight: 500 }}
              >
                Back to login
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
