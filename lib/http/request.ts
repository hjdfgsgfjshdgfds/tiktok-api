import 'server-only';

import { LookupError } from '@/lib/errors';

export interface BoundedFetchOptions {
  signal?: AbortSignal;
  timeoutMs: number;
  maxBytes?: number;
  expectedContent?: 'html' | 'json' | 'any';
  redirect?: RequestRedirect;
  allowedFinalHosts?: readonly string[];
}

export interface BoundedResponse {
  httpStatus: number;
  contentType: string;
  text: string;
  byteLength: number;
  elapsedMs: number;
  headers: Headers;
  finalUrl: string;
}

function mapNetworkError(error: unknown): never {
  if (error instanceof LookupError) throw error;
  if (error instanceof DOMException && error.name === 'AbortError') {
    throw new LookupError('timeout', 'The TikTok request timed out.', {
      retryable: true,
      cause: error,
    });
  }
  if (error instanceof TypeError) {
    throw new LookupError('upstream_error', 'The TikTok network request failed.', {
      retryable: true,
      detail: error.message,
      cause: error,
    });
  }
  throw error;
}

function assertStatus(response: Response): void {
  if (response.status === 401 || response.status === 403) {
    throw new LookupError(
      'upstream_auth',
      `TikTok rejected the request with HTTP ${response.status}.`,
    );
  }
  if (response.status === 429) {
    throw new LookupError('upstream_rate_limited', 'TikTok rate-limited the request.', {
      status: 429,
      retryable: false,
    });
  }
  if (response.status >= 300 && response.status < 400) {
    throw new LookupError(
      'upstream_auth',
      `TikTok redirected the request with HTTP ${response.status}.`,
      {
        detail:
          'A redirect from a fixed lookup endpoint usually indicates a challenge or missing request context.',
      },
    );
  }
  if (!response.ok) {
    throw new LookupError('upstream_error', `TikTok returned HTTP ${response.status}.`);
  }
}

function assertFinalUrl(response: Response, allowedHosts?: readonly string[]): void {
  if (!allowedHosts?.length) return;
  let final: URL;
  try {
    final = new URL(response.url);
  } catch {
    throw new LookupError('upstream_malformed', 'TikTok returned an invalid final response URL.');
  }
  if (final.protocol !== 'https:' || !allowedHosts.includes(final.hostname.toLowerCase())) {
    throw new LookupError(
      'upstream_auth',
      'TikTok redirected the lookup outside the allowed host.',
      {
        detail: `Final host: ${final.hostname || 'unknown'}`,
      },
    );
  }
}

function assertContentType(
  contentType: string,
  expected: BoundedFetchOptions['expectedContent'],
): void {
  if (!expected || expected === 'any') return;
  const normalized = contentType.toLowerCase();
  if (expected === 'html' && !normalized.includes('text/html')) {
    throw new LookupError(
      'upstream_malformed',
      'TikTok returned a non-HTML profile or post page.',
      {
        detail: `Content-Type: ${contentType || 'missing'}`,
      },
    );
  }
  if (
    expected === 'json' &&
    !normalized.includes('application/json') &&
    !normalized.includes('text/json') &&
    !normalized.includes('application/octet-stream') &&
    !normalized.includes('text/plain')
  ) {
    throw new LookupError('upstream_malformed', 'TikTok returned a non-JSON API response.', {
      detail: `Content-Type: ${contentType || 'missing'}`,
    });
  }
}

async function readBoundedBody(response: Response, maxBytes: number): Promise<Uint8Array> {
  const declaredLength = Number(response.headers.get('content-length') ?? '0');
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new LookupError(
      'upstream_malformed',
      'TikTok returned a response larger than the configured limit.',
    );
  }

  if (!response.body) return new Uint8Array();

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new LookupError(
          'upstream_malformed',
          'TikTok returned a response larger than the configured limit.',
        );
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const output = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return output;
}

export async function boundedFetch(
  url: string,
  init: RequestInit,
  options: BoundedFetchOptions,
): Promise<BoundedResponse> {
  const started = performance.now();
  const controller = new AbortController();
  const abortFromParent = () => controller.abort();
  options.signal?.addEventListener('abort', abortFromParent, { once: true });
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs);

  try {
    const response = await fetch(url, {
      ...init,
      redirect: options.redirect ?? 'manual',
      cache: 'no-store',
      signal: controller.signal,
    });
    assertStatus(response);
    assertFinalUrl(response, options.allowedFinalHosts);
    const contentType = response.headers.get('content-type') ?? '';
    assertContentType(contentType, options.expectedContent);
    const bytes = await readBoundedBody(response, options.maxBytes ?? 6_000_000);
    if (bytes.byteLength === 0) {
      throw new LookupError('upstream_malformed', 'TikTok returned an empty response body.');
    }
    const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    return {
      httpStatus: response.status,
      contentType,
      text,
      byteLength: bytes.byteLength,
      elapsedMs: Math.round(performance.now() - started),
      headers: response.headers,
      finalUrl: response.url,
    };
  } catch (error) {
    return mapNetworkError(error);
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener('abort', abortFromParent);
  }
}
