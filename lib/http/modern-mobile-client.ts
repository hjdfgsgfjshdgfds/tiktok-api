import 'server-only';

import JSONBigFactory from 'json-bigint';
import { randomBytes, randomInt } from 'node:crypto';

import { getServerEnv } from '@/lib/env';
import { LookupError } from '@/lib/errors';
import { boundedFetch, type BoundedResponse } from '@/lib/http/request';
import { isRecord } from '@/lib/utils';

const JSONBig = JSONBigFactory({ storeAsString: true, strict: true });
const FEED_ORIGIN = 'https://api16-normal-useast5.tiktokv.us';
const PROFILE_ORIGIN = 'https://api16-normal-c-useast1a.tiktokv.com';
const MOBILE_USER_AGENT =
  'com.zhiliaoapp.musically/35.1.3 (Linux; U; Android 13; en_US; Pixel 7; Build/TD1A.220804.031; Cronet/58.0.2991.0)';

function decimalId(length = 19): string {
  let value = String(randomInt(1, 10));
  while (value.length < length) value += String(randomInt(0, 10));
  return value;
}

function hex(length: number): string {
  return randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
}

function baseParams(region: string): URLSearchParams {
  const now = Date.now();
  const timezone = region === 'NO' ? 'Europe/Oslo' : 'America/New_York';
  const timezoneOffset = region === 'NO' ? '7200' : '-14400';
  const mccMnc = region === 'NO' ? '24201' : '310260';

  return new URLSearchParams({
    version_name: '1.1.9',
    version_code: '2018111632',
    build_number: '1.1.9',
    device_id: decimalId(),
    iid: decimalId(),
    manifest_version_code: '2018111632',
    update_version_code: '2018111632',
    openudid: hex(16),
    uuid: decimalId(16),
    _rticket: String(now * 1000),
    ts: String(now),
    device_brand: 'Google',
    device_type: 'Pixel 4',
    device_platform: 'android',
    resolution: '1080*1920',
    dpi: '420',
    os_version: '10',
    os_api: '29',
    carrier_region: region,
    sys_region: region,
    region,
    timezone_name: timezone,
    timezone_offset: timezoneOffset,
    channel: 'googleplay',
    ac: 'wifi',
    mcc_mnc: mccMnc,
    is_my_cn: '0',
    ssmix: 'a',
    as: 'a1qwert123',
    cp: 'cbfhckdckkde1',
  });
}

function parseJson(response: BoundedResponse): Record<string, unknown> {
  try {
    const parsed = JSONBig.parse(response.text) as unknown;
    if (!isRecord(parsed)) {
      throw new LookupError('upstream_malformed', 'TikTok mobile response was not a JSON object.');
    }
    return parsed;
  } catch (error) {
    if (error instanceof LookupError) throw error;
    throw new LookupError('upstream_malformed', 'TikTok mobile response contained malformed JSON.', {
      cause: error,
    });
  }
}

export interface MobileJsonResponse {
  response: BoundedResponse;
  data: Record<string, unknown>;
}

export class ModernMobileClient {
  async fetchAwemeFeed(awemeId: string, signal?: AbortSignal): Promise<MobileJsonResponse> {
    const env = getServerEnv();
    const params = baseParams(env.publicLive.region);
    params.set('aweme_id', awemeId);
    const response = await boundedFetch(
      `${FEED_ORIGIN}/aweme/v1/feed/?${params.toString()}`,
      {
        method: 'OPTIONS',
        headers: {
          accept: 'application/json, text/plain, */*',
          'accept-encoding': 'gzip, deflate, br',
          'user-agent': MOBILE_USER_AGENT,
        },
      },
      {
        signal,
        timeoutMs: env.requestTimeoutMs,
        expectedContent: 'json',
        maxBytes: env.publicLive.maxJsonBytes,
      },
    );
    return { response, data: parseJson(response) };
  }

  async fetchProfileByUserId(userId: string, signal?: AbortSignal): Promise<MobileJsonResponse> {
    const env = getServerEnv();
    const params = baseParams(env.publicLive.region);
    params.set('user_id', userId);
    const response = await boundedFetch(
      `${PROFILE_ORIGIN}/tiktok/user/profile/other/v1?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          accept: 'application/json, text/plain, */*',
          'accept-encoding': 'gzip, deflate, br',
          'user-agent': MOBILE_USER_AGENT,
        },
      },
      {
        signal,
        timeoutMs: env.requestTimeoutMs,
        expectedContent: 'json',
        maxBytes: env.publicLive.maxJsonBytes,
      },
    );
    return { response, data: parseJson(response) };
  }
}
