import { ENDPOINT_CAPABILITIES } from '@/lib/endpoint-evidence';
import { LookupError, toLookupError } from '@/lib/errors';
import type { LookupMode, ResultSource, ValidationStatus } from '@/lib/types';

export function makeSource(
  capabilityId: string,
  mode: LookupMode,
  options: {
    attempt?: number;
    httpStatus?: number;
    validation?: ValidationStatus;
    note?: string;
  } = {},
): ResultSource {
  const capability = ENDPOINT_CAPABILITIES.find((item) => item.id === capabilityId);
  if (!capability) throw new Error(`Unknown endpoint capability: ${capabilityId}`);

  return {
    id: `${capability.id}:${options.attempt ?? 1}`,
    adapter: capability.adapter,
    method: capability.method,
    host: mode === 'mock' ? 'mock.local' : capability.host,
    path: capability.path,
    status: mode === 'mock' ? 'enabled' : capability.status,
    attempt: options.attempt,
    httpStatus: options.httpStatus,
    validation: options.validation,
    note:
      options.note ?? (mode === 'mock' ? 'Sanitized repository-shaped fixture.' : capability.note),
  };
}

export function sourceEndpointLabel(source: ResultSource): string {
  return `${source.method} ${source.host}${source.path}`;
}

export function attachAdapterFailure(
  error: unknown,
  options: {
    sources: ResultSource[];
    raw?: unknown;
    attemptCount: number;
  },
): LookupError {
  const current = toLookupError(error);
  return new LookupError(current.code, current.message, {
    status: current.status,
    retryable: current.retryable,
    detail: current.detail,
    cause: current,
    sources: [...options.sources, ...current.sources],
    warnings: current.warnings,
    raw: options.raw ?? current.raw,
    attemptCount: options.attemptCount + current.attemptCount,
    validationStatus: current.validationStatus,
  });
}
