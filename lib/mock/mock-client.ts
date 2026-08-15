import { createHash } from 'node:crypto';
import { LookupError } from '@/lib/errors';
import type { EndpointClient, LegacyPath, UpstreamResponse } from '@/lib/http/types';
import {
  createMockPost,
  createMockUser,
  MOCK_IDS,
  MOCK_PROFILE_FIXTURES
} from '@/lib/mock/fixtures';
import { sleep } from '@/lib/utils';

function syntheticUid(username: string): string {
  const hex = createHash('sha256').update(username).digest('hex').slice(0, 15);
  const value = BigInt(`0x${hex}`) % 900000000000000000n;
  return (6000000000000000000n + value).toString();
}

function response(data: unknown, elapsedMs = 18): UpstreamResponse {
  return {
    httpStatus: 200,
    data,
    byteLength: Buffer.byteLength(JSON.stringify(data)),
    elapsedMs
  };
}

function scenarioUsername(value: unknown): string {
  return typeof value === 'string' ? value.toLowerCase() : '';
}

function profileForUsername(username: string): Record<string, unknown> {
  if (username === 'example') return structuredClone(MOCK_PROFILE_FIXTURES.example);
  if (username === 'private') return structuredClone(MOCK_PROFILE_FIXTURES.private);
  if (username === 'partial') return structuredClone(MOCK_PROFILE_FIXTURES.partial);
  return createMockUser({ username, uid: syntheticUid(username) });
}

function profileForId(userId: string): Record<string, unknown> | undefined {
  if (userId === MOCK_IDS.profile) return structuredClone(MOCK_PROFILE_FIXTURES.example);
  if (userId === MOCK_IDS.privateProfile) return structuredClone(MOCK_PROFILE_FIXTURES.private);
  if (userId === MOCK_IDS.partialProfile) return structuredClone(MOCK_PROFILE_FIXTURES.partial);
  if (/^6\d{18}$/.test(userId)) {
    return createMockUser({ username: `user_${userId.slice(-6)}`, uid: userId });
  }
  return undefined;
}

export class MockTikTokClient implements EndpointClient {
  async get(
    path: LegacyPath,
    params: Record<string, string | number | boolean | undefined>,
    options?: { signal?: AbortSignal },
  ): Promise<UpstreamResponse> {
    await sleep(70, options?.signal);

    if (path === '/aweme/v1/discover/search/') {
      const username = scenarioUsername(params.keyword);
      if (username === 'timeout') {
        throw new LookupError('timeout', 'The mock upstream timed out.', { retryable: true });
      }
      if (username === 'forbidden') {
        throw new LookupError('upstream_auth', 'The mock upstream returned HTTP 403.');
      }
      if (username === 'ratelimited') {
        throw new LookupError('upstream_rate_limited', 'The mock upstream returned HTTP 429.', {
          retryable: true
        });
      }
      if (username === 'malformed') {
        return response({ status_code: 0, user_list: 'not-an-array' });
      }
      if (username === 'unavailable') {
        return response({ status_code: 0, user_list: [], has_more: 0, cursor: 0 });
      }

      const user = profileForUsername(username || 'example');
      return response({
        status_code: 0,
        user_list: [{ user_info: user, position: [], uniqid_position: [] }],
        has_more: 0,
        cursor: 1,
        type: 1,
        extra: { now: Date.now() }
      });
    }

    if (path === '/aweme/v1/user/') {
      const userId = String(params.user_id ?? '');
      const user = profileForId(userId);
      if (!user) {
        return response({
          status_code: 0,
          user: createMockUser({ username: 'different_target', uid: '6999999999999999999' }),
          extra: { now: Date.now() }
        });
      }
      return response({ status_code: 0, user, extra: { now: Date.now() } });
    }

    if (path === '/aweme/v1/aweme/detail/' || path === '/aweme/v1/feed/') {
      const awemeId = String(params.aweme_id ?? '');
      if (awemeId === MOCK_IDS.timeoutPost) {
        throw new LookupError('timeout', 'The mock upstream timed out.', { retryable: true });
      }
      if (awemeId === MOCK_IDS.forbiddenPost) {
        throw new LookupError('upstream_auth', 'The mock upstream returned HTTP 403.');
      }
      if (awemeId === MOCK_IDS.rateLimitedPost) {
        throw new LookupError('upstream_rate_limited', 'The mock upstream returned HTTP 429.', {
          retryable: true
        });
      }
      if (awemeId === MOCK_IDS.malformedPost) {
        return response({ status_code: 0, aweme_detail: { aweme_id: 123 } });
      }
      if (awemeId === MOCK_IDS.targetMissingPost || /^68\d{17}$/.test(awemeId)) {
        return response({
          status_code: 0,
          aweme_list: [createMockPost(MOCK_IDS.wrongPost)],
          extra: { now: Date.now() }
        });
      }
      if (awemeId === MOCK_IDS.partialPost) {
        return response({
          status_code: 0,
          aweme_detail: createMockPost(awemeId, { partial: true }),
          extra: { now: Date.now() }
        });
      }

      return response({
        status_code: 0,
        aweme_detail: createMockPost(awemeId || MOCK_IDS.post),
        extra: { now: Date.now() }
      });
    }

    return response({ status_code: 0, has_more: 0, extra: { now: Date.now() } });
  }
}
