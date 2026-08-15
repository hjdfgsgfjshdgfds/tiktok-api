import type { LookupIssue, ResultSource, ValidationStatus } from '@/lib/types';

export type LookupErrorCode =
  | 'invalid_input'
  | 'unsupported_input'
  | 'target_missing'
  | 'upstream_auth'
  | 'upstream_rate_limited'
  | 'timeout'
  | 'upstream_malformed'
  | 'upstream_error'
  | 'internal_error';

const DEFAULT_STATUS: Record<LookupErrorCode, number> = {
  invalid_input: 400,
  unsupported_input: 422,
  target_missing: 404,
  upstream_auth: 502,
  upstream_rate_limited: 429,
  timeout: 504,
  upstream_malformed: 502,
  upstream_error: 502,
  internal_error: 500,
};

interface LookupErrorOptions {
  status?: number;
  retryable?: boolean;
  detail?: string;
  cause?: unknown;
  sources?: ResultSource[];
  warnings?: LookupIssue[];
  raw?: unknown;
  attemptCount?: number;
  validationStatus?: ValidationStatus;
}

export class LookupError extends Error {
  readonly code: LookupErrorCode;
  readonly status: number;
  readonly retryable: boolean;
  readonly detail?: string;
  readonly sources: ResultSource[];
  readonly warnings: LookupIssue[];
  readonly raw?: unknown;
  readonly attemptCount: number;
  readonly validationStatus: ValidationStatus;

  constructor(code: LookupErrorCode, message: string, options?: LookupErrorOptions) {
    super(message, { cause: options?.cause });
    this.name = 'LookupError';
    this.code = code;
    this.status = options?.status ?? DEFAULT_STATUS[code];
    this.retryable = options?.retryable ?? false;
    this.detail = options?.detail;
    this.sources = options?.sources ?? [];
    this.warnings = options?.warnings ?? [];
    this.raw = options?.raw;
    this.attemptCount = options?.attemptCount ?? 0;
    this.validationStatus =
      options?.validationStatus ?? (code === 'target_missing' ? 'target_missing' : 'failed');
  }
}

export function toLookupError(error: unknown): LookupError {
  if (error instanceof LookupError) return error;
  if (error instanceof DOMException && error.name === 'AbortError') {
    return new LookupError('timeout', 'The lookup exceeded its execution budget.', {
      retryable: true,
      cause: error,
    });
  }

  return new LookupError('internal_error', 'The lookup could not be completed safely.', {
    cause: error,
  });
}
