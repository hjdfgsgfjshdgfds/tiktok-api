import { attachAdapterFailure, makeSource, sourceEndpointLabel } from '@/lib/adapters/source';
import type { AdapterContext, AdapterOutcome } from '@/lib/adapters/types';
import { LookupError, toLookupError } from '@/lib/errors';
import { extractTikTokPageData, findPageProfile } from '@/lib/html/tiktok-page';
import { ModernMobileClient } from '@/lib/http/modern-mobile-client';
import { PublicWebClient } from '@/lib/http/public-web-client';
import { normalizeWebProfile } from '@/lib/normalize/web-profile';
import { sanitizeRaw } from '@/lib/redact';
import type { ResultSource } from '@/lib/types';
import { isRecord } from '@/lib/utils';

function statusFromEnvelope(value: Record<string, unknown>): number | undefined {
  const candidates = [value.status_code, value.statusCode];
  for (const candidate of candidates) {
    if (typeof candidate === 'number') return candidate;
    if (typeof candidate === 'string' && /^-?\d+$/.test(candidate)) return Number(candidate);
  }
  return undefined;
}

function deepFind(
  root: unknown,
  predicate: (value: Record<string, unknown>) => boolean,
  maxDepth = 14,
): { value: Record<string, unknown>; path: string } | undefined {
  const seen = new WeakSet<object>();
  const walk = (
    value: unknown,
    path: string,
    depth: number,
  ): { value: Record<string, unknown>; path: string } | undefined => {
    if (depth > maxDepth) return undefined;
    if (Array.isArray(value)) {
      if (seen.has(value)) return undefined;
      seen.add(value);
      for (let index = 0; index < value.length; index += 1) {
        const found = walk(value[index], `${path}[${index}]`, depth + 1);
        if (found) return found;
      }
      return undefined;
    }
    if (!isRecord(value)) return undefined;
    if (seen.has(value)) return undefined;
    seen.add(value);
    if (predicate(value)) return { value, path };
    for (const [key, child] of Object.entries(value)) {
      const found = walk(child, path ? `${path}.${key}` : key, depth + 1);
      if (found) return found;
    }
    return undefined;
  };
  return walk(root, '', 0);
}

function extractMobileProfile(
  data: Record<string, unknown>,
  requestedUserId: string,
): {
  user: Record<string, unknown>;
  stats?: Record<string, unknown>;
  path: string;
  statsPath?: string;
} {
  const code = statusFromEnvelope(data);
  if (code !== undefined && code !== 0) {
    throw new LookupError(
      'upstream_error',
      `TikTok returned status ${code} for the profile request.`,
    );
  }

  const exact = deepFind(data, (candidate) => {
    const id = candidate.uid ?? candidate.id;
    return (
      String(id ?? '') === requestedUserId &&
      Boolean(candidate.nickname || candidate.unique_id || candidate.uniqueId)
    );
  });
  if (!exact) {
    throw new LookupError(
      'target_missing',
      'The requested user ID was absent from the mobile profile response.',
      {
        validationStatus: 'target_missing',
      },
    );
  }

  const stats = deepFind(data, (candidate) => {
    return (
      candidate !== exact.value &&
      (candidate.follower_count !== undefined ||
        candidate.followerCount !== undefined ||
        candidate.aweme_count !== undefined ||
        candidate.videoCount !== undefined)
    );
  });

  return {
    user: exact.value,
    stats: stats?.value,
    path: exact.path,
    statsPath: stats?.path,
  };
}

export async function publicProfileAdapter(context: AdapterContext): Promise<AdapterOutcome> {
  const sources: ResultSource[] = [];
  const raw: Record<string, unknown> = {};
  let attempts = 0;

  try {
    if (context.input.type === 'username') {
      const username = context.input.username;
      if (!username) throw new LookupError('invalid_input', 'The normalized username is missing.');

      attempts += 1;
      const source = makeSource('public-profile-page', context.mode, { attempt: attempts });
      sources.push(source);
      const response = await new PublicWebClient().fetchProfilePage(username, context.signal);
      source.httpStatus = response.httpStatus;
      raw.page = {
        htmlBytes: response.byteLength,
        contentType: response.contentType,
        finalUrl: response.finalUrl,
      };

      const extracted = extractTikTokPageData(response.text);
      const candidate = findPageProfile(extracted, username);
      source.validation = 'validated';
      const normalized = normalizeWebProfile({
        user: candidate.user,
        stats: candidate.stats,
        userPath: candidate.userPath,
        statsPath: candidate.statsPath,
        sourceEndpoint: sourceEndpointLabel(source),
        retrievedAt: context.retrievedAt,
      });

      if (context.includeRaw) {
        raw.pageData = {
          scriptId: extracted.scriptId,
          user: candidate.user,
          stats: candidate.stats,
        };
      }

      return {
        adapter: 'publicProfileAdapter',
        entityType: 'profile',
        data: normalized.data,
        fields: normalized.fields,
        sources,
        warnings: normalized.warnings,
        attemptCount: attempts,
        validationStatus: normalized.partial ? 'partial' : 'validated',
        raw: context.includeRaw ? sanitizeRaw(raw) : undefined,
      };
    }

    const userId = context.input.userId;
    if (!userId) throw new LookupError('invalid_input', 'The normalized user ID is missing.');

    attempts += 1;
    const source = makeSource('modern-profile-by-id', context.mode, { attempt: attempts });
    sources.push(source);
    const mobile = await new ModernMobileClient().fetchProfileByUserId(userId, context.signal);
    source.httpStatus = mobile.response.httpStatus;
    raw.profile = mobile.data;
    const candidate = extractMobileProfile(mobile.data, userId);
    source.validation = 'validated';
    const normalized = normalizeWebProfile({
      user: candidate.user,
      stats: candidate.stats,
      userPath: candidate.path,
      statsPath: candidate.statsPath,
      sourceEndpoint: sourceEndpointLabel(source),
      retrievedAt: context.retrievedAt,
    });

    return {
      adapter: 'publicProfileAdapter',
      entityType: 'profile',
      data: normalized.data,
      fields: normalized.fields,
      sources,
      warnings: [
        ...normalized.warnings,
        {
          code: 'mobile_profile_experimental',
          message:
            'Numeric user-ID lookup uses an unauthenticated mobile-shaped endpoint and may be less stable than username lookup.',
        },
      ],
      attemptCount: attempts,
      validationStatus: normalized.partial ? 'partial' : 'validated',
      raw: context.includeRaw ? sanitizeRaw(raw) : undefined,
    };
  } catch (error) {
    const current = toLookupError(error);
    const latest = sources.at(-1);
    if (latest && !latest.validation) latest.validation = current.validationStatus;
    throw attachAdapterFailure(current, {
      sources,
      raw: context.includeRaw ? sanitizeRaw(raw) : undefined,
      attemptCount: attempts,
    });
  }
}
