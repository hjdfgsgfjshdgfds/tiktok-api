export const MOCK_IDS = {
  profile: '6800000000000000001',
  privateProfile: '6800000000000000002',
  partialProfile: '6800000000000000003',
  post: '7399999999999999991',
  targetMissingPost: '7399999999999999992',
  malformedPost: '7399999999999999993',
  forbiddenPost: '7399999999999999994',
  rateLimitedPost: '7399999999999999995',
  timeoutPost: '7399999999999999996',
  partialPost: '7399999999999999997',
  wrongPost: '7399999999999999998'
} as const;

interface MockProfileOptions {
  username: string;
  uid: string;
  privateAccount?: boolean;
  partial?: boolean;
}

export function createMockUser(options: MockProfileOptions): Record<string, unknown> {
  const nickname = options.username
    .split(/[._]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

  const base: Record<string, unknown> = {
    avatar_larger: { url_list: ['/mock-avatar.svg'] },
    avatar_medium: { url_list: ['/mock-avatar.svg'] },
    avatar_thumb: { url_list: ['/mock-avatar.svg'] },
    aweme_count: 128,
    create_time: 1546300800,
    custom_verify: 'Mock creator',
    favoriting_count: 421,
    follow_status: 0,
    follower_count: 184200,
    follower_status: 0,
    following_count: 312,
    ins_id: '',
    is_verified: options.username === 'example',
    nickname: nickname || 'Example Creator',
    region: 'US',
    room_id: '0',
    secret: options.privateAccount ? 1 : 0,
    signature: options.privateAccount
      ? 'This sanitized fixture represents a private profile.'
      : 'A safe mock profile for testing Aweme Lens.',
    total_favorited: 3900000,
    twitter_id: '',
    uid: options.uid,
    unique_id: options.username,
    verification_type: options.username === 'example' ? 1 : 0,
    youtube_channel_id: ''
  };

  if (options.partial) {
    delete base.avatar_larger;
    delete base.follower_count;
    delete base.following_count;
    delete base.total_favorited;
    delete base.signature;
  }

  return base;
}

export function createMockPost(
  awemeId: string,
  options: { partial?: boolean; authorUid?: string; authorUsername?: string } = {},
): Record<string, unknown> {
  const authorUid = options.authorUid ?? MOCK_IDS.profile;
  const authorUsername = options.authorUsername ?? 'example';
  const author = createMockUser({ username: authorUsername, uid: authorUid });

  const post: Record<string, unknown> = {
    author,
    author_user_id: authorUid,
    aweme_id: awemeId,
    aweme_type: 0,
    create_time: 1719837296,
    desc: 'A sanitized mock post used to exercise exact-target validation and provenance.',
    music: {
      author: 'Mock Artist',
      cover_hd: { url_list: ['/mock-cover.svg'] },
      cover_large: { url_list: ['/mock-cover.svg'] },
      cover_medium: { url_list: ['/mock-cover.svg'] },
      cover_thumb: { url_list: ['/mock-cover.svg'] },
      duration: 18,
      id: '7100000000000000001',
      owner_handle: 'mockartist',
      owner_id: '6800000000000000099',
      owner_nickname: 'Mock Artist',
      play_url: {
        url_list: [
          'https://v16.tiktokcdn.com/audio/mock.mp3?auth_key=fake-secret&device_id=123456789'
        ]
      },
      title: 'Fixture Signal',
      user_count: 1200
    },
    prevent_download: false,
    rate: 12,
    region: 'GB',
    risk_infos: {
      content: '',
      risk_sink: false,
      type: 0,
      warn: false
    },
    share_info: {
      share_title: 'Mock post',
      share_url: `https://www.tiktok.com/@${authorUsername}/video/${awemeId}?_signature=fake`
    },
    share_url: `https://www.tiktok.com/@${authorUsername}/video/${awemeId}`,
    statistics: {
      aweme_id: awemeId,
      comment_count: 386,
      digg_count: 42900,
      forward_count: 7,
      play_count: 521000,
      share_count: 2300
    },
    status: {
      allow_comment: true,
      allow_share: true,
      download_status: 0,
      in_reviewing: false,
      is_delete: false,
      is_private: false,
      is_prohibited: false,
      private_status: 0,
      reviewed: 1
    },
    text_extra: [{ hashtag_name: 'mockdata', type: 1 }],
    user_digged: 0,
    video: {
      cover: { url_list: ['/mock-cover.svg'] },
      download_addr: {
        url_list: [
          `https://v16.tiktokcdn.com/video/${awemeId}.mp4?auth_key=fake-secret&msToken=fake-token`
        ]
      },
      duration: 18400,
      has_watermark: true,
      height: 1280,
      origin_cover: { url_list: ['/mock-cover.svg'] },
      ratio: '720p',
      width: 720
    }
  };

  if (options.partial) {
    delete post.music;
    delete post.statistics;
    delete post.video;
    post.desc = '';
  }

  return post;
}

export const MOCK_PROFILE_FIXTURES = {
  example: createMockUser({ username: 'example', uid: MOCK_IDS.profile }),
  private: createMockUser({
    username: 'private',
    uid: MOCK_IDS.privateProfile,
    privateAccount: true
  }),
  partial: createMockUser({
    username: 'partial',
    uid: MOCK_IDS.partialProfile,
    partial: true
  })
} as const;
