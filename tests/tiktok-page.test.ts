import { describe, expect, it } from 'vitest';
import {
  extractTikTokPageData,
  findPagePost,
  findPageProfile,
} from '@/lib/html/tiktok-page';

function page(payload: unknown): string {
  return `<html><body><script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application/json">${JSON.stringify(payload)}</script></body></html>`;
}

describe('TikTok page rehydration parsing', () => {
  it('finds an exact profile and preserves its permanent ID as a string', () => {
    const parsed = extractTikTokPageData(
      page({
        __DEFAULT_SCOPE__: {
          'webapp.user-detail': {
            userInfo: {
              user: {
                id: '107955',
                secUid: 'MS4wLjABAAAA-test',
                uniqueId: 'tiktok',
                nickname: 'TikTok',
              },
              stats: { followerCount: 123 },
            },
          },
        },
      }),
    );
    const result = findPageProfile(parsed, 'tiktok');
    expect(result.user.id).toBe('107955');
    expect(result.stats?.followerCount).toBe(123);
  });

  it('rejects a profile page that contains only a different username', () => {
    const parsed = extractTikTokPageData(
      page({
        __DEFAULT_SCOPE__: {
          'webapp.user-detail': {
            userInfo: {
              user: { id: '1', uniqueId: 'different', nickname: 'Different' },
            },
          },
        },
      }),
    );
    expect(() => findPageProfile(parsed, 'tiktok')).toThrow(/exact requested username/i);
  });

  it('finds the exact post rather than the first unrelated item', () => {
    const parsed = extractTikTokPageData(
      page({
        ItemModule: {
          '7399999999999999990': { id: '7399999999999999990', author: { id: '1' } },
          '7399999999999999991': { id: '7399999999999999991', author: { id: '2' } },
        },
      }),
    );
    expect(findPagePost(parsed, '7399999999999999991').post.id).toBe(
      '7399999999999999991',
    );
  });
});
