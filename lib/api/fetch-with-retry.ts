/**
 * Fetch with automatic retry for transient failures
 * Implements exponential backoff for network resilience
 */

export interface FetchWithRetryOptions extends RequestInit {
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if error is retryable (network issues, 5xx errors)
 */
function isRetryableError(error: any, statusCode?: number): boolean {
  // Network errors (no response)
  if (error.name === 'TypeError' || error.message.includes('fetch')) {
    return true;
  }

  // Server errors (5xx)
  if (statusCode && statusCode >= 500 && statusCode < 600) {
    return true;
  }

  // Rate limit (429)
  if (statusCode === 429) {
    return true;
  }

  return false;
}

/**
 * Fetch with automatic retry and better error handling
 */
export async function fetchWithRetry(
  url: string,
  options: FetchWithRetryOptions = {}
): Promise<Response> {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    timeout = 30000,
    onRetry,
    ...fetchOptions
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // If response is OK or a client error (4xx), don't retry
      if (response.ok || (response.status >= 400 && response.status < 500)) {
        return response;
      }

      // Server error - might be retryable
      if (isRetryableError(null, response.status) && attempt < maxRetries) {
        const delay = retryDelay * Math.pow(2, attempt); // Exponential backoff
        onRetry?.(attempt + 1, new Error(`HTTP ${response.status}`));
        await sleep(delay);
        continue;
      }

      return response;
    } catch (error: any) {
      lastError = error;

      // If aborted due to timeout
      if (error.name === 'AbortError') {
        lastError = new Error('Request timeout - please check your connection');
      }

      // If retryable and not last attempt, retry
      if (isRetryableError(error) && attempt < maxRetries) {
        const delay = retryDelay * Math.pow(2, attempt);
        onRetry?.(attempt + 1, error);
        await sleep(delay);
        continue;
      }

      // Last attempt failed, throw error
      throw lastError;
    }
  }

  throw lastError || new Error('Request failed after retries');
}

/**
 * Parse API response and throw ApiError if not successful
 */
export async function parseApiResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type');
  const isJson = contentType?.includes('application/json');

  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`;
    let errorCode: string | undefined;
    let errorDetails: any;

    if (isJson) {
      try {
        const data = await response.json();
        errorMessage = data.error || data.message || errorMessage;
        errorCode = data.code;
        errorDetails = data.details;
      } catch {
        // JSON parse failed, use default message
      }
    } else {
      try {
        errorMessage = await response.text();
      } catch {
        // Text parse failed, use default message
      }
    }

    throw new ApiError(errorMessage, response.status, errorCode, errorDetails);
  }

  if (isJson) {
    return response.json();
  }

  return response.text() as any;
}

/**
 * Combined fetch with retry + error parsing
 */
export async function apiFetch<T>(
  url: string,
  options: FetchWithRetryOptions = {}
): Promise<T> {
  const response = await fetchWithRetry(url, options);
  return parseApiResponse<T>(response);
}
