import { isRecord } from '@/lib/utils';

const REDACTED = '[REDACTED]';

const SENSITIVE_KEY =
  /(?:^|[_-])(?:cookie|authorization|token|session|password|secret|device(?:_?id)?|openudid|iid|fp|ms_?token|x[-_]?bogus|x[-_]?gnarly|x[-_]?argus|x[-_]?gorgon|x[-_]?ladon|signature|signed|proxy)(?:$|[_-])/i;

const SENSITIVE_FIELD_NAMES = new Set([
  'cookie',
  'set_cookie',
  'authorization',
  'proxy_authorization',
  'password',
  'secret',
  'client_secret',
  'auth_key',
  'authkey',
  'token',
  'access_token',
  'refresh_token',
  'ms_token',
  'mstoken',
  'session',
  'session_id',
  'sessionid',
  'sessionid_ss',
  'sid_tt',
  'uid_tt',
  'odin_tt',
  'passport_csrf_token',
  'tt_chain_token',
  'device_id',
  'deviceid',
  'install_id',
  'iid',
  'openudid',
  'fp',
  'x_bogus',
  'x_gnarly',
  'x_argus',
  'x_gorgon',
  'x_ladon',
  '_signature',
  'signature',
  'signed_url',
  'proxy_password',
]);

const SENSITIVE_QUERY_KEYS = new Set(
  [
    'as',
    'cp',
    'mas',
    '_signature',
    'signature',
    'sig',
    'x-bogus',
    'x-gnarly',
    'x-argus',
    'x-gorgon',
    'x-ladon',
    'mstoken',
    'ms_token',
    'device_id',
    'deviceid',
    'iid',
    'install_id',
    'openudid',
    'fp',
    'sessionid',
    'sessionid_ss',
    'sid_tt',
    'uid_tt',
    'odin_tt',
    'passport_csrf_token',
    'tt_chain_token',
    'auth_key',
    'authkey',
    'policy',
    'key-pair-id',
    'x-expires',
    'expires',
  ].map((key) => key.toLowerCase()),
);

const ALLOWED_MEDIA_SUFFIXES = [
  '.tiktokcdn.com',
  '.tiktokcdn-us.com',
  '.tiktokv.com',
  '.tiktokv.us',
  '.muscdn.com',
  '.byteoversea.com',
  '.ibytedtos.com',
  '.byteimg.com',
];

function isSensitiveQueryKey(key: string): boolean {
  const normalized = key.toLowerCase();
  return SENSITIVE_QUERY_KEYS.has(normalized) || /(?:token|signature|auth|credential)/i.test(key);
}

function isSensitiveFieldKey(key: string): boolean {
  const normalized = key.trim().toLowerCase().replace(/-/g, '_');
  return SENSITIVE_FIELD_NAMES.has(normalized) || SENSITIVE_KEY.test(key);
}

export function sanitizeUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return value;
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return '[REDACTED_URL]';
  url.username = '';
  url.password = '';
  url.hash = '';

  for (const key of [...url.searchParams.keys()]) {
    if (isSensitiveQueryKey(key)) url.searchParams.set(key, REDACTED);
  }

  return url.toString();
}

export function safePublicMediaUrl(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length === 0) return undefined;
  if (value.startsWith('/')) {
    if (value.startsWith('//') || value.startsWith('/\\')) return undefined;
    try {
      const local = new URL(value, 'https://aweme-lens.local');
      if (local.origin !== 'https://aweme-lens.local') return undefined;
      local.hash = '';
      for (const key of [...local.searchParams.keys()]) {
        if (isSensitiveQueryKey(key)) local.searchParams.set(key, REDACTED);
      }
      return `${local.pathname}${local.search}`;
    } catch {
      return undefined;
    }
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return undefined;
  }

  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    (url.port && url.port !== '443')
  ) {
    return undefined;
  }
  const host = url.hostname.toLowerCase();
  if (!ALLOWED_MEDIA_SUFFIXES.some((suffix) => host === suffix.slice(1) || host.endsWith(suffix))) {
    return undefined;
  }

  return sanitizeUrl(url.toString());
}

interface SanitizeOptions {
  maxDepth?: number;
  maxArrayLength?: number;
  maxObjectKeys?: number;
}

export function sanitizeRaw(value: unknown, options: SanitizeOptions = {}): unknown {
  const maxDepth = options.maxDepth ?? 12;
  const maxArrayLength = options.maxArrayLength ?? 500;
  const maxObjectKeys = options.maxObjectKeys ?? 500;
  const seen = new WeakSet<object>();

  const visit = (current: unknown, depth: number, parentKey?: string): unknown => {
    if (parentKey && isSensitiveFieldKey(parentKey)) return REDACTED;
    if (depth > maxDepth) return '[TRUNCATED_DEPTH]';

    if (typeof current === 'string') {
      if (/^https?:\/\//i.test(current)) return sanitizeUrl(current);
      return current.length > 20_000 ? `${current.slice(0, 20_000)}…[TRUNCATED]` : current;
    }

    if (
      current === null ||
      typeof current === 'number' ||
      typeof current === 'boolean' ||
      current === undefined
    ) {
      return current;
    }

    if (typeof current === 'bigint') return current.toString();

    if (Array.isArray(current)) {
      if (seen.has(current)) return '[CIRCULAR]';
      seen.add(current);
      const output = current.slice(0, maxArrayLength).map((item) => visit(item, depth + 1));
      if (current.length > maxArrayLength)
        output.push(`[TRUNCATED_${current.length - maxArrayLength}_ITEMS]`);
      return output;
    }

    if (isRecord(current)) {
      if (seen.has(current)) return '[CIRCULAR]';
      seen.add(current);
      const entries = Object.entries(current).slice(0, maxObjectKeys);
      const output: Record<string, unknown> = {};
      for (const [key, item] of entries) output[key] = visit(item, depth + 1, key);
      if (Object.keys(current).length > maxObjectKeys) output.__truncated__ = true;
      return output;
    }

    return String(current);
  };

  return visit(value, 0);
}

export function containsSecretMarker(value: string): boolean {
  return /(?:sessionid|sid_tt|msToken|X-Bogus|X-Argus|X-Gorgon|X-Ladon|openudid|device_id)=([^&\s]+)/i.test(
    value,
  );
}
