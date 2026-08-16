import 'server-only';

import { getServerEnv } from '@/lib/env';
import { LookupError } from '@/lib/errors';
import { boundedFetch, type BoundedResponse } from '@/lib/http/request';

const TIKTOK_HOSTS = ['www.tiktok.com', 'tiktok.com', 'm.tiktok.com'] as const;

function pageHeaders(userAgent: string, referer = 'https://www.tiktok.com/'): HeadersInit {
  return {
    accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'accept-language': 'en-US,en;q=0.9',
    'cache-control': 'no-cache',
    pragma: 'no-cache',
    referer,
    'sec-fetch-dest': 'document',
    'sec-fetch-mode': 'navigate',
    'sec-fetch-site': 'same-origin',
    'upgrade-insecure-requests': '1',
    'user-agent': userAgent,
  };
}

export class PublicWebClient {
  async fetchProfilePage(username: string, signal?: AbortSignal): Promise<BoundedResponse> {
    const env = getServerEnv();
    return boundedFetch(
      `https://www.tiktok.com/@${encodeURIComponent(username)}`,
      { method: 'GET', headers: pageHeaders(env.publicLive.userAgent) },
      {
        signal,
        timeoutMs: env.requestTimeoutMs,
        maxBytes: env.publicLive.maxHtmlBytes,
        expectedContent: 'html',
        redirect: 'follow',
        allowedFinalHosts: TIKTOK_HOSTS,
      },
    );
  }

  async fetchPostPage(
    canonicalUrl: string,
    expectedUsername?: string,
    signal?: AbortSignal,
  ): Promise<BoundedResponse> {
    const env = getServerEnv();
    let url: URL;
    try {
      url = new URL(canonicalUrl);
    } catch {
      throw new LookupError('invalid_input', 'The normalized TikTok post URL is invalid.');
    }
    if (url.protocol !== 'https:' || url.hostname !== 'www.tiktok.com') {
      throw new LookupError('unsupported_input', 'Only canonical TikTok post URLs are allowed.');
    }
    const profileReferer = expectedUsername
      ? `https://www.tiktok.com/@${encodeURIComponent(expectedUsername)}`
      : 'https://www.tiktok.com/';
    return boundedFetch(
      url.toString(),
      { method: 'GET', headers: pageHeaders(env.publicLive.userAgent, profileReferer) },
      {
        signal,
        timeoutMs: env.requestTimeoutMs,
        maxBytes: env.publicLive.maxHtmlBytes,
        expectedContent: 'html',
        redirect: 'follow',
        allowedFinalHosts: TIKTOK_HOSTS,
      },
    );
  }
}
