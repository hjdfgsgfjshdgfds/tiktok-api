import JSONBigFactory from 'json-bigint';

import { LookupError } from '@/lib/errors';
import { isRecord } from '@/lib/utils';

const JSONBig = JSONBigFactory({ storeAsString: true, strict: true });
const UNIVERSAL_SCRIPT = '__UNIVERSAL_DATA_FOR_REHYDRATION__';
const SIGI_SCRIPT = 'SIGI_STATE';

export interface TikTokPageData {
  scriptId: typeof UNIVERSAL_SCRIPT | typeof SIGI_SCRIPT;
  root: Record<string, unknown>;
}

export interface PageProfileCandidate {
  user: Record<string, unknown>;
  stats?: Record<string, unknown>;
  userPath: string;
  statsPath?: string;
}

export interface PagePostCandidate {
  post: Record<string, unknown>;
  path: string;
}

function scriptBody(html: string, id: string): string | undefined {
  const openPattern = new RegExp(`<script[^>]+id=["']${id}["'][^>]*>`, 'i');
  const open = openPattern.exec(html);
  if (!open) return undefined;
  const start = open.index + open[0].length;
  const end = html.indexOf('</script>', start);
  if (end < 0) return undefined;
  return html.slice(start, end).trim();
}

function parseObject(value: string, label: string): Record<string, unknown> {
  try {
    const parsed = JSONBig.parse(value) as unknown;
    if (!isRecord(parsed)) {
      throw new LookupError('upstream_malformed', `${label} was not a JSON object.`);
    }
    return parsed;
  } catch (error) {
    if (error instanceof LookupError) throw error;
    throw new LookupError('upstream_malformed', `${label} contained malformed JSON.`, {
      cause: error,
    });
  }
}

export function extractTikTokPageData(html: string): TikTokPageData {
  if (/captcha|verify to continue|security check|access denied/i.test(html.slice(0, 300_000))) {
    throw new LookupError('upstream_auth', 'TikTok returned a browser verification page.');
  }

  const universal = scriptBody(html, UNIVERSAL_SCRIPT);
  if (universal) {
    return { scriptId: UNIVERSAL_SCRIPT, root: parseObject(universal, UNIVERSAL_SCRIPT) };
  }

  const sigi = scriptBody(html, SIGI_SCRIPT);
  if (sigi) return { scriptId: SIGI_SCRIPT, root: parseObject(sigi, SIGI_SCRIPT) };

  throw new LookupError(
    'upstream_malformed',
    'TikTok page data was not present in a supported rehydration script.',
  );
}

function sameUsername(value: unknown, expected: string): boolean {
  return typeof value === 'string' && value.toLowerCase() === expected.toLowerCase();
}

function universalScope(root: Record<string, unknown>): Record<string, unknown> | undefined {
  return isRecord(root.__DEFAULT_SCOPE__) ? root.__DEFAULT_SCOPE__ : undefined;
}

function userFromDetail(
  detail: Record<string, unknown>,
  expectedUsername: string,
  basePath: string,
): PageProfileCandidate | undefined {
  const userInfo = isRecord(detail.userInfo) ? detail.userInfo : undefined;
  const user = userInfo && isRecord(userInfo.user) ? userInfo.user : undefined;
  if (!user || !sameUsername(user.uniqueId ?? user.unique_id, expectedUsername)) return undefined;
  const stats = userInfo && isRecord(userInfo.stats) ? userInfo.stats : undefined;
  return {
    user,
    stats,
    userPath: `${basePath}.userInfo.user`,
    statsPath: stats ? `${basePath}.userInfo.stats` : undefined,
  };
}

function recursiveFindProfile(
  value: unknown,
  expectedUsername: string,
  path = '',
  depth = 0,
  seen = new WeakSet<object>(),
): PageProfileCandidate | undefined {
  if (depth > 14) return undefined;
  if (Array.isArray(value)) {
    if (seen.has(value)) return undefined;
    seen.add(value);
    for (let index = 0; index < value.length; index += 1) {
      const found = recursiveFindProfile(
        value[index],
        expectedUsername,
        `${path}[${index}]`,
        depth + 1,
        seen,
      );
      if (found) return found;
    }
    return undefined;
  }
  if (!isRecord(value)) return undefined;
  if (seen.has(value)) return undefined;
  seen.add(value);

  if (
    sameUsername(value.uniqueId ?? value.unique_id, expectedUsername) &&
    (value.id !== undefined ||
      value.uid !== undefined ||
      value.secUid !== undefined ||
      value.sec_uid !== undefined)
  ) {
    return { user: value, userPath: path || '$' };
  }

  for (const [key, child] of Object.entries(value)) {
    const found = recursiveFindProfile(
      child,
      expectedUsername,
      path ? `${path}.${key}` : key,
      depth + 1,
      seen,
    );
    if (found) return found;
  }
  return undefined;
}

