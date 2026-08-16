import { attachAdapterFailure, makeSource, sourceEndpointLabel } from '@/lib/adapters/source';
import type { AdapterContext, AdapterOutcome } from '@/lib/adapters/types';
import { LookupError, toLookupError } from '@/lib/errors';
import { extractTikTokPageData, findPagePost } from '@/lib/html/tiktok-page';
import { ModernMobileClient } from '@/lib/http/modern-mobile-client';
import { PublicWebClient } from '@/lib/http/public-web-client';
import { normalizePost } from '@/lib/normalize/post';
import { normalizeWebPost } from '@/lib/normalize/web-post';
import { sanitizeRaw } from '@/lib/redact';
import type { LookupIssue, ResultSource } from '@/lib/types';
import { isRecord, sleep } from '@/lib/utils';
import { validateExactAweme } from '@/lib/validation';

function validateUsername(post: Record<string, unknown>, expected?: string): void {
  if (!expected) return;
  const author = isRecord(post.author) ? post.author : undefined;
  const returned = author
    ? typeof author.uniqueId === 'string'
      ? author.uniqueId
      : typeof author.unique_id === 'string'
        ? author.unique_id
        : undefined
    : undefined;
  if (returned && returned.toLowerCase() !== expected.toLowerCase()) {
    throw new LookupError('target_missing', 'The returned post author did not match the username in the URL.', {
      detail: `Expected @${expected}; received @${returned}.`,
      validationStatus: 'target_missing',
    });
  }
}

async function tryPage(
  context: AdapterContext,
  sources: ResultSource[],
  raw: Record<string, unknown>,
): Promise<AdapterOutcome | undefined> {
  if (context.input.type !== 'video_url' || !context.input.canonicalUrl) return undefined;
  const source = makeSource('public-video-page', context.mode, { attempt: 1 });
  sources.push(source);
  try {
    const response = await new PublicWebClient().fetchPostPage(
      context.input.canonicalUrl,
      context.input.username,
      context.signal,
    );
    source.httpStatus = response.httpStatus;
    raw.page = {
      htmlBytes: response.byteLength,
      contentType: response.contentType,
      finalUrl: response.finalUrl,
    };
    const extracted = extractTikTokPageData(response.text);
    const candidate = findPagePost(extracted, context.input.awemeId ?? '');
    validateUsername(candidate.post, context.input.username);
    source.validation = 'validated';
    const normalized = normalizeWebPost({
      post: candidate.post,
      rootPath: candidate.path,
      sourceEndpoint: sourceEndpointLabel(source),
      retrievedAt: context.retrievedAt,
    });
    if (context.includeRaw) {
      raw.pageData = { scriptId: extracted.scriptId, post: candidate.post };
    }
    return {
      adapter: 'publicAwemeAdapter',
      entityType: 'post',
      data: normalized.data,
      fields: normalized.fields,
      sources,
      warnings: normalized.warnings,
      attemptCount: 1,
      validationStatus: normalized.partial ? 'partial' : 'validated',
      raw: context.includeRaw ? sanitizeRaw(raw) : undefined,
    };
  } catch (error) {
    const current = toLookupError(error);
    source.validation = current.validationStatus;
    if (!['upstream_auth', 'upstream_malformed', 'target_missing', 'upstream_error'].includes(current.code)) {
      throw current;
    }
    raw.pageFailure = { code: current.code, message: current.message, detail: current.detail };
    return undefined;
  }
}

export async function publicAwemeAdapter(context: AdapterContext): Promise<AdapterOutcome> {
  const awemeId = context.input.awemeId;
  if (!awemeId) throw new LookupError('invalid_input', 'The normalized Aweme ID is missing.');

  const sources: ResultSource[] = [];
  const raw: Record<string, unknown> = {};
  const warnings: LookupIssue[] = [];

  const pageResult = await tryPage(context, sources, raw);
  if (pageResult) return pageResult;
  if (context.input.type === 'video_url') {
    warnings.push({
      code: 'page_fallback_to_mobile',
      message:
        'The public video page did not yield usable page data, so the exact-Aweme mobile feed fallback was used.',
    });
  }

  const maximumAttempts = 1 + context.targetMissingRetries;
  for (let attempt = 1; attempt <= maximumAttempts; attempt += 1) {
    const source = makeSource('modern-aweme-feed-target', context.mode, {
      attempt: sources.length + 1,
    });
    sources.push(source);
    try {
      const mobile = await new ModernMobileClient().fetchAwemeFeed(awemeId, context.signal);
      source.httpStatus = mobile.response.httpStatus;
      if (!Array.isArray(raw.mobileAttempts)) raw.mobileAttempts = [];
      (raw.mobileAttempts as unknown[]).push(mobile.data);
      const validated = validateExactAweme(mobile.data, awemeId);
      validateUsername(validated.post, context.input.username);
      source.validation = 'validated';
      const normalized = normalizePost({
        post: validated.post,
        rootPath: validated.path,
        sourceEndpoint: sourceEndpointLabel(source),
        retrievedAt: context.retrievedAt,
      });
      return {
        adapter: 'publicAwemeAdapter',
        entityType: 'post',
        data: normalized.data,
        fields: normalized.fields,
        sources,
        warnings: [...warnings, ...normalized.warnings],
        attemptCount: sources.length,
        validationStatus: normalized.partial ? 'partial' : 'validated',
        raw: context.includeRaw ? sanitizeRaw(raw) : undefined,
      };
    } catch (error) {
      const current = toLookupError(error);
      source.validation = current.validationStatus;
      if (current.code === 'target_missing' && attempt < maximumAttempts) {
        await sleep(150 * attempt, context.signal);
        continue;
      }
      throw attachAdapterFailure(current, {
        sources,
        raw: context.includeRaw ? sanitizeRaw(raw) : undefined,
        attemptCount: 0,
      });
    }
  }

  throw new LookupError('target_missing', 'The requested Aweme was not returned.', {
    sources,
    attemptCount: sources.length,
    validationStatus: 'target_missing',
  });
}
