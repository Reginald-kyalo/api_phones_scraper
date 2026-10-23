import { ApiError } from './api';

export type LoadErrorKind = 'not-found' | 'rate-limited' | 'unavailable' | 'failed';

export interface LoadError {
  kind: LoadErrorKind;
  /** One line for the page, with the recovery the kind allows. */
  message: string;
  /** For a limit: when to try again, from Retry-After, else a short default. */
  retryAfterMs?: number;
}

/**
 * What a failed catalogue read means for the shopper. A missing product, a
 * temporary limit, an outage and an unknown failure are four messages: the
 * old pages said "We couldn't load this product" for all of them, which read
 * as a bug when the shop simply was not in the catalogue, and gave no cooldown
 * when a limit applied (scraping review 2026-10-23, §4).
 */
export function describeLoadError(err: unknown, what = 'this page'): LoadError {
  const status = err instanceof ApiError ? err.status : undefined;
  if (status === 404) return { kind: 'not-found', message: `We couldn’t find ${what}.` };
  if (status === 429) {
    return {
      kind: 'rate-limited',
      message: 'Please wait a moment before trying again.',
      retryAfterMs: err instanceof ApiError && err.retryAfterMs ? err.retryAfterMs : 5_000,
    };
  }
  if (status === 503 || status === 502 || status === 504) {
    return { kind: 'unavailable', message: 'The catalogue is temporarily unavailable. Try again.' };
  }
  return { kind: 'failed', message: `We couldn’t load ${what}. Try again.` };
}