export function findPageProfile(
  page: TikTokPageData,
  expectedUsername: string,
): PageProfileCandidate {
  const scope = universalScope(page.root);
  const detail =
    scope && isRecord(scope['webapp.user-detail']) ? scope['webapp.user-detail'] : undefined;
  if (detail) {
    const candidate = userFromDetail(
      detail,
      expectedUsername,
      '__DEFAULT_SCOPE__.webapp.user-detail',
    );
    if (candidate) return candidate;
  }

  const userModule = isRecord(page.root.UserModule) ? page.root.UserModule : undefined;
  const users = userModule && isRecord(userModule.users) ? userModule.users : undefined;
  if (users) {
    for (const [key, value] of Object.entries(users)) {
      if (!isRecord(value)) continue;
      if (sameUsername(value.uniqueId ?? value.unique_id ?? key, expectedUsername)) {
        const statsModule = userModule && isRecord(userModule.stats) ? userModule.stats : undefined;
        const stats = statsModule && isRecord(statsModule[key]) ? statsModule[key] : undefined;
        return {
          user: value,
          stats,
          userPath: `UserModule.users.${key}`,
          statsPath: stats ? `UserModule.stats.${key}` : undefined,
        };
      }
    }
  }

  const recursive = recursiveFindProfile(page.root, expectedUsername);
  if (recursive) return recursive;

  throw new LookupError(
    'target_missing',
    'The exact requested username was absent from the TikTok page.',
    {
      validationStatus: 'target_missing',
    },
  );
}

function recursiveFindPost(
  value: unknown,
  awemeId: string,
  path = '',
  depth = 0,
  seen = new WeakSet<object>(),
): PagePostCandidate | undefined {
  if (depth > 14) return undefined;
  if (Array.isArray(value)) {
    if (seen.has(value)) return undefined;
    seen.add(value);
    for (let index = 0; index < value.length; index += 1) {
      const found = recursiveFindPost(value[index], awemeId, `${path}[${index}]`, depth + 1, seen);
      if (found) return found;
    }
    return undefined;
  }
  if (!isRecord(value)) return undefined;
  if (seen.has(value)) return undefined;
  seen.add(value);

  const candidateId = value.id ?? value.aweme_id ?? value.awemeId;
  if (
    String(candidateId ?? '') === awemeId &&
    (value.author !== undefined || value.video !== undefined || value.imagePost !== undefined)
  ) {
    return { post: value, path: path || '$' };
  }

  for (const [key, child] of Object.entries(value)) {
    const found = recursiveFindPost(child, awemeId, path ? `${path}.${key}` : key, depth + 1, seen);
    if (found) return found;
  }
  return undefined;
}

export function findPagePost(page: TikTokPageData, awemeId: string): PagePostCandidate {
  const scope = universalScope(page.root);
  const detail =
    scope && isRecord(scope['webapp.video-detail']) ? scope['webapp.video-detail'] : undefined;
  const itemInfo = detail && isRecord(detail.itemInfo) ? detail.itemInfo : undefined;
  const itemStruct = itemInfo && isRecord(itemInfo.itemStruct) ? itemInfo.itemStruct : undefined;
  if (itemStruct && String(itemStruct.id ?? itemStruct.aweme_id ?? '') === awemeId) {
    return { post: itemStruct, path: '__DEFAULT_SCOPE__.webapp.video-detail.itemInfo.itemStruct' };
  }

  const itemModule = isRecord(page.root.ItemModule) ? page.root.ItemModule : undefined;
  const item = itemModule && isRecord(itemModule[awemeId]) ? itemModule[awemeId] : undefined;
  if (item) return { post: item, path: `ItemModule.${awemeId}` };

  const recursive = recursiveFindPost(page.root, awemeId);
  if (recursive) return recursive;

  throw new LookupError(
    'target_missing',
    'The exact requested Aweme was absent from the TikTok page.',
    {
      validationStatus: 'target_missing',
    },
  );
}
