import { describe, expect, it } from 'vitest';
import { createMockPost, createMockUser, MOCK_IDS } from '@/lib/mock/fixtures';
import { normalizePost } from '@/lib/normalize/post';
import { normalizeProfile } from '@/lib/normalize/profile';

const retrievedAt = '2026-08-15T12:00:00.000Z';

describe('normalization provenance', () => {
  it('records the avatar variant that actually supplied the primary image', () => {
    const user = createMockUser({ username: 'example', uid: MOCK_IDS.profile });
    delete user.avatar_larger;

    const normalized = normalizeProfile({
      user,
      rootPath: 'user',
      sourceEndpoint: 'GET mock.local/aweme/v1/user/',
      retrievedAt,
    });

    expect(normalized.data.avatar).toBe('/mock-avatar.svg');
    expect(normalized.fields.find((field) => field.label === 'Avatar')?.upstreamPath).toBe(
      'user.avatar_medium.url_list[0]',
    );
  });

  it('records origin_cover when the normal cover is unavailable', () => {
    const post = createMockPost(MOCK_IDS.post);
    const video = post.video as Record<string, unknown>;
    delete video.cover;

    const normalized = normalizePost({
      post,
      rootPath: 'aweme_detail',
      sourceEndpoint: 'GET mock.local/aweme/v1/aweme/detail/',
      retrievedAt,
    });

    expect(normalized.data.cover).toBe('/mock-cover.svg');
    expect(normalized.fields.find((field) => field.label === 'Cover image')?.upstreamPath).toBe(
      'aweme_detail.video.origin_cover.url_list[0]',
    );
  });

  it('does not expose playback URLs when download permission is indeterminate', () => {
    const post = createMockPost(MOCK_IDS.post);
    delete post.prevent_download;
    const status = post.status as Record<string, unknown>;
    delete status.download_status;

    const normalized = normalizePost({
      post,
      rootPath: 'aweme_detail',
      sourceEndpoint: 'GET mock.local/aweme/v1/aweme/detail/',
      retrievedAt,
    });

    expect(normalized.data.downloadAllowed).toBeUndefined();
    expect(normalized.data.playbackUrls).toBeUndefined();
  });
});
