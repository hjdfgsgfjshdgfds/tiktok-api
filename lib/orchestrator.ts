import 'server-only';

import { executeAdapter } from '@/lib/adapters';
import type { AdapterContext, AdapterOutcome } from '@/lib/adapters/types';
import { LookupCache } from '@/lib/cache';
import { getServerEnv } from '@/lib/env';
import { LookupError, toLookupError } from '@/lib/errors';
import { LegacyTikTokClient } from '@/lib/http/legacy-client';
import type { EndpointClient } from '@/lib/http/types';
import { parseLookupInput } from '@/lib/input-parser';
import { logEvent } from '@/lib/logger';
import { MockTikTokClient } from '@/lib/mock/mock-client';
import { sanitizeRaw } from '@/lib/redact';
import type {
  InputType,
  LookupExecution,
  LookupIssue,
  LookupMode,
  LookupResult,
  ParsedInput,
} from '@/lib/types';

interface LookupRequest {
  query: string;
  includeRaw: boolean;
  requestId: string;
}

let cacheInstance: LookupCache | undefined;
let cacheSignature = '';

function getCache(): LookupCache {
  const env = getServerEnv();
  const signature = `${env.cacheTtlSeconds}:${env.cacheMaxEntries}`;
  if (!cacheInstance || signature !== cacheSignature) {
    cacheInstance = new LookupCache(env.cacheTtlSeconds * 1000, env.cacheMaxEntries);
    cacheSignature = signature;
  }
  return cacheInstance;
}

function createClient(mode: LookupMode): EndpointClient {
  return mode === 'mock' ? new MockTikTokClient() : new LegacyTikTokClient();
}

function entityForInput(input?: ParsedInput): LookupResult['entity']['type'] {
  if (!input) return 'unknown';
  return input.type === 'username' || input.type === 'user_id' ? 'profile' : 'post';
}

function adapterForInput(input?: ParsedInput): string {
  if (!input) return 'orchestrator';
  return input.type === 'username' || input.type === 'user_id' ? 'profileAdapter' : 'awemeAdapter';
}

function alternateNumericInput(input: ParsedInput): ParsedInput {
  if (input.type === 'aweme_id') {
    return {
      original: input.original,
      type: 'user_id',
      value: input.value,
      userId: input.value,
      numericAmbiguous: false,
    };
  }
  return {
    original: input.original,
    type: 'aweme_id',
    value: input.value,
    awemeId: input.value,
    numericAmbiguous: false,
  };
}

function resolvedInputType(input: ParsedInput, outcome: AdapterOutcome): InputType {
  if (outcome.entityType === 'profile') {
    return input.type === 'username' ? 'username' : 'user_id';
  }
  return input.type === 'video_url' ? 'video_url' : 'aweme_id';
}

async function executeWithNumericFallback(
  context: AdapterContext,
): Promise<{ outcome: AdapterOutcome; resolvedType: InputType }> {
  try {
    const outcome = await executeAdapter(context);
    return { outcome, resolvedType: resolvedInputType(context.input, outcome) };
  } catch (error) {
    const firstError = toLookupError(error);
    if (!context.input.numericAmbiguous || firstError.code !== 'target_missing') {
      throw firstError;
    }

    const alternate = alternateNumericInput(context.input);
    try {
      const outcome = await executeAdapter({ ...context, input: alternate });
      const fallbackWarning: LookupIssue = {
        code: 'numeric_id_disambiguated',
        message: `The bare numeric ID was resolved as a ${outcome.entityType} after the first exact-target lookup missed.`,
        detail: 'Use user:<id> or aweme:<id> to choose explicitly and avoid the fallback request.',
      };
      outcome.sources = [...firstError.sources, ...outcome.sources];
      outcome.attemptCount += firstError.attemptCount;
      outcome.warnings = [fallbackWarning, ...firstError.warnings, ...outcome.warnings];
      if (context.includeRaw) {
        outcome.raw = sanitizeRaw({
          firstCandidate: firstError.raw,
          resolvedCandidate: outcome.raw,
        });
      }
      return { outcome, resolvedType: resolvedInputType(alternate, outcome) };
    } catch (secondError) {
      const current = toLookupError(secondError);
      throw new LookupError(current.code, current.message, {
        status: current.status,
        retryable: current.retryable,
        detail: current.detail,
        cause: current,
        sources: [...firstError.sources, ...current.sources],
        warnings: [...firstError.warnings, ...current.warnings],
        raw: context.includeRaw
          ? sanitizeRaw({ firstCandidate: firstError.raw, secondCandidate: current.raw })
          : undefined,
        attemptCount: firstError.attemptCount + current.attemptCount,
        validationStatus: current.validationStatus,
      });
    }
  }
}

