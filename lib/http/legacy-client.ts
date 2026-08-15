import 'server-only';

import JSONbig from 'json-bigint';
import { LookupError } from '@/lib/errors';
import { assertLegacyLiveConfigured, getServerEnv } from '@/lib/env';
import type { EndpointClient, LegacyPath, UpstreamResponse } from '@/lib/http/types';
import { signerResponseSchema } from '@/lib/schemas';

const MAX_RESPONSE_BYTES = 5 * 1024 * 1024;
const MAX_SIGNER_RESPONSE_BYTES = 64 * 1024;
const JSON_BIG = JSONbig({ storeAsString: true, useNativeBigInt: false });

const PARAM_ORDER = [
  'app_language',
  'language',
  'region',
  'sys_region',
  'carrier_region',
  'carrier_region_v2',
  'build_number',
  'timezone_offset',
  'timezone_name',
  'mcc_mnc',
  'is_my_cn',
  'fp',
  'account_region',
  'pass-region',
  'pass-route',
  'iid',
  'device_id',
  'ac',
  'channel',
  'aid',
  'app_name',
  'version_code',
  'version_name',
  'device_platform',
  'ssmix',
  'device_type',
  'device_brand',
  'os_api',
  'os_version',
  'openudid',
  'manifest_version_code',
  'resolution',
  'dpi',
  'update_version_code',
  '_rticket',
  'ts',
];

const STATIC_PARAMS = {
  os_api: '23',
  device_type: 'Pixel',
  ssmix: 'a',
  manifest_version_code: '2018111632',
  dpi: '420',
  app_name: 'musical_ly',
  version_name: '9.1.0',
  timezone_offset: '36000',
  is_my_cn: '0',
  ac: 'wifi',
  update_version_code: '2018111632',
  channel: 'googleplay',
  device_platform: 'android',
  build_number: '9.1.0',
  version_code: '910',
  timezone_name: 'Australia/Brisbane',
  resolution: '1080*1920',
  os_version: '7.1.2',
  device_brand: 'Google',
  mcc_mnc: '',
  app_language: 'en',
  language: 'en',
  region: 'US',
  sys_region: 'US',
  carrier_region: 'AU',
  carrier_region_v2: '505',
  aid: '1233',
  'pass-region': '1',
  'pass-route': '1',
} as const;

const cooldownUntilByHost = new Map<string, number>();

function abortAfter(
  milliseconds: number,
  parentSignal?: AbortSignal,
): { signal: AbortSignal; clear: () => void } {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), milliseconds);
  const abortFromParent = () => controller.abort();
  if (parentSignal?.aborted) abortFromParent();
  else parentSignal?.addEventListener('abort', abortFromParent, { once: true });
  return {
    signal: controller.signal,
    clear: () => {
      clearTimeout(timeout);
      parentSignal?.removeEventListener('abort', abortFromParent);
    },
  };
}

function orderedQueryString(values: Record<string, string>): string {
  const timestampBoundary = PARAM_ORDER.indexOf('_rticket');
  const rank = (key: string) => {
    const index = PARAM_ORDER.indexOf(key);
    // Endpoint-specific parameters are appended after the common legacy
    // device/application parameters but before the volatile timestamps.
    // Array.sort is stable, so multiple endpoint parameters retain their
    // caller-provided order within this boundary.
    return index === -1 ? timestampBoundary - 0.5 : index;
  };
  const entries = Object.entries(values).sort(([left], [right]) => rank(left) - rank(right));

  // The connected repository uses qs with encode: false. The adapter inputs are
  // constrained to known keys and already-validated usernames/decimal IDs, so
  // preserving the legacy byte shape is safe here and avoids inventing a new
  // signing contract through URLSearchParams percent-encoding.
  return entries.map(([key, value]) => `${key}=${value}`).join('&');
}

