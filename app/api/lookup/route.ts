import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getServerEnv, type ServerEnv } from '@/lib/env';
import { LookupError } from '@/lib/errors';
import { logEvent } from '@/lib/logger';
import { createErrorExecution, runLookup } from '@/lib/orchestrator';
import { getClientIp, InMemoryRateLimiter } from '@/lib/rate-limit';
import { lookupRequestSchema } from '@/lib/schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

let limiter: InMemoryRateLimiter | undefined;
let limiterSignature = '';

function getLimiter(env: ServerEnv): InMemoryRateLimiter {
  const signature = `${env.rateLimitMax}:${env.rateLimitWindowSeconds}`;
  if (!limiter || signature !== limiterSignature) {
    limiter = new InMemoryRateLimiter(
      env.rateLimitMax,
      env.rateLimitWindowSeconds * 1000,
    );
    limiterSignature = signature;
  }
  return limiter;
}

export async function POST(request: Request): Promise<NextResponse> {
  const requestId = randomUUID();
  let env: ServerEnv;
  try {
    env = getServerEnv();
  } catch {
    logEvent('error', {
      requestId,
      event: 'server_configuration_invalid',
      status: 500
    });
    const execution = createErrorExecution({
      error: new LookupError(
        'internal_error',
        'The lookup service is not configured correctly.',
      ),
      requestId,
      mode: 'mock'
    });
    return NextResponse.json(execution.result, {
      status: execution.status,
      headers: {
        'cache-control': 'no-store',
        'x-request-id': requestId
      }
    });
  }

  const rate = getLimiter(env).check(getClientIp(request.headers));
  const headers = {
    'cache-control': 'no-store',
    'x-request-id': requestId,
    'x-ratelimit-limit': String(rate.limit),
    'x-ratelimit-remaining': String(rate.remaining),
    'x-ratelimit-reset': String(Math.ceil(rate.resetAt / 1000))
  };

  if (!rate.allowed) {
    const execution = createErrorExecution({
      error: new LookupError('upstream_rate_limited', 'Too many lookup requests from this IP.', {
        status: 429,
        retryable: true,
        detail: `Try again after ${new Date(rate.resetAt).toISOString()}.`
      }),
      requestId,
      mode: env.mode
    });
    return NextResponse.json(execution.result, { status: execution.status, headers });
  }

  const declaredLength = Number(request.headers.get('content-length') ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > 4096) {
    const execution = createErrorExecution({
      error: new LookupError('invalid_input', 'The request body is too large.'),
      requestId,
      mode: env.mode
    });
    return NextResponse.json(execution.result, { status: execution.status, headers });
  }

  let bodyText: string;
  try {
    bodyText = await request.text();
  } catch {
    const execution = createErrorExecution({
      error: new LookupError('invalid_input', 'The request body could not be read.'),
      requestId,
      mode: env.mode
    });
    return NextResponse.json(execution.result, { status: execution.status, headers });
  }

  if (new TextEncoder().encode(bodyText).byteLength > 4096) {
    const execution = createErrorExecution({
      error: new LookupError('invalid_input', 'The request body is too large.'),
      requestId,
      mode: env.mode
    });
    return NextResponse.json(execution.result, { status: execution.status, headers });
  }

  let body: unknown;
  try {
    body = JSON.parse(bodyText);
  } catch {
    const execution = createErrorExecution({
      error: new LookupError('invalid_input', 'The request body must be valid JSON.'),
      requestId,
      mode: env.mode
    });
    return NextResponse.json(execution.result, { status: execution.status, headers });
  }

  const parsed = lookupRequestSchema.safeParse(body);
  if (!parsed.success) {
    const execution = createErrorExecution({
      error: new LookupError('invalid_input', 'The lookup request is invalid.', {
        detail: parsed.error.issues
          .map((issue: { message: string }) => issue.message)
          .join('; ')
      }),
      requestId,
      mode: env.mode
    });
    return NextResponse.json(execution.result, { status: execution.status, headers });
  }

  const execution = await runLookup({
    query: parsed.data.query,
    includeRaw: parsed.data.includeRaw,
    requestId
  });
  return NextResponse.json(execution.result, { status: execution.status, headers });
}
