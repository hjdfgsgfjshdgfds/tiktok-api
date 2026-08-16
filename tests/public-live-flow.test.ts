import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetEnvForTests } from '@/lib/env';
import { resetOrchestratorForTests, runLookup } from '@/lib/orchestrator';

const PROFILE_HTML = `<html><script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application/json">${JSON.stringify(
  {
    __DEFAULT_SCOPE__: {
      'webapp.user-detail': {
        userInfo: {
          user: {
            id: '107955',
            secUid: 'MS4wLjABAAAA-public-test',
            uniqueId: 'tiktok',
            nickname: 'TikTok',
            signature: 'Make Your Day',
            region: 'US',
            verified: true,
            privateAccount: false,
            avatarLarger: {
              urlList: ['https://p16-sign.tiktokcdn-us.com/avatar.jpeg?x-expires=1'],
            },
          },
          stats: {
            followerCount: 90000000,
            followingCount: 10,
            heartCount: 1000000000,
            videoCount: 1000,
          },
        },
      },
    },
  },
)}</script></html>`;

const AWEME_ID = '6768504823336815877';

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

function configurePublic() {
  process.env.LOOKUP_MODE = 'public-live';
  process.env.ALLOW_RAW_VIEWER = 'true';
  process.env.TARGET_MISSING_RETRIES = '1';
  process.env.CACHE_TTL_SECONDS = '0';
  resetEnvForTests();
  resetOrchestratorForTests();
}

describe('public-live lookup flow', () => {
  beforeEach(configurePublic);

  afterEach(() => {
    vi.unstubAllGlobals();
    resetEnvForTests();
    resetOrchestratorForTests();
  });

  it('uses a real public profile-page request shape without TikTok credentials', async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      expect(String(input)).toBe('https://www.tiktok.com/@tiktok');
      return new Response(PROFILE_HTML, {
        status: 200,
        headers: { 'content-type': 'text/html; charset=utf-8' },
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const execution = await runLookup({
      query: '@tiktok',
      includeRaw: true,
      requestId: 'public-profile',
    });

    expect(execution.status).toBe(200);
    expect(execution.result).toMatchObject({
      ok: true,
      data: { kind: 'profile', username: 'tiktok', userId: '107955', region: 'US' },
      meta: { mode: 'public-live', adapter: 'publicProfileAdapter', attemptCount: 1 },
    });
    expect(execution.result.sources[0]).toMatchObject({
      method: 'GET',
      host: 'www.tiktok.com',
      validation: 'validated',
    });
    expect(JSON.stringify(execution.result.raw)).toContain('107955');
  });

  it('uses the unauthenticated modern feed and selects the exact requested Aweme', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
        expect(init?.method).toBe('OPTIONS');
        expect(String(input)).toContain('/aweme/v1/feed/?');
        expect(String(input)).toContain(`aweme_id=${AWEME_ID}`);
        return jsonResponse({
          status_code: 0,
          aweme_list: [
            { aweme_id: '6768504823336815000', author: { uid: '1' } },
            {
              aweme_id: AWEME_ID,
              desc: 'Exact target',
              author: { uid: '2', unique_id: 'zachking', region: 'US' },
              statistics: { play_count: 100, digg_count: 25 },
              video: { duration: 12000 },
              region: 'US',
            },
          ],
        });
      }),
    );

    const execution = await runLookup({
      query: `aweme:${AWEME_ID}`,
      includeRaw: false,
      requestId: 'public-aweme',
    });

    expect(execution.status).toBe(200);
    expect(execution.result.data).toMatchObject({
      kind: 'post',
      awemeId: AWEME_ID,
      authorUsername: 'zachking',
      postRegion: 'US',
      authorRegion: 'US',
    });
    expect(execution.result.meta.attemptCount).toBe(1);
  });

  it('returns target_missing after bounded status-0 wrong-target responses', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        status_code: 0,
        aweme_list: [{ aweme_id: '6768504823336815000', author: { uid: '1' } }],
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const execution = await runLookup({
      query: `aweme:${AWEME_ID}`,
      includeRaw: false,
      requestId: 'public-miss',
    });

    expect(execution.status).toBe(404);
    expect(execution.result.errors[0]?.code).toBe('target_missing');
    expect(execution.result.meta.attemptCount).toBe(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
