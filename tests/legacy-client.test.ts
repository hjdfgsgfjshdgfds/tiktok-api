import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetEnvForTests } from '@/lib/env';
import { LegacyTikTokClient, resetLegacyCooldownForTests } from '@/lib/http/legacy-client';

function configureLegacyEnv() {
  process.env.LOOKUP_MODE = 'legacy-live';
  process.env.REQUEST_TIMEOUT_MS = '2000';
  process.env.UPSTREAM_COOLDOWN_SECONDS = '60';
  process.env.TIKTOK_LEGACY_BASE_URL = 'https://api2.musical.ly/';
  process.env.TIKTOK_SIGNER_URL = 'https://signer.example/sign';
  process.env.TIKTOK_SIGNER_TOKEN = 'test-token';
  process.env.TIKTOK_DEVICE_ID = '1234567890123456789';
  process.env.TIKTOK_FP = 'test-fingerprint';
  process.env.TIKTOK_IID = '1234567890123456';
  process.env.TIKTOK_OPENUDID = 'abcdef0123456789';
  delete process.env.TIKTOK_COOKIE;
  resetEnvForTests();
  resetLegacyCooldownForTests();
}

function signerResponse(init?: RequestInit): Response {
  const body = JSON.parse(String(init?.body)) as { url: string };
  return new Response(
    JSON.stringify({ signedUrl: `${body.url}&as=test-as&cp=test-cp&mas=test-mas` }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  );
}

describe('LegacyTikTokClient', () => {
  beforeEach(() => configureLegacyEnv());
  afterEach(() => vi.unstubAllGlobals());

  it('preserves unquoted 19-digit JSON integers as strings', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: URL | RequestInfo, init?: RequestInit) => {
        if (String(input) === 'https://signer.example/sign') return signerResponse(init);
        return new Response('{"status_code":0,"aweme_detail":{"aweme_id":7399999999999999991}}', {
          status: 200,
        });
      }),
    );

    const response = await new LegacyTikTokClient().get('/aweme/v1/aweme/detail/', {
      aweme_id: '7399999999999999991',
    });
    expect(response.data).toEqual({
      status_code: 0,
      aweme_detail: { aweme_id: '7399999999999999991' },
    });
  });

  it('preserves the connected repository’s unencoded legacy query shape', async () => {
    let unsignedUrl = '';
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: URL | RequestInfo, init?: RequestInit) => {
        if (String(input) === 'https://signer.example/sign') {
          const body = JSON.parse(String(init?.body)) as { url: string };
          unsignedUrl = body.url;
          return signerResponse(init);
        }
        return new Response('{"status_code":0}', { status: 200 });
      }),
    );

    await new LegacyTikTokClient().get('/aweme/v1/aweme/detail/', {
      aweme_id: '7399999999999999991',
    });

    expect(unsignedUrl).toContain('timezone_name=Australia/Brisbane');
    expect(unsignedUrl).not.toContain('Australia%2FBrisbane');
    expect(unsignedUrl.indexOf('app_language=')).toBeLessThan(unsignedUrl.indexOf('aweme_id='));
    expect(unsignedUrl.indexOf('aweme_id=')).toBeLessThan(unsignedUrl.indexOf('_rticket='));
  });

  it('rejects HTTP 200 with an empty body', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: URL | RequestInfo, init?: RequestInit) =>
        String(input) === 'https://signer.example/sign'
          ? signerResponse(init)
          : new Response('', { status: 200 }),
      ),
    );

    await expect(
      new LegacyTikTokClient().get('/aweme/v1/aweme/detail/', {
        aweme_id: '7399999999999999991',
      }),
    ).rejects.toMatchObject({ code: 'upstream_malformed' });
  });

  it('rejects HTTP 200 with malformed JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: URL | RequestInfo, init?: RequestInit) =>
        String(input) === 'https://signer.example/sign'
          ? signerResponse(init)
          : new Response('{not-json', { status: 200 }),
      ),
    );

    await expect(
      new LegacyTikTokClient().get('/aweme/v1/aweme/detail/', {
        aweme_id: '7399999999999999991',
      }),
    ).rejects.toMatchObject({ code: 'upstream_malformed' });
  });

  it('enters cooldown after HTTP 403 and stops before another network request', async () => {
    const fetchMock = vi.fn(async (input: URL | RequestInfo, init?: RequestInit) =>
      String(input) === 'https://signer.example/sign'
        ? signerResponse(init)
        : new Response('forbidden', { status: 403 }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const client = new LegacyTikTokClient();

    await expect(
      client.get('/aweme/v1/aweme/detail/', { aweme_id: '7399999999999999991' }),
    ).rejects.toMatchObject({ code: 'upstream_auth' });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await expect(
      client.get('/aweme/v1/aweme/detail/', { aweme_id: '7399999999999999991' }),
    ).rejects.toMatchObject({ code: 'upstream_rate_limited' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('enters cooldown after HTTP 429', async () => {
    const fetchMock = vi.fn(async (input: URL | RequestInfo, init?: RequestInit) =>
      String(input) === 'https://signer.example/sign'
        ? signerResponse(init)
        : new Response('rate limited', { status: 429 }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const client = new LegacyTikTokClient();

    await expect(
      client.get('/aweme/v1/aweme/detail/', { aweme_id: '7399999999999999991' }),
    ).rejects.toMatchObject({ code: 'upstream_rate_limited' });
    await expect(
      client.get('/aweme/v1/aweme/detail/', { aweme_id: '7399999999999999991' }),
    ).rejects.toMatchObject({ code: 'upstream_rate_limited' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('rejects a signer response that changes the target host', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ signedUrl: 'https://evil.example/aweme/v1/aweme/detail/?aweme_id=1' }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      new LegacyTikTokClient().get('/aweme/v1/aweme/detail/', {
        aweme_id: '7399999999999999991',
      }),
    ).rejects.toMatchObject({ code: 'upstream_auth' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('rejects a signer response that duplicates a required target parameter', async () => {
    const fetchMock = vi.fn(async (_input: URL | RequestInfo, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { url: string };
      return new Response(
        JSON.stringify({
          signedUrl: `${body.url}&aweme_id=7399999999999999998&as=test-as&cp=test-cp&mas=test-mas`,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      new LegacyTikTokClient().get('/aweme/v1/aweme/detail/', {
        aweme_id: '7399999999999999991',
      }),
    ).rejects.toMatchObject({ code: 'upstream_auth' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
