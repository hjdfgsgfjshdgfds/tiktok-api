import 'server-only';

import { z } from 'zod';
import type { LookupMode } from '@/lib/types';

const booleanFromString = z.preprocess((value: unknown) => {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return value;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return value;
}, z.boolean());

const integerFromString = (minimum: number, maximum: number) =>
  z.preprocess(
    (value: unknown) => (typeof value === 'string' && value.length > 0 ? Number(value) : value),
    z.number().int().min(minimum).max(maximum),
  );

const optionalHttpsUrl = z.preprocess(
  (value: unknown) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z
    .string()
    .trim()
    .url()
    .refine((value: string) => new URL(value).protocol === 'https:', {
      message: 'URL must use HTTPS',
    })
    .optional(),
);

const optionalValue = (schema: z.ZodTypeAny) =>
  z.preprocess(
    (value: unknown) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    schema.optional(),
  );

const decimalIdentifier = z
  .string()
  .min(5)
  .max(30)
  .regex(/^\d+$/, 'must contain decimal digits only');

const legacyQueryValue = z
  .string()
  .min(1)
  .max(512)
  .regex(/^[A-Za-z0-9._~-]+$/, 'contains characters unsafe for the legacy unencoded query');

const headerToken = z
  .string()
  .min(1)
  .max(4096)
  .regex(/^[^\s\u0000-\u001f\u007f]+$/, 'must not contain whitespace or control characters');

const cookieHeader = z
  .string()
  .min(1)
  .max(8192)
  .refine((value: string) => !/[\r\n\u0000]/.test(value), {
    message: 'must not contain newline or null characters',
  });

const envSchema = z.object({
  LOOKUP_MODE: z.enum(['mock', 'legacy-live']).default('mock'),
  ALLOW_RAW_VIEWER: booleanFromString.default(true),
  LOOKUP_BUDGET_MS: integerFromString(1000, 55_000).default(45_000),
  REQUEST_TIMEOUT_MS: integerFromString(1000, 30_000).default(8_000),
  TARGET_MISSING_RETRIES: integerFromString(0, 3).default(1),
  CACHE_TTL_SECONDS: integerFromString(0, 3600).default(60),
  CACHE_MAX_ENTRIES: integerFromString(1, 1000).default(100),
  RATE_LIMIT_MAX: integerFromString(1, 1000).default(30),
  RATE_LIMIT_WINDOW_SECONDS: integerFromString(1, 3600).default(60),
  UPSTREAM_COOLDOWN_SECONDS: integerFromString(1, 3600).default(60),
  TIKTOK_LEGACY_BASE_URL: z.string().url().default('https://api2.musical.ly/'),
  TIKTOK_SIGNER_URL: optionalHttpsUrl,
  TIKTOK_SIGNER_TOKEN: optionalValue(headerToken),
  TIKTOK_DEVICE_ID: optionalValue(decimalIdentifier),
  TIKTOK_FP: optionalValue(legacyQueryValue),
  TIKTOK_IID: optionalValue(decimalIdentifier),
  TIKTOK_OPENUDID: optionalValue(
    z
      .string()
      .min(8)
      .max(64)
      .regex(/^[A-Fa-f0-9]+$/, 'must contain hexadecimal characters only'),
  ),
  TIKTOK_COOKIE: optionalValue(cookieHeader),
});

export interface ServerEnv {
  mode: LookupMode;
  allowRawViewer: boolean;
  lookupBudgetMs: number;
  requestTimeoutMs: number;
  targetMissingRetries: number;
  cacheTtlSeconds: number;
  cacheMaxEntries: number;
  rateLimitMax: number;
  rateLimitWindowSeconds: number;
  upstreamCooldownSeconds: number;
  legacy: {
    baseUrl: string;
    signerUrl?: string;
    signerToken?: string;
    deviceId?: string;
    fp?: string;
    iid?: string;
    openudid?: string;
    cookie?: string;
  };
}

let cachedEnv: ServerEnv | undefined;

export function getServerEnv(): ServerEnv {
  if (cachedEnv) return cachedEnv;

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map(
        (issue: { path: Array<string | number>; message: string }) =>
          `${issue.path.join('.') || 'environment'}: ${issue.message}`,
      )
      .join('; ');
    throw new Error(`Invalid server environment: ${detail}`);
  }

  const source = parsed.data;
  const baseUrl = new URL(source.TIKTOK_LEGACY_BASE_URL);
  if (baseUrl.protocol !== 'https:' || baseUrl.username || baseUrl.password) {
    throw new Error('TIKTOK_LEGACY_BASE_URL must be a credential-free HTTPS URL.');
  }
  if (baseUrl.pathname !== '/' || baseUrl.search || baseUrl.hash) {
    throw new Error('TIKTOK_LEGACY_BASE_URL must contain only an HTTPS origin and trailing slash.');
  }

  cachedEnv = {
    mode: source.LOOKUP_MODE,
    allowRawViewer: source.ALLOW_RAW_VIEWER,
    lookupBudgetMs: source.LOOKUP_BUDGET_MS,
    requestTimeoutMs: source.REQUEST_TIMEOUT_MS,
    targetMissingRetries: source.TARGET_MISSING_RETRIES,
    cacheTtlSeconds: source.CACHE_TTL_SECONDS,
    cacheMaxEntries: source.CACHE_MAX_ENTRIES,
    rateLimitMax: source.RATE_LIMIT_MAX,
    rateLimitWindowSeconds: source.RATE_LIMIT_WINDOW_SECONDS,
    upstreamCooldownSeconds: source.UPSTREAM_COOLDOWN_SECONDS,
    legacy: {
      baseUrl: baseUrl.toString(),
      signerUrl: source.TIKTOK_SIGNER_URL,
      signerToken: source.TIKTOK_SIGNER_TOKEN,
      deviceId: source.TIKTOK_DEVICE_ID,
      fp: source.TIKTOK_FP,
      iid: source.TIKTOK_IID,
      openudid: source.TIKTOK_OPENUDID,
      cookie: source.TIKTOK_COOKIE,
    },
  };

  return cachedEnv;
}

export function assertLegacyLiveConfigured(env = getServerEnv()): asserts env is ServerEnv & {
  legacy: Required<
    Pick<ServerEnv['legacy'], 'signerUrl' | 'deviceId' | 'fp' | 'iid' | 'openudid'>
  > &
    ServerEnv['legacy'];
} {
  const missing = [
    ['TIKTOK_SIGNER_URL', env.legacy.signerUrl],
    ['TIKTOK_DEVICE_ID', env.legacy.deviceId],
    ['TIKTOK_FP', env.legacy.fp],
    ['TIKTOK_IID', env.legacy.iid],
    ['TIKTOK_OPENUDID', env.legacy.openudid],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length > 0) {
    throw new Error(`Legacy-live mode is missing server-only configuration: ${missing.join(', ')}`);
  }
}

export function resetEnvForTests(): void {
  cachedEnv = undefined;
}