function assertSameRequestTarget(unsignedUrl: URL, signedUrl: URL): void {
  if (signedUrl.protocol !== 'https:' || signedUrl.username || signedUrl.password) {
    throw new LookupError('upstream_auth', 'The signer returned an unsafe URL.');
  }
  if (signedUrl.hash) {
    throw new LookupError('upstream_auth', 'The signer returned a URL containing a fragment.');
  }
  if (signedUrl.host !== unsignedUrl.host || signedUrl.pathname !== unsignedUrl.pathname) {
    throw new LookupError('upstream_auth', 'The signer changed the upstream request target.');
  }

  for (const [key, value] of unsignedUrl.searchParams.entries()) {
    const signedValues = signedUrl.searchParams.getAll(key);
    if (signedValues.length !== 1 || signedValues[0] !== value) {
      throw new LookupError('upstream_auth', `The signer changed required parameter ${key}.`);
    }
  }
}

export class LegacyTikTokClient implements EndpointClient {
  async get(
    path: LegacyPath,
    params: Record<string, string | number | boolean | undefined>,
    options?: { signal?: AbortSignal },
  ): Promise<UpstreamResponse> {
    const env = getServerEnv();
    assertLegacyLiveConfigured(env);

    const baseUrl = new URL(env.legacy.baseUrl);
    const cooldownUntil = cooldownUntilByHost.get(baseUrl.host) ?? 0;
    if (cooldownUntil > Date.now()) {
      throw new LookupError(
        'upstream_rate_limited',
        'The upstream is cooling down after a refusal.',
        {
          retryable: true,
          detail: `Cooldown ends at ${new Date(cooldownUntil).toISOString()}`,
        },
      );
    }

    const now = Date.now();
    const timestamp = Math.floor(now / 1000);
    const merged: Record<string, string> = {
      ...STATIC_PARAMS,
      fp: env.legacy.fp,
      iid: env.legacy.iid,
      device_id: env.legacy.deviceId,
      openudid: env.legacy.openudid,
      ...Object.fromEntries(
        Object.entries(params)
          .filter(([, value]) => value !== undefined)
          .map(([key, value]) => [key, String(value)]),
      ),
      _rticket: String(now),
      ts: String(timestamp),
    };

    const unsignedUrl = new URL(path, baseUrl);
    unsignedUrl.search = orderedQueryString(merged);
    const signedUrl = await this.sign(unsignedUrl, timestamp, env.legacy.deviceId, options?.signal);
    assertSameRequestTarget(unsignedUrl, signedUrl);

    const abort = abortAfter(env.requestTimeoutMs, options?.signal);
    const started = performance.now();
    try {
      const response = await fetch(signedUrl, {
        method: 'GET',
        redirect: 'manual',
        signal: abort.signal,
        headers: {
          'user-agent':
            'com.zhiliaoapp.musically/2018111632 (Linux; U; Android 7.1.2; en_US; Pixel; Build/NHG47Q; Cronet/58.0.2991.0)',
          'sdk-version': '1',
          'x-ss-tc': '0',
          accept: 'application/json',
          ...(env.legacy.cookie ? { cookie: env.legacy.cookie } : {}),
        },
      });

      if (response.status === 403 || response.status === 429) {
        cooldownUntilByHost.set(baseUrl.host, Date.now() + env.upstreamCooldownSeconds * 1000);
      }
      if (response.status === 403) {
        throw new LookupError('upstream_auth', 'TikTok refused the legacy request.', {
          detail: 'HTTP 403; legacy credentials, device context, or signing may be invalid.',
        });
      }
      if (response.status === 429) {
        throw new LookupError('upstream_rate_limited', 'TikTok rate-limited the legacy request.', {
          retryable: true,
        });
      }
      if (response.status >= 300 && response.status < 400) {
        throw new LookupError('upstream_error', 'The upstream returned an unexpected redirect.');
      }
      if (!response.ok) {
        throw new LookupError('upstream_error', `The upstream returned HTTP ${response.status}.`);
      }

      const declaredLength = Number(response.headers.get('content-length') ?? 0);
      if (declaredLength > MAX_RESPONSE_BYTES) {
        throw new LookupError(
          'upstream_malformed',
          'The upstream response exceeded the size limit.',
        );
      }

      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.byteLength > MAX_RESPONSE_BYTES) {
        throw new LookupError(
          'upstream_malformed',
          'The upstream response exceeded the size limit.',
        );
      }
      if (bytes.byteLength === 0) {
        throw new LookupError('upstream_malformed', 'The upstream returned an empty body.');
      }

      const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
      let data: unknown;
      try {
        data = JSON_BIG.parse(text);
      } catch (error) {
        throw new LookupError('upstream_malformed', 'The upstream returned malformed JSON.', {
          cause: error,
        });
      }

      return {
        httpStatus: response.status,
        data,
        byteLength: bytes.byteLength,
        elapsedMs: Math.round(performance.now() - started),
      };
    } catch (error) {
      if (error instanceof LookupError) throw error;
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new LookupError('timeout', 'The upstream request timed out.', { retryable: true });
      }
      throw new LookupError('upstream_error', 'The legacy upstream request failed.', {
        cause: error,
      });
    } finally {
      abort.clear();
    }
  }

  private async sign(
    unsignedUrl: URL,
    timestamp: number,
    deviceId: string,
    parentSignal?: AbortSignal,
  ): Promise<URL> {
    const env = getServerEnv();
    assertLegacyLiveConfigured(env);
    const signerUrl = new URL(env.legacy.signerUrl);
    if (signerUrl.username || signerUrl.password) {
      throw new LookupError('upstream_auth', 'The signer URL contains embedded credentials.');
    }

    const abort = abortAfter(env.requestTimeoutMs, parentSignal);
    try {
      const response = await fetch(signerUrl, {
        method: 'POST',
        redirect: 'error',
        signal: abort.signal,
        headers: {
          'content-type': 'application/json',
          accept: 'application/json',
          ...(env.legacy.signerToken ? { authorization: `Bearer ${env.legacy.signerToken}` } : {}),
        },
        body: JSON.stringify({
          url: unsignedUrl.toString(),
          timestamp,
          deviceId,
        }),
      });

      if (!response.ok) {
        throw new LookupError(
          'upstream_auth',
          `The signer bridge returned HTTP ${response.status}.`,
        );
      }

      const declaredLength = Number(response.headers.get('content-length') ?? 0);
      if (declaredLength > MAX_SIGNER_RESPONSE_BYTES) {
        throw new LookupError(
          'upstream_auth',
          'The signer bridge response exceeded the size limit.',
        );
      }
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.byteLength === 0 || bytes.byteLength > MAX_SIGNER_RESPONSE_BYTES) {
        throw new LookupError(
          'upstream_auth',
          'The signer bridge returned an invalid response size.',
        );
      }

      let signerData: unknown;
      try {
        signerData = JSON.parse(new TextDecoder('utf-8', { fatal: false }).decode(bytes));
      } catch (error) {
        throw new LookupError('upstream_auth', 'The signer bridge returned malformed JSON.', {
          cause: error,
        });
      }
      const parsed = signerResponseSchema.safeParse(signerData);
      if (!parsed.success) {
        throw new LookupError('upstream_auth', 'The signer bridge returned an invalid response.');
      }
      return new URL(parsed.data.signedUrl);
    } catch (error) {
      if (error instanceof LookupError) throw error;
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new LookupError('timeout', 'The signer bridge timed out.', { retryable: true });
      }
      throw new LookupError('upstream_auth', 'The signer bridge request failed.', { cause: error });
    } finally {
      abort.clear();
    }
  }
}

export function resetLegacyCooldownForTests(): void {
  cooldownUntilByHost.clear();
}