export function createErrorExecution(options: {
  error: unknown;
  requestId: string;
  mode?: LookupMode;
  input?: ParsedInput;
  rawValue?: string;
}): LookupExecution {
  const error = toLookupError(options.error);
  const mode = options.mode ?? 'mock';
  const retrievedAt = new Date().toISOString();
  const result: LookupResult = {
    ok: false,
    input: {
      type: options.input?.type ?? 'unknown',
      value: options.input?.value ?? options.rawValue?.slice(0, 500) ?? '',
    },
    entity: { type: entityForInput(options.input) },
    data: null,
    fields: [],
    sources: error.sources,
    warnings: error.warnings,
    errors: [
      {
        code: error.code,
        message: error.message,
        detail: error.detail,
      },
    ],
    retrievedAt,
    meta: {
      requestId: options.requestId,
      mode,
      adapter: error.sources[0]?.adapter ?? adapterForInput(options.input),
      attemptCount: error.attemptCount,
      validationStatus: error.validationStatus,
      cacheHit: false,
    },
    raw: error.raw !== undefined ? sanitizeRaw(error.raw) : undefined,
  };
  return { status: error.status, result };
}

export async function runLookup(request: LookupRequest): Promise<LookupExecution> {
  const started = performance.now();
  let mode: LookupMode = 'mock';
  let input: ParsedInput | undefined;
  let budgetTimer: ReturnType<typeof setTimeout> | undefined;

  try {
    const env = getServerEnv();
    mode = env.mode;
    const budgetController = new AbortController();
    budgetTimer = setTimeout(() => budgetController.abort(), env.lookupBudgetMs);
    input = parseLookupInput(request.query);
    const includeRaw = request.includeRaw && env.allowRawViewer;
    const cacheKey = JSON.stringify({
      version: 1,
      mode: env.mode,
      type: input.type,
      value: input.value,
      username: input.username,
      includeRaw,
      rawRequested: request.includeRaw,
    });
    const cache = getCache();
    const cached = cache.get(cacheKey);
    if (cached) {
      logEvent('info', {
        requestId: request.requestId,
        event: 'lookup_cache_hit',
        mode: env.mode,
        adapter: cached.result.meta.adapter,
        status: cached.status,
        durationMs: Math.round(performance.now() - started),
      });
      cached.result.meta.requestId = request.requestId;
      return cached;
    }

    const context: AdapterContext = {
      client: createClient(env.mode),
      mode: env.mode,
      input,
      includeRaw,
      retrievedAt: new Date().toISOString(),
      requestId: request.requestId,
      targetMissingRetries: env.targetMissingRetries,
      signal: budgetController.signal,
    };
    const { outcome, resolvedType } = await executeWithNumericFallback(context);
    const warnings = [...outcome.warnings];
    if (request.includeRaw && !env.allowRawViewer) {
      warnings.push({
        code: 'raw_viewer_disabled',
        message: 'Raw response viewing is disabled by the server configuration.',
      });
    }
    if (env.mode === 'legacy-live') {
      warnings.push({
        code: 'legacy_live_experimental',
        message:
          'This result came from an evidence-bounded TikTok 9.1.0-era adapter, not a verified current TikTok API.',
      });
    }

    const result: LookupResult = {
      ok: true,
      input: { type: resolvedType, value: input.value },
      entity: { type: outcome.entityType },
      data: outcome.data,
      fields: outcome.fields,
      sources: outcome.sources,
      warnings,
      errors: [],
      retrievedAt: context.retrievedAt,
      meta: {
        requestId: request.requestId,
        mode: env.mode,
        adapter: outcome.adapter,
        attemptCount: outcome.attemptCount,
        validationStatus: outcome.validationStatus,
        cacheHit: false,
      },
      raw: outcome.raw,
    };
    const execution = { status: 200, result } satisfies LookupExecution;
    cache.set(cacheKey, execution);

    logEvent('info', {
      requestId: request.requestId,
      event: 'lookup_complete',
      mode: env.mode,
      adapter: outcome.adapter,
      status: 200,
      durationMs: Math.round(performance.now() - started),
      metadata: {
        inputType: resolvedType,
        validationStatus: outcome.validationStatus,
        attempts: outcome.attemptCount,
      },
    });
    return execution;
  } catch (error) {
    const execution = createErrorExecution({
      error,
      requestId: request.requestId,
      mode,
      input,
      rawValue: request.query,
    });
    logEvent(execution.status >= 500 ? 'error' : 'warn', {
      requestId: request.requestId,
      event: 'lookup_failed',
      mode,
      adapter: execution.result.meta.adapter,
      status: execution.status,
      code: execution.result.errors[0]?.code,
      durationMs: Math.round(performance.now() - started),
      metadata: {
        inputType: execution.result.input.type,
        validationStatus: execution.result.meta.validationStatus,
        attempts: execution.result.meta.attemptCount,
      },
    });
    return execution;
  } finally {
    if (budgetTimer) clearTimeout(budgetTimer);
  }
}

export function resetOrchestratorForTests(): void {
  cacheInstance?.clear();
  cacheInstance = undefined;
  cacheSignature = '';
}
