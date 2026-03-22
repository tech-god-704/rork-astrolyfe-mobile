import { Platform } from 'react-native';

export interface FetchWithRetryOptions {
  /** Max number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Timeout in milliseconds (default: 15000) */
  timeout?: number;
  /** Base delay in ms between retries, doubles each attempt (default: 1000) */
  baseDelay?: number;
  /** HTTP methods to retry on network error (default: all) */
  retryOnStatus?: number[];
}

const DEFAULT_OPTIONS: Required<FetchWithRetryOptions> = {
  maxRetries: 3,
  timeout: 15000,
  baseDelay: 1000,
  retryOnStatus: [408, 429, 500, 502, 503, 504],
};

/**
 * Fetch wrapper with timeout, retry with exponential backoff, and better error messages.
 */
export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  options?: FetchWithRetryOptions,
): Promise<Response> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), opts.timeout);

    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Don't retry on success or client errors (except retryable ones)
      if (response.ok || !opts.retryOnStatus.includes(response.status)) {
        return response;
      }

      // Retryable server error
      lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof DOMException && error.name === 'AbortError') {
        lastError = new Error(`Request timed out after ${opts.timeout}ms`);
      } else if (error instanceof Error) {
        lastError = error;
      } else {
        lastError = new Error('Unknown network error');
      }
    }

    // Don't wait after last attempt
    if (attempt < opts.maxRetries) {
      const delay = opts.baseDelay * Math.pow(2, attempt);
      const jitter = delay * 0.2 * Math.random();
      await new Promise((r) => setTimeout(r, delay + jitter));
    }
  }

  throw lastError ?? new Error('Request failed after retries');
}

/**
 * Parse response body and throw with details if not ok
 */
export async function parseResponseOrThrow<T>(
  response: Response,
  context: string,
): Promise<T> {
  if (!response.ok) {
    let detail = '';
    try {
      const body = await response.text();
      const parsed = JSON.parse(body);
      detail = parsed.message || parsed.error || body.slice(0, 200);
    } catch {
      detail = response.statusText;
    }
    throw new Error(`${context}: ${response.status} — ${detail}`);
  }
  return response.json() as Promise<T>;
}

/**
 * Simple network connectivity check
 */
export async function isOnline(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const res = await fetch('https://clients3.google.com/generate_204', {
      method: 'HEAD',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return res.status === 204 || res.ok;
  } catch {
    return false;
  }
}
