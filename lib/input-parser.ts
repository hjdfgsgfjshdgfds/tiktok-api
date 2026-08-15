import { LookupError } from '@/lib/errors';
import type { ParsedInput } from '@/lib/types';

const TIKTOK_HOSTS = new Set([
  'tiktok.com',
  'www.tiktok.com',
  'm.tiktok.com',
  'vm.tiktok.com',
  'vt.tiktok.com'
]);

const USERNAME_PATTERN = /^[A-Za-z0-9._]{2,32}$/;
const NUMERIC_ID_PATTERN = /^\d{5,30}$/;
const COMMAND_LIKE_PATTERN = /[;&|`$<>\\\u0000-\u001f\u007f]/;

function normalizeUsername(value: string): string {
  const username = value.replace(/^@/, '').trim();
  if (!USERNAME_PATTERN.test(username)) {
    throw new LookupError(
      'invalid_input',
      'Use a TikTok username containing only letters, numbers, periods, or underscores.',
    );
  }
  return username.toLowerCase();
}

function normalizeNumericId(value: string): string {
  const normalized = value.trim();
  if (!NUMERIC_ID_PATTERN.test(normalized)) {
    throw new LookupError('invalid_input', 'TikTok IDs must contain digits only.');
  }
  return normalized;
}

function parseTikTokUrl(raw: string): ParsedInput {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new LookupError('invalid_input', 'The supplied URL is malformed.');
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new LookupError('unsupported_input', 'Only HTTP or HTTPS TikTok URLs are supported.');
  }

  if (url.username || url.password) {
    throw new LookupError('invalid_input', 'TikTok URLs must not contain embedded credentials.');
  }

  const hostname = url.hostname.toLowerCase();
  if (!TIKTOK_HOSTS.has(hostname)) {
    throw new LookupError('unsupported_input', 'Only recognized TikTok domains are supported.');
  }

  if (hostname === 'vm.tiktok.com' || hostname === 'vt.tiktok.com') {
    throw new LookupError(
      'unsupported_input',
      'Short TikTok links are not followed server-side. Paste the final profile or video URL instead.',
    );
  }

  let pathname: string;
  try {
    pathname = decodeURIComponent(url.pathname).replace(/\/+$/, '');
  } catch {
    throw new LookupError('invalid_input', 'The TikTok URL contains malformed escape sequences.');
  }
  const videoMatch = pathname.match(/^\/@([A-Za-z0-9._]{2,32})\/video\/(\d{5,30})$/i);
  if (videoMatch) {
    const username = normalizeUsername(videoMatch[1]);
    const awemeId = normalizeNumericId(videoMatch[2]);
    const canonicalUrl = `https://www.tiktok.com/@${username}/video/${awemeId}`;
    return {
      original: raw,
      type: 'video_url',
      value: canonicalUrl,
      username,
      awemeId,
      canonicalUrl
    };
  }

  const legacyVideoMatch = pathname.match(/^\/v\/(\d{5,30})(?:\.html)?$/i);
  if (legacyVideoMatch) {
    const awemeId = normalizeNumericId(legacyVideoMatch[1]);
    const canonicalUrl = `https://www.tiktok.com/v/${awemeId}.html`;
    return {
      original: raw,
      type: 'video_url',
      value: canonicalUrl,
      awemeId,
      canonicalUrl
    };
  }

  const profileMatch = pathname.match(/^\/@([A-Za-z0-9._]{2,32})$/i);
  if (profileMatch) {
    const username = normalizeUsername(profileMatch[1]);
    return {
      original: raw,
      type: 'username',
      value: username,
      username,
      canonicalUrl: `https://www.tiktok.com/@${username}`
    };
  }

  throw new LookupError(
    'unsupported_input',
    'The TikTok URL is not a supported profile or direct video URL.',
  );
}

export function parseLookupInput(rawInput: string): ParsedInput {
  const input = rawInput.trim();

  if (!input) {
    throw new LookupError('invalid_input', 'Enter a TikTok username, ID, profile URL, or video URL.');
  }

  if (input.length > 500) {
    throw new LookupError('invalid_input', 'The lookup value is unreasonably long.');
  }

  if (COMMAND_LIKE_PATTERN.test(input)) {
    throw new LookupError('invalid_input', 'The lookup value contains unsupported control characters.');
  }

  if (/^(?:javascript|data|file|command|shell):/i.test(input)) {
    throw new LookupError('unsupported_input', 'Command-like or executable input is not supported.');
  }

  if (/^https?:\/\//i.test(input)) {
    return parseTikTokUrl(input);
  }

  const explicitUserId = input.match(/^user:(\d{5,30})$/i);
  if (explicitUserId) {
    const userId = normalizeNumericId(explicitUserId[1]);
    return { original: rawInput, type: 'user_id', value: userId, userId };
  }

  const explicitAwemeId = input.match(/^aweme:(\d{5,30})$/i);
  if (explicitAwemeId) {
    const awemeId = normalizeNumericId(explicitAwemeId[1]);
    return { original: rawInput, type: 'aweme_id', value: awemeId, awemeId };
  }

  if (NUMERIC_ID_PATTERN.test(input)) {
    const id = normalizeNumericId(input);
    if (id.length >= 19) {
      return {
        original: rawInput,
        type: 'aweme_id',
        value: id,
        awemeId: id,
        numericAmbiguous: true
      };
    }
    return {
      original: rawInput,
      type: 'user_id',
      value: id,
      userId: id,
      numericAmbiguous: true
    };
  }

  const username = normalizeUsername(input);
  return { original: rawInput, type: 'username', value: username, username };
}
